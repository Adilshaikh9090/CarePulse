from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..cache import cached
from ..database import get_db
from ..models import (Alert, AuditLog, DeploymentRecord, DutyRecord, Intervention, LeaveRecord,
                      Notification, Report, RiskPrediction, Unit, User,
                      WelfareRecommendation, WellbeingAssessment)
from ..schemas import AlertReviewRequest, InterventionCreate, InterventionUpdate
from ..security import require_roles

router = APIRouter(prefix="/welfare", tags=["welfare"])
OFFICER = require_roles("welfare_officer", "administrator")
AGGREGATE_ROLES = require_roles("welfare_officer", "administrator", "commander")


def log_action(db: Session, actor: User, action: str, resource: str):
    db.add(AuditLog(timestamp=datetime.utcnow(), actor_id=actor.id, actor_name=actor.full_name,
                    actor_role=actor.role, action=action, resource=resource))


def _label(db: Session, alert: Alert) -> str:
    if alert.subject_user_id:
        u = db.query(User).filter(User.id == alert.subject_user_id).first()
        if u:
            return u.personnel_id
    if alert.unit_id:
        unit = db.query(Unit).filter(Unit.id == alert.unit_id).first()
        if unit:
            return unit.name
    return "—"


# ---------------- alerts ----------------
@router.get("/alerts")
def list_alerts(status_filter: str | None = None, severity: str | None = None,
                user: User = Depends(OFFICER), db: Session = Depends(get_db)):
    q = db.query(Alert).order_by(Alert.detected_at.desc())
    if status_filter:
        q = q.filter(Alert.status == status_filter)
    if severity:
        q = q.filter(Alert.severity == severity)
    items = []
    for a in q.limit(120).all():
        subject = db.query(User).filter(User.id == a.subject_user_id).first() if a.subject_user_id else None
        unit = db.query(Unit).filter(Unit.id == a.unit_id).first() if a.unit_id else None
        items.append({
            "id": a.id, "code": a.code, "scope": a.scope, "title": a.title,
            "severity": a.severity, "reason_code": a.reason_code or "risk_detected",
            "detected_at": a.detected_at.isoformat() + "Z",
            "factors": a.factors or [], "recommendation": a.recommendation or "",
            "status": a.status,
            "assigned_officer": a.assigned_officer_name or "",
            "subject_label": subject.personnel_id if subject else (unit.name if unit else "—"),
        })
    counts = {"critical": 0, "high": 0, "moderate": 0, "low": 0}
    for c in db.query(Alert.severity, func.count(Alert.id)).filter(
            Alert.status.in_(("new", "reviewing", "assigned"))).group_by(Alert.severity).all():
        counts[c[0]] = int(c[1])
    return {"items": items, "open_counts": counts}


