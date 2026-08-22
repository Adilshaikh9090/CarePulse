from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (Alert, AuditLog, Intervention, Notification, Report, RiskPrediction,
                      Unit, User, WelfareRecommendation)
from ..schemas import AlertReviewRequest, InterventionCreate, InterventionUpdate
from ..security import require_roles

router = APIRouter(prefix="/welfare", tags=["welfare"])
OFFICER = require_roles("welfare_officer", "administrator")


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
    for a in q.limit(100).all():
        subject = db.query(User).filter(User.id == a.subject_user_id).first() if a.subject_user_id else None
        unit = db.query(Unit).filter(Unit.id == a.unit_id).first() if a.unit_id else None
        items.append({
            "id": a.id, "code": a.code, "scope": a.scope, "title": a.title,
            "severity": a.severity,
            "detected_at": a.detected_at.isoformat() + "Z",
            "factors": a.factors or [], "recommendation": a.recommendation or "",
            "status": a.status,
            "subject_label": subject.personnel_id if subject else (unit.name if unit else "—"),
        })
    counts = {"high": 0, "moderate": 0, "low": 0}
    for c in db.query(Alert.severity, func.count(Alert.id)).filter(
            Alert.status == "open").group_by(Alert.severity).all():
        counts[c[0]] = int(c[1])
    return {"items": items, "open_counts": counts}


@router.post("/alerts/{alert_id}/review")
def review_alert(alert_id: int, payload: AlertReviewRequest, user: User = Depends(OFFICER),
                 db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alert not found.")
    status_map = {"confirm_support": "support_confirmed", "no_action": "closed_no_action",
                  "follow_up": "follow_up_scheduled"}
    alert.status = status_map[payload.decision]
    alert.reviewed_at = datetime.utcnow()
    alert.reviewed_by = user.full_name

    iv = None
    if payload.decision == "confirm_support":
        officer = (db.query(User).filter(User.id == payload.assign_officer_id).first()
                   if payload.assign_officer_id else
                   db.query(User).filter(User.role == "welfare_officer")
                   .order_by(func.random()).first())
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
