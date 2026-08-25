import random
from datetime import date, datetime, timedelta

from sqlalchemy import func

from ..config import DEMO_PASSWORD, HISTORY_DAYS, SEED_USERS, WEEKLY_PREDICTION_WEEKS
from ..database import Base, SessionLocal
from ..models import (Alert, AuditLog, ConsentPreferences, DeploymentRecord, DutyRecord,
                      Intervention, LeaveRecord, Notification, Report, RiskFactor,
                      RiskPrediction, Role, Unit, User, WelfareRecommendation,
                      WellbeingAssessment)
from ..security import hash_password
from .synthetic_data import UNITS, DEMO_PERSONNEL_ID, build_history, generate_personnel, week_payload
from .templates import REC_FALLBACK, REC_TEMPLATES, REPEAT_REC


def seed(force: bool = False) -> bool:
    db = SessionLocal()
    try:
        if db.query(func.count(User.id)).scalar() and not force:
            return False
        if force:
            for table in reversed(Base.metadata.sorted_tables):
                db.execute(table.delete())
            db.commit()

        random.seed(42)
        from ..ml import get_engine
        today = date.today()
        now = datetime.utcnow()
        pw_hash, salt = hash_password(DEMO_PASSWORD)

        # ---- roles & units ----
        db.add_all([
            Role(name="personnel", description="Personal dashboard, own assessments and predictions"),
            Role(name="welfare_officer", description="Aggregated analytics, alerts, interventions, reports"),
            Role(name="administrator", description="System analytics, user management, audit logs"),
        ])
        units = [Unit(name=n, code=c, location=l) for n, c, l in UNITS]
        db.add_all(units)
        db.flush()

        def mk(pid, name, role, unit, designation, joined):
            return User(personnel_id=pid, password_hash=pw_hash, salt=salt, full_name=name,
                        role=role, unit=unit, designation=designation, joining_date=joined,
                        email=f"{pid.lower()}@demo.example",
                        phone=f"+91 9000{random.randint(100000, 999999)}")

        admin = mk("ADMIN-01", "Vikram Desai", "administrator", None, "System Administrator", date(2016, 3, 14))
        chief = mk("WELFARE-01", "Meera Krishnan", "welfare_officer", units[0], "Chief Welfare Officer", date(2017, 8, 2))
        officers = [chief]
        officer_names = ["Arjun Mehta", "Priya Nair", "Rohan Iyer", "Kavya Reddy", "Sanjay Gupta"]
        for idx, nm in enumerate(officer_names):
            officers.append(mk(f"WELFARE-{idx + 2:02d}", nm, "welfare_officer", units[idx],
                               "Welfare Officer", date(2018 + idx % 3, 1 + idx, 15)))

        demo = mk(DEMO_PERSONNEL_ID, "Aarav Sharma", "personnel", units[0],
                  "Field Operations Officer", date(2019, 6, 17))
        db.add_all([admin, demo] + officers)

        people = [dict(p) for p in generate_personnel(SEED_USERS - 1, units)]
        for p in people:
            u = mk(p["personnel_id"], p["full_name"], "personnel", p["unit"], p["designation"],
                   date(p["joining_year"], random.randint(1, 12), random.randint(1, 28)))
            p["_user"] = u
        db.add_all(p["_user"] for p in people)
        db.commit()

        id_to_person = {p["_user"].id: p for p in people}
        demo_profile = {"personnel_id": DEMO_PERSONNEL_ID,
                        "baseline": {"wl": 2.9, "ft": 2.6, "slp": 3.1, "sat": 3.3,
                                     "duty": 9.3, "ot": 0.45, "trend": 0.0}}
        db.commit()

        for u in units:
            u.strength = db.query(func.count(User.id)).filter(
                User.unit_id == u.id, User.role == "personnel").scalar()
        db.commit()

        # ---- daily assessments (bulk) ----
        engine = get_engine()
        all_rows: list[dict] = []
        history_by_user: dict[int, dict[int, dict]] = {}
        profiles = [(demo, demo_profile["personnel_id"] == DEMO_PERSONNEL_ID)] + \
                   [(p["_user"], False) for p in people]
        profile_map = {demo.id: demo_profile} | {p["_user"].id: p for p in people}

        for user, is_demo in profiles:
            prof = profile_map[user.id]
            rows = build_history(prof, user.id, today, HISTORY_DAYS, is_demo=is_demo)
            history_by_user[user.id] = rows
            all_rows.extend(rows.values())
        for i in range(0, len(all_rows), 5000):
            db.execute(WellbeingAssessment.__table__.insert(), all_rows[i:i + 5000])
        db.commit()

        # ---- weekly predictions + factors + recommendations ----
        payloads, meta = [], []
        weeks = WEEKLY_PREDICTION_WEEKS
        window = HISTORY_DAYS // weeks
        for uid, rows in history_by_user.items():
            for w in range(weeks):
                lo, hi = max(HISTORY_DAYS - (w + 1) * window, 0), HISTORY_DAYS - 1 - w * window
                block = [rows[t] for t in range(lo, hi + 1)]
                if not block:
                    continue
                payloads.append(week_payload(block))
                meta.append((uid, datetime.combine(today - timedelta(days=w * window), datetime.min.time())))

        results = engine.predict_batch(payloads)
        pred_rows = [{"user_id": uid, "created_at": ts, "risk_level": r["risk_level"],
                      "risk_score": r["risk_score"], "confidence": r["confidence"],
                      "model_version": "rf-prototype-1.0", "input_json": payloads[i],
                      "explanation": r["explanation"], "recommendations": r["recommendations"],
                      "status": "completed"} for i, (r, (uid, ts)) in enumerate(zip(results, meta))]
        for i in range(0, len(pred_rows), 2000):
            db.execute(RiskPrediction.__table__.insert(), pred_rows[i:i + 2000])
        db.commit()

        id_map = {(pr.user_id, pr.created_at): pr.id
                  for pr in db.query(RiskPrediction.id, RiskPrediction.user_id, RiskPrediction.created_at).all()}
        factor_rows, rec_rows = [], []
        for i, (r, (uid, ts)) in enumerate(zip(results, meta)):
            pid_ = id_map.get((uid, ts))
            if not pid_:
                continue
            for f in r["top_factors"]:
                factor_rows.append({"prediction_id": pid_, "name": f["name"], "impact": f["impact"],
                                    "direction": f["direction"], "description": f["description"]})
            if r["risk_level"] == "Low":
                continue
            for prio, fname in enumerate([f["name"] for f in r["top_factors"]], start=1):
                title, reason, timeframe = REC_TEMPLATES.get(fname, REC_FALLBACK)
                rec_rows.append({"user_id": uid, "prediction_id": pid_, "priority": prio,
                                 "title": title, "reason": reason, "timeframe": timeframe,
                                 "status": "pending", "created_at": ts})
            rec_rows.append({"user_id": uid, "prediction_id": pid_, "priority": 4,
                             **REPEAT_REC, "status": "pending", "created_at": ts})
        db.execute(RiskFactor.__table__.insert(), factor_rows)
        for i in range(0, len(rec_rows), 2000):
            db.execute(WelfareRecommendation.__table__.insert(), rec_rows[i:i + 2000])
        db.commit()

        # ---- early-warning alerts ----
        latest_by_user: dict[int, tuple] = {}
        for i, (r, (uid, ts)) in enumerate(zip(results, meta)):
            cur = latest_by_user.get(uid)
            if cur is None or ts > cur[1]:
                latest_by_user[uid] = (r, ts, payloads[i])

        alerts, seq = [], 1
        severities = ["moderate", "low", "high"]
        titles = {"moderate": "Rising workload trend detected",
                  "low": "Minor fluctuation in wellbeing indicators",
                  "high": "Sustained elevated fatigue pattern"}
        for ui, unit in enumerate(units):
            alerts.append(Alert(code=f"EW-{seq:04d}", scope="unit", unit_id=unit.id, subject_user_id=None,
                                title=f"{titles[severities[ui % 3]]} — {unit.name}",
                                severity=severities[ui % 3],
                                detected_at=now - timedelta(hours=random.randint(2, 40)),
                                factors=["Increased workload", "Increased duty hours", "Reduced rest quality"],
                                recommendation="Review workload distribution and consider additional rest/support.",
                                status="open"))
            seq += 1

        flagged = sorted(((uid, v) for uid, v in latest_by_user.items() if v[0]["risk_level"] == "High"),
                         key=lambda kv: -kv[1][0]["risk_score"])[:6]
        for uid, (r, _ts, _pl) in flagged:
            person = id_to_person.get(uid)
            label = person["personnel_id"] if person else "CPF-####"
            alerts.append(Alert(code=f"EW-{seq:04d}", scope="individual",
                                unit_id=person["unit"].id if person else None,
                                subject_user_id=uid,
                                title=f"Elevated welfare-support need detected — {label}",
                                severity="high", detected_at=now - timedelta(hours=random.randint(1, 24)),
                                factors=[f["name"] for f in r["top_factors"]],
                                recommendation="Assign welfare officer for supportive human review.",
                                status="open"))
            seq += 1

        dl = latest_by_user[demo.id]
        alerts.append(Alert(code=f"EW-{seq:04d}", scope="individual", unit_id=units[0].id,
                            subject_user_id=demo.id,
                            title=f"Rising workload & fatigue trend — {DEMO_PERSONNEL_ID}",
                            severity="moderate", detected_at=now - timedelta(hours=3),
                            factors=[f["name"] for f in dl[0]["top_factors"]],
                            recommendation="Review workload distribution and offer optional welfare consultation.",
                            status="open"))
        seq += 1
        db.add_all(alerts)
        db.commit()

        # ---- interventions ----
        statuses = ["pending", "in_review", "support_offered", "completed"]
        actions = ["Review workload distribution", "Schedule protected rest period",
                   "Offer optional confidential welfare consultation", "Adjust duty roster for recovery window",
                   "Follow-up wellbeing assessment", "Unit-level workload rebalancing"]
        ivs = []
        for ai_, a in enumerate(alerts):
            ivs.append(Intervention(alert_id=a.id, subject_user_id=a.subject_user_id, unit_id=a.unit_id,
                                    subject_label=(id_to_person[a.subject_user_id]["personnel_id"]
                                                   if a.subject_user_id in id_to_person
                                                   else next((u.name for u in units if u.id == a.unit_id), "—")),
                                    risk_level=a.severity.capitalize(),
                                    action=a.recommendation if a.scope == "individual" else actions[ai_ % len(actions)],
                                    assigned_officer_id=officers[ai_ % len(officers)].id,
                                    officer_name=officers[ai_ % len(officers)].full_name,
                                    created_at=a.detected_at,
                                    due_date=today + timedelta(days=random.randint(2, 12)),
                                    status=statuses[(ai_ * 3) % 4], notes=""))
        while len(ivs) < 40:
            k = len(ivs)
            p = random.choice(people)
            off = random.choice(officers)
            ivs.append(Intervention(subject_user_id=None, unit_id=p["unit"].id, alert_id=None,
                                    subject_label=p["unit"].name,
                                    risk_level=random.choice(["Low", "Moderate"]),
                                    action=actions[k % len(actions)],
                                    assigned_officer_id=off.id, officer_name=off.full_name,
                                    created_at=now - timedelta(days=random.randint(1, 25)),
                                    due_date=today + timedelta(days=random.randint(-5, 10)),
                                    status=statuses[k % 4], notes=""))
        db.add_all(ivs)

        # ---- notifications ----
        db.add_all([
            Notification(user_id=demo.id, category="welfare_reminder", title="Weekly wellbeing check-in due",
                         body="Your weekly wellbeing check-in is due. It takes less than two minutes.",
                         read=False, created_at=now - timedelta(hours=2)),
            Notification(user_id=demo.id, category="trend_alert", title="Workload indicator increased",
                         body="Your workload indicator has increased over the past two weeks. Early attention can help.",
                         read=False, created_at=now - timedelta(hours=6)),
            Notification(user_id=demo.id, category="support_available", title="Confidential welfare consultation available",
                         body="A confidential welfare consultation is available if you would like to talk things through.",
                         read=False, created_at=now - timedelta(days=1)),
            Notification(user_id=demo.id, category="system", title="New welfare recommendations",
                         body="Fresh personalized welfare recommendations are ready based on your latest assessment.",
                         read=True, created_at=now - timedelta(days=2)),
            Notification(user_id=demo.id, category="system", title="Monthly welfare overview published",
                         body="The monthly welfare overview report is available in the Reports section.",
                         read=True, created_at=now - timedelta(days=4)),
            Notification(user_id=chief.id, category="trend_alert", title="New moderate-severity alert",
                         body="An aggregated alert requires welfare review in the Early Warning Center.",
                         read=False, created_at=now - timedelta(hours=3)),
            Notification(user_id=admin.id, category="system", title="Weekly system summary ready",
                         body="The weekly system analytics summary has been generated.",
                         read=False, created_at=now - timedelta(hours=5)),
        ])

        # ---- consent / audit / reports ----
        consent = [{"user_id": u.id, "wellbeing_checkins": True, "optional_feedback": True,
                    "notifications_enabled": True, "updated_at": now}
                   for u in [demo, admin, chief] + [p["_user"] for p in people]]
        for i in range(0, len(consent), 2000):
            db.execute(ConsentPreferences.__table__.insert(), consent[i:i + 2000])

        audits = [
            (now - timedelta(hours=1), chief, "Viewed aggregate alert", "EW-0001"),
            (now - timedelta(hours=2), chief, "Updated intervention status", "Intervention #12"),
            (now - timedelta(hours=4), admin, "Generated monthly report", "Monthly Welfare Overview"),
            (now - timedelta(days=1), officers[1], "Assigned welfare officer", "Intervention #7"),
            (now - timedelta(days=2), officers[2], "Closed intervention", "Intervention #22"),
            (now - timedelta(days=3), chief, "Confirmed support needed after review", "EW-0011"),
        ]
        for ts, actor, action, resource in audits:
            db.add(AuditLog(timestamp=ts, actor_id=actor.id, actor_name=actor.full_name,
                            actor_role=actor.role, action=action, resource=resource))

        reports = [("Monthly Welfare Overview", "Overview", "August 2026"),
                   ("Stress Risk Trends", "Trends", "Last 30 days"),
                   ("Workload Analysis", "Workload", "Last 30 days"),
                   ("Fatigue Trends", "Trends", "Last 60 days"),
                   ("Welfare Intervention Summary", "Interventions", "Quarter Q2 2026"),
                   ("Unit-Level Trends", "Units", "Last 90 days")]
        db.add_all([Report(title=t, category=c, period=p, generated_by="System",
                           created_at=now - timedelta(days=i * 3)) for i, (t, c, p) in enumerate(reports)])

        db.commit()
        return True
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding…")
    changed = seed()
    print("Seeded." if changed else "Already seeded.")