@router.put("/alerts/{alert_id}/status")
def set_alert_status(alert_id: int, payload: dict, user: User = Depends(OFFICER),
                     db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alert not found.")
    new_status = str(payload.get("status", "")).strip()
    allowed = ("new", "reviewing", "assigned", "resolved")
    if new_status not in allowed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Status must be one of {allowed}.")
    alert.status = new_status
    officer_id = payload.get("assign_officer_id")
    if officer_id:
        off = db.query(User).filter(User.id == officer_id, User.role == "welfare_officer").first()
        if off:
            alert.assigned_officer_id = off.id
            alert.assigned_officer_name = off.full_name
            if new_status == "assigned":
                pass
    elif new_status == "assigned" and not alert.assigned_officer_id:
        off = (db.query(User).filter(User.role == "welfare_officer")
               .order_by(func.random()).first())
        if off:
            alert.assigned_officer_id = off.id
            alert.assigned_officer_name = off.full_name
    if new_status == "resolved":
        alert.reviewed_at = datetime.utcnow()
        alert.reviewed_by = user.full_name
    log_action(db, user, f"Alert status → {new_status}", alert.code)
    db.commit()
    return {"message": f"Alert {alert.code} set to {new_status}.",
            "status": alert.status, "assigned_officer": alert.assigned_officer_name}


def _anon_label(seq: int) -> str:
    return f"ANON-{1000 + seq}"


@router.get("/officers")
def welfare_officers(user: User = Depends(OFFICER), db: Session = Depends(get_db)):
    rows = (db.query(User).filter(User.role == "welfare_officer", User.active.is_(True))
            .order_by(User.full_name.asc()).all())
    return {"items": [{"id": u.id, "name": u.full_name, "designation": u.designation or ""} for u in rows]}


@router.post("/alerts/{alert_id}/review")
def review_alert(alert_id: int, payload: AlertReviewRequest, user: User = Depends(OFFICER),
                 db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alert not found.")
    status_map = {"confirm_support": "resolved", "no_action": "closed_no_action",
                  "follow_up": "reviewing"}
    alert.status = status_map[payload.decision]
    alert.reviewed_at = datetime.utcnow()
    alert.reviewed_by = user.full_name

    iv = None
    if payload.decision == "confirm_support":
        officer = (db.query(User).filter(User.id == payload.assign_officer_id).first()
                   if payload.assign_officer_id else
                   db.query(User).filter(User.role == "welfare_officer")
                   .order_by(func.random()).first())
        if officer:
            alert.assigned_officer_id = officer.id
            alert.assigned_officer_name = officer.full_name
            alert.status = "assigned"
        iv = Intervention(alert_id=alert.id, subject_user_id=alert.subject_user_id,
                          unit_id=alert.unit_id, subject_label=_label(db, alert),
                          risk_level=alert.severity.capitalize(),
                          action=alert.recommendation or "Supportive human review",
                          assigned_officer_id=officer.id if officer else None,
                          officer_name=officer.full_name if officer else "",
                          created_at=datetime.utcnow(),
                          due_date=date.today() + timedelta(days=7),
                          status="in_review", notes=payload.notes or "")
        db.add(iv)
        if alert.subject_user_id:
            db.add(Notification(user_id=alert.subject_user_id, category="support_available",
                                title="Welfare support arranged",
                                body="A confidential welfare consultation has been arranged for you. "
                                     "Participation remains fully voluntary.",
                                created_at=datetime.utcnow()))
    log_action(db, user, f"Reviewed alert ({payload.decision})", alert.code)
    db.commit()
    return {"message": f"Alert {alert.code} marked “{status_map[payload.decision]}”.",
            "intervention_id": iv.id if iv else None}


# ---------------- interventions ----------------
@router.get("/interventions")
def list_interventions(status_filter: str | None = None, search: str | None = None,
                       user: User = Depends(OFFICER), db: Session = Depends(get_db)):
    q = db.query(Intervention).order_by(Intervention.created_at.desc())
    if status_filter:
        q = q.filter(Intervention.status == status_filter)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(or_(Intervention.subject_label.ilike(like),
                         Intervention.action.ilike(like),
                         Intervention.officer_name.ilike(like)))
    items = [{
        "id": i.id, "subject_label": i.subject_label, "risk_level": i.risk_level,
        "action": i.action, "officer": i.officer_name,
        "created_at": i.created_at.date().isoformat(),
        "due_date": i.due_date.isoformat() if i.due_date else None,
        "status": i.status, "notes": i.notes or "",
    } for i in q.limit(200).all()]
    counts = {c[0]: int(c[1]) for c in db.query(
        Intervention.status, func.count(Intervention.id)).group_by(Intervention.status).all()}
    return {"items": items, "counts": counts}


@router.post("/interventions")
def create_intervention(payload: InterventionCreate, user: User = Depends(OFFICER),
                        db: Session = Depends(get_db)):
    label = "—"
    if payload.subject_user_id:
        su = db.query(User).filter(User.id == payload.subject_user_id).first()
        label = su.personnel_id if su else "—"
    elif payload.unit_id:
        unit = db.query(Unit).filter(Unit.id == payload.unit_id).first()
        label = unit.name if unit else "—"
    officer = (db.query(User).filter(User.role == "welfare_officer")
               .order_by(func.random()).first())
    iv = Intervention(alert_id=payload.alert_id, subject_user_id=payload.subject_user_id,
                      unit_id=payload.unit_id, subject_label=label, risk_level=payload.risk_level,
                      action=payload.action, assigned_officer_id=officer.id if officer else None,
                      officer_name=officer.full_name if officer else "",
                      created_at=datetime.utcnow(),
                      due_date=date.today() + timedelta(days=payload.due_days),
                      status="pending", notes="")
    db.add(iv)
    log_action(db, user, "Created intervention", payload.action[:60])
    db.commit()
    return {"message": "Intervention created.", "id": iv.id}


@router.put("/interventions/{iv_id}")
def update_intervention(iv_id: int, payload: InterventionUpdate, user: User = Depends(OFFICER),
                        db: Session = Depends(get_db)):
    iv = db.query(Intervention).filter(Intervention.id == iv_id).first()
    if not iv:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Intervention not found.")
    changes = []
    if payload.status and payload.status != iv.status:
        iv.status = payload.status
        changes.append(f"status → {payload.status}")
    if payload.assigned_officer_id is not None:
        off = db.query(User).filter(User.id == payload.assigned_officer_id,
                                    User.role == "welfare_officer").first()
        if off:
            iv.assigned_officer_id = off.id
            iv.officer_name = off.full_name
            changes.append(f"officer → {off.full_name}")
    if payload.notes is not None:
        iv.notes = payload.notes
        changes.append("notes updated")
    iv.updated_at = datetime.utcnow()
    log_action(db, user, "Updated intervention", f"#{iv.id} ({', '.join(changes) or 'no change'})")
    db.commit()
    return {"message": f"Intervention #{iv.id} updated.", "changes": changes}


# ---------------- reports ----------------
@router.get("/reports/list")
def report_list(user: User = Depends(OFFICER), db: Session = Depends(get_db)):
    rows = db.query(Report).order_by(Report.created_at.desc()).limit(30).all()
    return {"items": [{"id": r.id, "title": r.title, "category": r.category, "period": r.period,
                       "generated_by": r.generated_by,
                       "created_at": r.created_at.date().isoformat()} for r in rows]}


@cached(ttl=30)
@router.get("/reports/overview")
def report_overview(user: User = Depends(OFFICER), db: Session = Depends(get_db)):
    total_personnel = db.query(func.count(User.id)).filter(User.role == "personnel").scalar()

    latest_sq = (db.query(RiskPrediction.user_id,
                          func.max(RiskPrediction.created_at).label("mx"))
                 .group_by(RiskPrediction.user_id).subquery())
    latest_rows = (db.query(RiskPrediction.risk_level, func.count())
                   .join(latest_sq, (latest_sq.c.user_id == RiskPrediction.user_id) &
                                    (latest_sq.c.mx == RiskPrediction.created_at))
                   .join(User, User.id == RiskPrediction.user_id)
                   .filter(User.role == "personnel")
                   .group_by(RiskPrediction.risk_level).all())
    current = {lvl: int(cnt) for lvl, cnt in latest_rows}

    iv_counts = {c[0]: int(c[1]) for c in db.query(
        Intervention.status, func.count(Intervention.id)).group_by(Intervention.status).all()}
    open_alerts = db.query(func.count(Alert.id)).filter(Alert.status == "open").scalar()
    recs_pending = db.query(func.count(WelfareRecommendation.id)).filter(
        WelfareRecommendation.status == "pending").scalar()

    return {
        "total_personnel": total_personnel,
        "current_risk_distribution": {"High": current.get("High", 0),
                                      "Moderate": current.get("Moderate", 0),
                                      "Low": current.get("Low", 0)},
        "interventions_by_status": iv_counts,
        "open_alerts": open_alerts,
        "pending_recommendations": recs_pending,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "note": "Aggregated, anonymized statistics only — no individual data is exposed.",
    }


# ---------------- audit ----------------
@router.get("/audit-log")
def audit_log(limit: int = 50, user: User = Depends(require_roles("administrator")),
              db: Session = Depends(get_db)):
    rows = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(min(limit, 200)).all()
    return {"items": [{"id": a.id, "timestamp": a.timestamp.isoformat() + "Z",
                       "actor": a.actor_name, "role": a.actor_role, "action": a.action,
                       "resource": a.resource} for a in rows]}


@router.get("/audit-log/search")
def audit_search(q: str, user: User = Depends(require_roles("administrator")),
                 db: Session = Depends(get_db)):
    like = f"%{q.strip()}%"
    rows = (db.query(AuditLog)
            .filter(or_(AuditLog.action.ilike(like), AuditLog.resource.ilike(like),
                        AuditLog.actor_name.ilike(like)))
            .order_by(AuditLog.timestamp.desc()).limit(100).all())
    return {"query": q, "items": [{"timestamp": a.timestamp.isoformat() + "Z",
                                   "actor": a.actor_name, "action": a.action,
                                   "resource": a.resource} for a in rows]}


# ---------------- command dashboard (aggregates only) ----------------
@router.get("/command-dashboard")
def command_dashboard(user: User = Depends(AGGREGATE_ROLES), db: Session = Depends(get_db)):
    today = date.today()
    people = db.query(User).filter(User.role == "personnel", User.active.is_(True)).all()
    pid_to_unit = {u.id: (u.unit.name if u.unit else "Unassigned") for u in people}

    latest_sq = (db.query(RiskPrediction.user_id, func.max(RiskPrediction.created_at).label("mx"))
                 .group_by(RiskPrediction.user_id).subquery())
    latest = (db.query(RiskPrediction)
              .join(latest_sq, (latest_sq.c.user_id == RiskPrediction.user_id) &
                               (latest_sq.c.mx == RiskPrediction.created_at))
              .filter(RiskPrediction.user_id.in_([u.id for u in people] or [0])).all())

    counts = {"Low": 0, "Moderate": 0, "High": 0, "Critical": 0}
    unit_risk: dict[str, dict[str, int]] = {}
    wellness_pool = []
    for p in latest:
        counts[p.risk_level] = counts.get(p.risk_level, 0) + 1
        uname = pid_to_unit.get(p.user_id, "Unassigned")
        bucket = unit_risk.setdefault(uname, {"Low": 0, "Moderate": 0, "High": 0, "Critical": 0})
        bucket[p.risk_level] += 1
        if p.stress_score is not None:
            wellness_pool.append(100 - (p.stress_score + p.burnout_score or p.stress_score) / 2)
        else:
            wellness_pool.append(100 * (1 - p.risk_score))
    workforce_score = round(sum(wellness_pool) / len(wellness_pool), 1) if wellness_pool else 0

    checkins_today = db.query(func.count(WellbeingAssessment.id)).filter(
        WellbeingAssessment.entry_date == today).scalar()

    since14 = today - timedelta(days=13)
    rows14 = (db.query(WellbeingAssessment.entry_date,
                       func.avg((5 - WellbeingAssessment.feeling) * 25),
                       func.avg(WellbeingAssessment.fatigue * 20),
                       func.avg(WellbeingAssessment.sleep_quality * 20))
              .filter(WellbeingAssessment.entry_date >= since14)
              .group_by(WellbeingAssessment.entry_date)
              .order_by(WellbeingAssessment.entry_date.asc()).all())
    weekly_stress = [{"date": r[0].isoformat(), "stress": round(float(r[1] or 0), 1),
                      "fatigue": round(float(r[2] or 0), 1), "sleep": round(float(r[3] or 0), 1)}
                     for r in rows14]

    wk_start = today - timedelta(weeks=7)
    preds8 = (db.query(RiskPrediction.burnout_score, RiskPrediction.fatigue_score,
                       RiskPrediction.created_at)
              .filter(RiskPrediction.created_at >= datetime.combine(wk_start, datetime.min.time()))
              .all())
    by_week: dict[int, list] = {}
    for b, f, ts in preds8:
        if b is None:
            continue
        wk = (ts.date() - wk_start).days // 7
        by_week.setdefault(wk, []).append((b, f))
    burnout_trend, fatigue_trend = [], []
    for wk in sorted(by_week):
        vals = by_week[wk]
        burnout_trend.append({"week": f"W{wk + 1}", "value": round(sum(v[0] for v in vals) / len(vals), 1)})
        fatigue_trend.append({"week": f"W{wk + 1}", "value": round(sum(v[1] for v in vals) / len(vals), 1)})

    open_followups = db.query(func.count(Intervention.id)).filter(
        Intervention.status.in_(("pending", "in_review"))).scalar()

    dept_distribution = [{"department": un, "count": sum(lv.values())}
                         for un, lv in sorted(unit_risk.items())]

    unit_risk_list = []
    for un, lv in sorted(unit_risk.items()):
        total_u = sum(lv.values())
        unit_risk_list.append({"unit": un, "low": lv.get("Low", 0), "moderate": lv.get("Moderate", 0),
                               "high": lv.get("High", 0), "critical": lv.get("Critical", 0),
                               "total": total_u})

    needs_followup_list = []
    for p in latest:
        if p.risk_level in ("High", "Critical"):
            uname = pid_to_unit.get(p.user_id, "Unassigned")
            needs_followup_list.append({
                "anon_id": _anon_label(p.user_id % 900 + 100),
                "level": p.risk_level,
                "last_checkin": None,
            })

    weekly_stress_list = [{"week": f"W{i+1}", "value": round(w["stress"], 1)}
                          for i, w in enumerate(weekly_stress)]

    burnout_trend_final = [{"week": b["week"], "burnout": b["value"]} for b in burnout_trend]
    fatigue_trend_final = [{"week": f["week"], "fatigue": f["value"]} for f in fatigue_trend]

    return {
        "total_personnel": len(people),
        "active_checkins_today": int(checkins_today or 0),
        "risk_counts": counts,
        "unit_risk": unit_risk_list,
        "needs_followup": needs_followup_list,
        "open_interventions": int(open_followups or 0),
        "workforce_wellness_score": workforce_score,
        "weekly_stress": weekly_stress_list,
        "burnout_trend": burnout_trend_final,
        "fatigue_trend": fatigue_trend_final,
        "department_distribution": dept_distribution,
        "note": ("Aggregated, anonymized statistics only — individual responses are never "
                 "shown at this level."),
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


# ---------------- personnel risk table ----------------
@router.get("/personnel-table")
def personnel_table(q: str | None = None, risk: str | None = None, unit_id: int | None = None,
                    deployment: str | None = None, followup: str | None = None,
                    show_names: bool = False, user: User = Depends(OFFICER),
                    db: Session = Depends(get_db)):
    people_q = db.query(User).filter(User.role == "personnel", User.active.is_(True))
    if unit_id:
        people_q = people_q.filter(User.unit_id == unit_id)
    if q:
        like = f"%{q.strip()}%"
        people_q = people_q.filter(or_(User.personnel_id.ilike(like), User.full_name.ilike(like)))
    people = people_q.limit(400).all()
    ids = [p.id for p in people] or [0]

    latest_sq = (db.query(RiskPrediction.user_id, func.max(RiskPrediction.created_at).label("mx"))
                 .filter(RiskPrediction.user_id.in_(ids)).group_by(RiskPrediction.user_id).subquery())
    latest = {(r.user_id): r for r in (db.query(RiskPrediction)
               .join(latest_sq, (latest_sq.c.user_id == RiskPrediction.user_id) &
                                (latest_sq.c.mx == RiskPrediction.created_at))).all()}
    last_checkins = {r[0]: r[1] for r in
                     db.query(WellbeingAssessment.user_id, func.max(WellbeingAssessment.entry_date))
                     .filter(WellbeingAssessment.user_id.in_(ids)).group_by(WellbeingAssessment.user_id).all()}
    active_dep = {d.user_id: d for d in db.query(DeploymentRecord)
                  .filter(DeploymentRecord.user_id.in_(ids), DeploymentRecord.status == "active").all()}
    open_iv = {}
    for iv in (db.query(Intervention).filter(Intervention.subject_user_id.in_(ids),
                                             Intervention.status.in_(("pending", "in_review"))).all()):
        open_iv.setdefault(iv.subject_user_id, []).append(iv)

    items, seq = [], 0
    for p in sorted(people, key=lambda u: u.personnel_id):
        pred = latest.get(p.id)
        level = pred.risk_level if pred else "Unknown"
        if risk and level != risk:
            continue
        dep = active_dep.get(p.id)
        if deployment and (dep.deployment_type if dep else "None") != deployment:
            continue
        ivs = open_iv.get(p.id, [])
        fu = "none"
        if ivs:
            overdue = any(i.due_date and i.due_date < date.today() for i in ivs)
            fu = "overdue" if overdue else ivs[0].status
        if followup and fu != followup:
            continue
        seq += 1
        last_ci = last_checkins.get(p.id)
        items.append({
            "id": p.id,
            "user_id": p.id,
            "anon_id": _anon_label(seq),
            "personnel_id": p.personnel_id if show_names else None,
            "display_name": (p.full_name if show_names else None),
            "unit": p.unit.name if p.unit else "Unassigned",
            "risk_level": level,
            "stress_score": pred.stress_score if pred else None,
            "burnout_score": pred.burnout_score if pred else None,
            "fatigue_score": pred.fatigue_score if pred else None,
            "last_checkin": last_ci.isoformat() if last_ci else None,
            "deployment_status": dep.deployment_type if dep else "None",
            "follow_up_status": fu,
        })
    return {"items": items, "anonymized": not show_names}


@router.get("/personnel/{user_id}/detail")
def personnel_detail(user_id: int, user: User = Depends(OFFICER), db: Session = Depends(get_db)):
    subject = db.query(User).filter(User.id == user_id, User.role == "personnel").first()
    if not subject:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Personnel record not found.")

    pred = (db.query(RiskPrediction).filter(RiskPrediction.user_id == subject.id)
            .order_by(RiskPrediction.created_at.desc()).first())
    factors = ([{"name": f.name, "impact": f.impact, "direction": f.direction,
                 "description": f.description} for f in pred.factors] if pred else [])

    since30 = date.today() - timedelta(days=29)
    rows = (db.query(WellbeingAssessment)
            .filter(WellbeingAssessment.user_id == subject.id,
                    WellbeingAssessment.entry_date >= since30)
            .order_by(WellbeingAssessment.entry_date.asc()).all())

    active_deps = (db.query(DeploymentRecord).filter(DeploymentRecord.user_id == subject.id,
                   DeploymentRecord.status == "active").all())

    trends = [{"date": r.entry_date.isoformat(),
               "stress": round((5 - r.feeling) * 25, 1),
               "burnout": round(r.fatigue * 18 + (5 - r.job_satisfaction) * 12, 1),
               "sleep": round(r.sleep_quality * 20, 1),
               "workload": round(r.workload * 22, 1)} for r in rows]
    recent_checkins = [{
        "date": r.entry_date.isoformat(), "feeling": r.feeling, "sleep_quality": r.sleep_quality,
        "energy_level": r.energy_level, "workload": r.workload,
        "emotional_fatigue": r.emotional_fatigue or r.fatigue, "comment": r.comment,
    } for r in sorted(rows, key=lambda r: r.entry_date, reverse=True)[:10]]

    deployments = (db.query(DeploymentRecord).filter(DeploymentRecord.user_id == subject.id)
                   .order_by(DeploymentRecord.started_on.desc()).limit(6).all())
    leaves = (db.query(LeaveRecord).filter(LeaveRecord.user_id == subject.id)
              .order_by(LeaveRecord.start_date.desc()).limit(8).all())
    interventions = (db.query(Intervention).filter(Intervention.subject_user_id == subject.id)
                     .order_by(Intervention.created_at.desc()).limit(10).all())

    yrs = None
    if subject.joining_date:
        yrs = (date.today() - subject.joining_date).days // 365

    total_leave = 0
    for l in leaves:
        total_leave += l.days

    return {
        "profile": {"id": subject.id, "personnel_id": subject.personnel_id,
                    "anon_id": _anon_label(subject.id % 900 + 100),
                    "unit": subject.unit.name if subject.unit else "Unassigned",
                    "designation": subject.designation,
                    "deployment_status": (active_deps[0].deployment_type if active_deps
                                          else None),
                    "years_of_service": yrs,
                    "leave_balance_summary": f"{total_leave} days used in recent records"},
        "latest_prediction": ({
            "risk_level": pred.risk_level, "risk_score": pred.risk_score,
            "confidence": pred.confidence, "model_version": pred.model_version or "v1",
            "sub_scores": {"stress": pred.stress_score or 0, "burnout": pred.burnout_score or 0,
                           "fatigue": pred.fatigue_score or 0},
            "explanation": pred.explanation or "",
            "top_factors": factors[:3],
            "recommendations": [],
            "follow_up": None,
            "created_at": pred.created_at.isoformat() + "Z",
            "disclaimer": ("AI-generated wellness indicator — not a medical diagnosis. "
                           "Human welfare review is required before any intervention."),
        } if pred else None),
        "trends": [{"date": t["date"], "stress_index": t["stress"], "sleep_quality": t["sleep"],
                     "workload": t["workload"]} for t in trends],
        "recent_checkins": recent_checkins,
        "deployments": [{"type": d.deployment_type, "location": d.location,
                         "intensity": d.intensity or "standard",
                         "started_on": d.started_on.isoformat(),
                         "ended_on": d.ended_on.isoformat() if d.ended_on else None,
                         "status": d.status} for d in deployments],
        "leave_records": [{"type": l.leave_type, "days": l.days,
                           "start_date": l.start_date.isoformat(),
                           "end_date": l.end_date.isoformat() if l.end_date else l.start_date.isoformat(),
                           "status": l.status} for l in leaves],
        "interventions": [{"id": i.id, "action": i.action, "officer": i.officer_name,
                           "status": i.status, "due_date": i.due_date.isoformat() if i.due_date else None,
                           "notes": i.notes or "",
                           "created_at": i.created_at.date().isoformat()} for i in interventions],
        "note": ("Authorized welfare access — logged. Show the minimum information needed "
                 "for supportive review."),
    }
