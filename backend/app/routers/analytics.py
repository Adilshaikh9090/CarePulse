from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (DeploymentRecord, Intervention, LeaveRecord, RiskPrediction, Unit, User,
                      WellbeingAssessment)
from ..security import require_roles

router = APIRouter(prefix="/analytics", tags=["analytics"])
AGGREGATE_ROLES = require_roles("welfare_officer", "administrator", "commander")


def _stress_index(feeling) -> float:
    return (5 - feeling) * 25.0


@router.get("/summary")
def summary(range_days: int = 30, user: User = Depends(AGGREGATE_ROLES),
            db: Session = Depends(get_db)):
    days = min(max(range_days, 7), 365)
    today = date.today()
    since = today - timedelta(days=days)

    assessments = (db.query(WellbeingAssessment.entry_date, WellbeingAssessment.feeling,
                            WellbeingAssessment.fatigue, WellbeingAssessment.sleep_quality,
                            WellbeingAssessment.workload, User.unit_id)
                   .join(User, User.id == WellbeingAssessment.user_id)
                   .filter(User.role == "personnel",
                           WellbeingAssessment.entry_date >= since).all())

    units = db.query(Unit).order_by(Unit.name.asc()).all()

    # heatmap grid: unit x day stress index
    by_cell: dict[tuple, list] = {}
    for r in assessments:
        key = (r[5] or 0, r[0])
        by_cell.setdefault(key, []).append(_stress_index(r[1]))
    grid_days = min(days, 21)
    heat_days = [today - timedelta(days=i) for i in range(grid_days - 1, -1, -1)]
    heatmap = []
    for u in units:
        row = {"unit": u.name.replace("Unit ", ""), "values": []}
        for d in heat_days:
            vals = by_cell.get((u.id, d))
            row["values"].append(round(sum(vals) / len(vals), 1) if vals else None)
        heatmap.append(row)

    daily: dict[date, list] = {}
    wl_stress: dict[str, list] = {}
    slp_stress: dict[int, list] = {}
    for r in assessments:
        s = _stress_index(r[1])
        daily.setdefault(r[0], []).append(s)
        wl_bucket = {1: "Light", 2: "Manageable", 3: "Heavy", 4: "Extremely Heavy",
                     5: "Extremely Heavy"}.get(r[4], "?")
        wl_stress.setdefault(wl_bucket, []).append(s)
        slp_stress.setdefault(r[3], []).append(s)

    stress_trend = [{"date": d.isoformat(), "value": round(sum(v) / len(v), 1)}
                    for d, v in sorted(daily.items())]

    wk_start = today - timedelta(weeks=11)
    preds = (db.query(RiskPrediction.burnout_score, RiskPrediction.stress_score,
                      RiskPrediction.fatigue_score, RiskPrediction.created_at,
                      RiskPrediction.risk_level)
             .filter(RiskPrediction.created_at >= datetime.combine(wk_start, datetime.min.time()))
             .all())
    weekly = {}
    for b, s, f, ts, lvl in preds:
        wk = (ts.date() - wk_start).days // 7
        cell = weekly.setdefault(wk, {"b": [], "f": [], "s": [], "levels": {}})
        if b is not None:
            cell["b"].append(b)
            cell["f"].append(f)
        if s is not None:
            cell["s"].append(s)
        cell["levels"][lvl] = cell["levels"].get(lvl, 0) + 1
    burnout_trend = [{"week": f"W{w + 1}", "burnout": round(sum(c["b"]) / len(c["b"]), 1)}
                     for w, c in sorted(weekly.items()) if c["b"]]
    fatigue_trend = [{"week": f"W{w + 1}", "fatigue": round(sum(c["f"]) / len(c["f"]), 1)}
                     for w, c in sorted(weekly.items()) if c["f"]]
    risk_trend = [{"week": f"W{w + 1}", **c["levels"]} for w, c in sorted(weekly.items())]

    unit_rows = (db.query(func.avg(WellbeingAssessment.workload),
                          func.avg(WellbeingAssessment.fatigue),
                          func.avg((5 - WellbeingAssessment.feeling) * 25),
                          func.count(WellbeingAssessment.id), User.unit_id)
                 .join(User, User.id == WellbeingAssessment.user_id)
                 .filter(User.role == "personnel",
                         WellbeingAssessment.entry_date >= since)
                 .group_by(User.unit_id).all())
    unit_map = {r[4]: r for r in unit_rows}
    unit_comparison = []
    for u in units:
        r = unit_map.get(u.id)
        if r:
            unit_comparison.append({"unit": u.name.replace("Unit ", ""),
                                    "workload": round(float(r[0] or 0), 2),
                                    "fatigue": round(float(r[1] or 0), 2),
                                    "stress": round(float(r[2] or 0), 1),
                                    "checkins": int(r[3])})

    workload_analysis = [{"bucket": k, "count": len(v), "avg_stress": round(sum(v) / len(v), 1)}
                         for k, v in wl_stress.items()]
    sleep_correlation = [{"sleep": k, "avg_stress": round(sum(v) / len(v), 1), "n": len(v)}
                         for k, v in sorted(slp_stress.items())]
    workload_correlation = [
        {"workload_bucket": w, "avg_stress": round(sum(v) / len(v), 1), "n": len(v)}
        for w, v in wl_stress.items()]

    leaves = db.query(LeaveRecord.days, LeaveRecord.leave_type).filter(
        LeaveRecord.status == "approved", LeaveRecord.year == today.year).all()
    leave_utilization = {}
    for lt in ("Annual", "Sick", "Casual", "Earned"):
        used = sum(d for t, d in leaves if t == lt)
        entitled = {"Annual": 30 * max(len(units), 1), "Earned": 15 * max(len(units), 1),
                    "Sick": 10 * max(len(units), 1), "Casual": 8 * max(len(units), 1)}[lt]
        leave_utilization[lt] = {"used": used, "entitled": entitled,
                                 "pct": round(100 * used / entitled, 1) if entitled else 0}

    deps = db.query(DeploymentRecord.deployment_type, DeploymentRecord.intensity,
                    DeploymentRecord.user_id).filter(DeploymentRecord.status == "active").all()
    dep_stress: dict[str, list] = {}
    user_unit = {u.id: (u.unit_id or 0) for u in db.query(User.id, User.unit_id).all()}
    latest_sq = (db.query(RiskPrediction.user_id, func.max(RiskPrediction.created_at).label("mx"))
                 .group_by(RiskPrediction.user_id).subquery())
    latest_lvl = {(r[0]): r[1] for r in
                  (db.query(RiskPrediction.user_id, RiskPrediction.risk_level)
                   .join(latest_sq, (latest_sq.c.user_id == RiskPrediction.user_id) &
                                    (latest_sq.c.mx == RiskPrediction.created_at))).all()}
    lvl_num = {"Low": 20, "Moderate": 50, "High": 78, "Critical": 92}
    for dtype, intensity, uid in deps:
        lvl = latest_lvl.get(uid)
        if lvl:
            dep_stress.setdefault(dtype, []).append(lvl_num[lvl])
    deployment_trend = [{"type": k, "avg_risk": round(sum(v) / len(v), 1), "n": len(v)}
                        for k, v in dep_stress.items()]

    ivs = db.query(Intervention).all()
    completed = [i for i in ivs if i.status == "completed"]
    effectiveness = {
        "total": len(ivs),
        "completed": len(completed),
        "completion_rate": round(100 * len(completed) / len(ivs), 1) if ivs else 0,
        "avg_days_to_complete": None,
    }
    durations = []
    for i in completed:
        end = i.created_at
        delta = (end - i.created_at).days
        if delta >= 0:
            durations.append(delta)
    if durations:
        effectiveness["avg_days_to_complete"] = round(sum(durations) / len(durations), 1)

    return {
        "range_days": days,
        "heatmap": {"days": [d.isoformat() for d in heat_days], "rows": heatmap},
        "stress_trend": stress_trend,
        "burnout_trend": burnout_trend,
        "fatigue_trend": fatigue_trend,
        "risk_trend": risk_trend,
        "unit_comparison": unit_comparison,
        "workload_analysis": workload_analysis,
        "correlations": {"workload_vs_stress": workload_correlation,
                         "sleep_vs_stress": sleep_correlation,
                         "deployment_vs_risk": deployment_trend},
        "leave_utilization": leave_utilization,
        "intervention_effectiveness": effectiveness,
        "note": ("Prototype analytics on synthetic demo data — aggregate indicators only, "
                 "not clinically validated."),
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/insights")
def insights(user: User = Depends(AGGREGATE_ROLES), db: Session = Depends(get_db)):
    today = date.today()
    m_start = today.replace(day=1)
    prev_end = m_start - timedelta(days=1)
    prev_start = prev_end.replace(day=1)

    def avg_stress(lo: date, hi: date):
        r = (db.query(func.avg((5 - WellbeingAssessment.feeling) * 25))
             .join(User, User.id == WellbeingAssessment.user_id)
             .filter(User.role == "personnel", WellbeingAssessment.entry_date >= lo,
                     WellbeingAssessment.entry_date <= hi).scalar())
        return float(r or 0)

    this_m, prev_m = avg_stress(m_start, today), avg_stress(prev_start, prev_end)
    delta = round(this_m - prev_m, 1)

    units = db.query(Unit).all()
    worst_unit, worst_wl = None, -1
    for u in units:
        wl = (db.query(func.avg(WellbeingAssessment.workload))
              .join(User, User.id == WellbeingAssessment.user_id)
              .filter(User.unit_id == u.id,
                      WellbeingAssessment.entry_date >= today - timedelta(days=30)).scalar())
        if wl and wl > worst_wl:
            worst_wl, worst_unit = wl, u

    top_sq = (db.query(RiskPrediction.user_id, func.max(RiskPrediction.created_at).label("mx"))
              .group_by(RiskPrediction.user_id).subquery())
    latest_preds = (db.query(RiskPrediction)
                    .join(top_sq, (top_sq.c.user_id == RiskPrediction.user_id) &
                                  (top_sq.c.mx == RiskPrediction.created_at)).all())
    factor_freq: dict[str, int] = {}
    heavy_workload_users = 0
    for p in latest_preds:
        for f in p.factors[:1]:
            factor_freq[f.name] = factor_freq.get(f.name, 0) + 1
        if p.input_json and p.input_json.get("workload_score", 0) >= 8:
            heavy_workload_users += 1
    top_factor = max(factor_freq, key=factor_freq.get) if factor_freq else "Workload"

    items = [
        {"id": "stress_delta", "tone": "amber" if delta > 3 else ("emerald" if delta < -3 else "sky"),
         "title": f"Stress levels {'increased' if delta >= 0 else 'decreased'} by {abs(delta)}% this month.",
         "body": ("Month-over-month change in the aggregated workforce stress index. "
                  "Small shifts are normal; sustained rises deserve a welfare review.")},
        {"id": "unit_pattern", "tone": "rose" if worst_wl > 3.6 else "sky",
         "title": (f"{worst_unit.name} shows a higher workload-related stress pattern."
                   if worst_unit else "Unit workload patterns are balanced this period."),
         "body": ("Average reported workload is the highest of all units over the last 30 days. "
                  "Consider a supportive duty-roster review.")},
        {"id": "sleep_factor", "tone": "violet",
         "title": f"Poor sleep is one of the strongest observed factors ({top_factor} leads current indicators).",
         "body": ("Across the demo dataset, reduced sleep quality frequently appears among "
                  "elevating factors in AI explanations.")},
        {"id": "heavy_review", "tone": "amber",
         "title": (f"{heavy_workload_users} personnel show repeated high-workload indicators "
                   "and may benefit from welfare review."),
         "body": ("Based on their latest AI indicator inputs. Any follow-up remains voluntary, "
                  "confidential, and human-led.")},
    ]
    return {"items": items,
            "label": "Prototype analytics — synthetic demo data, not clinically validated."}