# ---------------- v2 backfill: runs on every startup for existing DBs ----------------
V2_LOCATIONS = ["North Sector", "Border Post 7", "Central HQ", "Riverside Base",
                "Coastal Station", "Highland Outpost"]
DEP_TYPES = ["Field", "Border", "Peacekeeping", "Training", "Desk"]
LEAVE_TYPES = ["Annual", "Sick", "Casual", "Earned"]
DUTY_TITLES = ["Gate duty", "Patrol — sector 3", "Signals watch", "Convoy escort prep",
               "Command post shift", "Equipment audit"]


def ensure_v2_seed() -> None:
    """Idempotent v2 data backfill for databases created before the v2 schema:
    commander account, deployments, leave records, upcoming duties, alert status
    variety, and sub-scores for historical predictions."""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        today = date.today()
        pw_hash, salt = hash_password("demo1234")

        # commander account
        if not db.query(User).filter(User.personnel_id == "CMDR-01").first():
            db.add(User(personnel_id="CMDR-01", password_hash=pw_hash, salt=salt,
                        full_name="Colonel R. Iyer", role="commander", unit=None,
                        designation="Formation Commander", joining_date=date(2008, 4, 10),
                        email="cmdr01@demo.example", phone="+91 9000111000"))
            db.commit()

        people = db.query(User).filter(User.role == "personnel").all()

        if db.query(func.count(DeploymentRecord.id)).scalar() == 0 and people:
            dep_rows, lv_rows, duty_rows = [], [], []
            rnd = random.Random(99)
            for p in people:
                n_dep = rnd.randint(1, 3)
                for k in range(n_dep):
                    started = today - timedelta(days=rnd.randint(60, 900))
                    active = k == 0
                    dep_rows.append({
                        "user_id": p.id, "unit_id": p.unit_id,
                        "location": rnd.choice(V2_LOCATIONS),
                        "deployment_type": rnd.choice(DEP_TYPES),
                        "intensity": rnd.choice(["low", "medium", "high"]),
                        "started_on": started,
                        "ended_on": None if active else started + timedelta(days=rnd.randint(30, 180)),
                        "status": "active" if active else "completed"})
                year = today.year
                for lt in LEAVE_TYPES:
                    if rnd.random() < 0.7:
                        days = rnd.randint(2, 12)
                        start = today - timedelta(days=rnd.randint(20, 300))
                        lv_rows.append({"user_id": p.id, "leave_type": lt, "days": days,
                                        "start_date": start, "end_date": start + timedelta(days=days),
                                        "status": "approved", "year": year})
                for d in range(1, 6):
                    dd = today + timedelta(days=d)
                    if dd.weekday() >= 5 and rnd.random() < 0.5:
                        continue
                    duty_rows.append({
                        "user_id": p.id, "title": rnd.choice(DUTY_TITLES), "duty_date": dd,
                        "shift": rnd.choice(["Morning", "Afternoon", "Night"]),
                        "location": rnd.choice(V2_LOCATIONS)})
            for i in range(0, len(dep_rows), 2000):
                db.execute(DeploymentRecord.__table__.insert(), dep_rows[i:i + 2000])
            for i in range(0, len(lv_rows), 2000):
                db.execute(LeaveRecord.__table__.insert(), lv_rows[i:i + 2000])
            for i in range(0, len(duty_rows), 2000):
                db.execute(DutyRecord.__table__.insert(), duty_rows[i:i + 2000])
            db.commit()

        # sub-scores for historical predictions that lack them (one-time)
        missing = (db.query(RiskPrediction)
                   .filter(RiskPrediction.stress_score.is_(None))
                   .limit(4000).all())
        if missing:
            from ..ml import get_engine
            from .scoring import compute_sub_scores
            engine = get_engine().load()
            payloads = [p.input_json or {} for p in missing]
            results = engine.predict_batch(payloads)
            for pred, r in zip(missing, results):
                pred.stress_score = r["sub_scores"]["stress"]
                pred.burnout_score = r["sub_scores"]["burnout"]
                pred.fatigue_score = r["sub_scores"]["fatigue"]
            db.commit()

        # alert pipeline variety + reason codes for legacy rows
        alerts = db.query(Alert).all()
        changed = False
        officers = db.query(User).filter(User.role == "welfare_officer").all()
        for i, a in enumerate(alerts):
            if a.reason_code in (None, "", "risk_detected") and not a.reviewed_by:
                a.reason_code = {
                    "high": "high_risk_detected",
                    "critical": "critical_risk_detected",
                }.get(a.severity, ["rising_trend", "repeated_poor_checkins",
                                          "fatigue_pattern", "follow_up_overdue"][i % 4])
                changed = True
            if a.status in ("open", ""):
                a.status = ["new", "new", "reviewing", "assigned", "resolved"][i % 5]
                changed = True
            if a.status == "assigned" and not a.assigned_officer_id and officers:
                off = officers[i % len(officers)]
                a.assigned_officer_id = off.id
                a.assigned_officer_name = off.full_name
                changed = True
        if changed:
            db.commit()
    finally:
        db.close()
