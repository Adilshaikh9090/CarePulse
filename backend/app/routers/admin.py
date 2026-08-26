from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..cache import cached
from ..database import get_db
from ..models import (Alert, AuditLog, ConsentPreferences, Intervention, Notification,
                      Report, RiskPrediction, Unit, User, WellbeingAssessment)
from ..schemas import UserOut
from ..security import hash_password, get_current_user, require_roles
from .welfare import log_action

router = APIRouter(prefix="/admin", tags=["admin"])
ADMIN = require_roles("administrator")


# ---------------- system analytics ----------------
@router.get("/analytics/overview")
def analytics_overview(days: int = 30, user: User = Depends(ADMIN),
                       db: Session = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    total_users = db.query(func.count(User.id)).scalar()
    active = db.query(func.count(User.id)).filter(User.active.is_(True)).scalar()
    by_role = {r[0]: int(r[1]) for r in db.query(User.role, func.count(User.id)).group_by(User.role).all()}
    assessments = db.query(func.count(WellbeingAssessment.id)).filter(
        WellbeingAssessment.entry_date >= since).scalar()
    predictions = db.query(func.count(RiskPrediction.id)).filter(
        RiskPrediction.created_at >= datetime.combine(since, datetime.min.time())).scalar()
    open_alerts = db.query(func.count(Alert.id)).filter(Alert.status == "open").scalar()
    interventions = {c[0]: int(c[1]) for c in db.query(
        Intervention.status, func.count(Intervention.id)).group_by(Intervention.status).all()}

    daily = (db.query(WellbeingAssessment.entry_date,
                      func.count(WellbeingAssessment.id),
                      func.avg((5 - WellbeingAssessment.feeling) * 25))
             .filter(WellbeingAssessment.entry_date >= since)
             .group_by(WellbeingAssessment.entry_date)
             .order_by(WellbeingAssessment.entry_date.asc()).all())
    trend = [{"date": d.isoformat(), "checkins": int(c), "stress_index": round(float(a or 0), 1)}
             for d, c, a in daily]
    return {
        "window_days": days,
        "users": {"total": total_users, "active": active, "by_role": by_role},
        "assessments_in_window": int(assessments or 0),
        "predictions_in_window": int(predictions or 0),
        "open_alerts": int(open_alerts or 0),
        "interventions_by_status": interventions,
        "daily_activity": trend,
    }


@cached(ttl=60)
@router.get("/analytics/risk-distribution")
def risk_distribution(user: User = Depends(ADMIN), db: Session = Depends(get_db)):
    latest_sq = (db.query(RiskPrediction.user_id,
                          func.max(RiskPrediction.created_at).label("mx"))
                 .group_by(RiskPrediction.user_id).subquery())
    rows = (db.query(RiskPrediction.risk_level, func.count())
            .join(latest_sq, (latest_sq.c.user_id == RiskPrediction.user_id) &
                             (latest_sq.c.mx == RiskPrediction.created_at))
            .join(User, User.id == RiskPrediction.user_id)
            .filter(User.role == "personnel")
            .group_by(RiskPrediction.risk_level).all())
    dist = {r[0]: int(r[1]) for r in rows}
    return {"High": dist.get("High", 0), "Moderate": dist.get("Moderate", 0),
            "Low": dist.get("Low", 0)}


@cached(ttl=60)
@router.get("/analytics/units")
def unit_stats(user: User = Depends(require_roles("administrator", "welfare_officer")),
               db: Session = Depends(get_db)):
    units = db.query(Unit).order_by(Unit.name.asc()).all()
    unit_ids = [u.id for u in units]
    unit_map = {u.id: {"id": u.id, "name": u.name, "code": u.code, "location": u.location,
                       "strength": 0, "high_risk": 0, "avg_workload": 0.0} for u in units}

    member_counts = dict(db.query(User.unit_id, func.count(User.id))
                        .filter(User.unit_id.in_(unit_ids), User.role == "personnel")
                        .group_by(User.unit_id).all())
    for uid, cnt in member_counts.items():
        if uid in unit_map:
            unit_map[uid]["strength"] = int(cnt)

    latest_sq = (db.query(RiskPrediction.user_id, func.max(RiskPrediction.created_at).label("mx"))
                 .group_by(RiskPrediction.user_id).subquery())
    high_counts = (db.query(User.unit_id, func.count())
                   .select_from(RiskPrediction)
                   .join(latest_sq, (latest_sq.c.user_id == RiskPrediction.user_id) &
                                    (latest_sq.c.mx == RiskPrediction.created_at))
                   .join(User, User.id == RiskPrediction.user_id)
                   .filter(RiskPrediction.risk_level == "High", User.unit_id.in_(unit_ids))
                   .group_by(User.unit_id).all())
    for uid, cnt in high_counts:
        if uid in unit_map:
            unit_map[uid]["high_risk"] = int(cnt)

    thirty_days_ago = date.today() - timedelta(days=30)
    avg_wl = dict(db.query(User.unit_id, func.avg(WellbeingAssessment.workload))
                  .join(User, User.id == WellbeingAssessment.user_id)
                  .filter(User.unit_id.in_(unit_ids),
                          WellbeingAssessment.entry_date >= thirty_days_ago)
                  .group_by(User.unit_id).all())
    for uid, avg in avg_wl.items():
        if uid in unit_map:
            unit_map[uid]["avg_workload"] = round(float(avg or 0), 2)

    return {"units": [unit_map[uid] for uid in sorted(unit_map)]}


# ---------------- user management ----------------
@router.get("/users")
def list_users(role: str | None = None, q: str | None = None,
               user: User = Depends(ADMIN), db: Session = Depends(get_db)):
    query = db.query(User).order_by(User.personnel_id.asc())
    if role:
        query = query.filter(User.role == role)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter((User.full_name.ilike(like)) |
                             (User.personnel_id.ilike(like)))
    users = query.limit(300).all()
    return {"items": [{
        "id": u.id, "personnel_id": u.personnel_id, "full_name": u.full_name,
        "role": u.role, "unit": u.unit.name if u.unit else None,
        "designation": u.designation, "email": u.email, "phone": u.phone,
        "active": u.active, "joining_date": u.joining_date.isoformat(),
    } for u in users]}


@router.post("/users", response_model=UserOut)
def create_user(payload: dict, user: User = Depends(ADMIN), db: Session = Depends(get_db)):
    pid = str(payload.get("personnel_id", "")).strip().upper()
    name = str(payload.get("full_name", "")).strip()
    role = payload.get("role", "personnel")
    if not pid or len(pid) < 4:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A valid Personnel ID is required.")
    if not name:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Full name is required.")
    if role not in ("personnel", "welfare_officer", "commander", "administrator"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid role.")
    if db.query(User).filter(User.personnel_id == pid).first():
        raise HTTPException(status.HTTP_409_CONFLICT, f"Personnel ID {pid} already exists.")
    pw_hash, salt = hash_password("demo1234")
    unit = db.query(Unit).filter(Unit.id == payload.get("unit_id")).first() \
        if payload.get("unit_id") else None
    new_user = User(personnel_id=pid, password_hash=pw_hash, salt=salt, full_name=name,
                    role=role, unit=unit,
                    designation=str(payload.get("designation") or "Officer"),
                    joining_date=datetime.utcnow().date(),
                    email=f"{pid.lower()}@demo.example",
                    phone="+91 9000000000")
    db.add(new_user)
    db.flush()
    db.add(ConsentPreferences(user_id=new_user.id))
    log_action(db, user, "Created user account", f"{pid} ({role})")
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/users/{user_id}")
def update_user(user_id: int, payload: dict, admin: User = Depends(ADMIN),
                db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    changes = []
    if "active" in payload and isinstance(payload["active"], bool):
        if target.id == admin.id and not payload["active"]:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot deactivate your own account.")
        target.active = payload["active"]
        changes.append(f"active → {payload['active']}")
    if "role" in payload and payload["role"] in ("personnel", "welfare_officer", "commander", "administrator"):
        target.role = payload["role"]
        changes.append(f"role → {payload['role']}")
    if "unit_id" in payload:
        unit = db.query(Unit).filter(Unit.id == payload["unit_id"]).first()
        target.unit = unit
        changes.append(f"unit → {unit.name if unit else 'none'}")
    log_action(db, admin, "Updated user account", f"{target.personnel_id} ({'; '.join(changes)})")
    db.commit()
    return {"message": f"User {target.personnel_id} updated.", "changes": changes}


@router.post("/users/{user_id}/reset-password")
def reset_password(user_id: int, admin: User = Depends(ADMIN), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    pw_hash, salt = hash_password("demo1234")
    target.password_hash, target.salt = pw_hash, salt
    log_action(db, admin, "Reset password", target.personnel_id)
    db.commit()
    return {"message": f"Password for {target.personnel_id} reset to the demo default."}


# ---------------- audit & notifications ----------------
@router.get("/audit-log")
def admin_audit_log(limit: int = 100, user: User = Depends(ADMIN), db: Session = Depends(get_db)):
    rows = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(min(limit, 300)).all()
    return {"items": [{"timestamp": a.timestamp.isoformat() + "Z", "actor": a.actor_name,
                       "role": a.actor_role, "action": a.action, "resource": a.resource}
                      for a in rows]}


@router.post("/notifications/broadcast")
def broadcast(payload: dict, user: User = Depends(ADMIN), db: Session = Depends(get_db)):
    title = str(payload.get("title", "")).strip()
    body = str(payload.get("body", "")).strip()
    if not title or not body:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Title and body are required.")
    recipients = db.query(User).filter(User.active.is_(True)).all()
    db.add_all([Notification(user_id=r.id, category="system", title=title, body=body,
                             created_at=datetime.utcnow()) for r in recipients])
    log_action(db, user, "Broadcast notification", title[:60])
    db.commit()
    return {"message": f"Notification sent to {len(recipients)} users."}


# ---------------- units management ----------------
@router.get("/units")
def list_units(user: User = Depends(ADMIN), db: Session = Depends(get_db)):
    units = db.query(Unit).order_by(Unit.name.asc()).all()
    return {"items": [{"id": u.id, "name": u.name, "code": u.code, "location": u.location,
                       "strength": u.strength} for u in units]}


@router.post("/units")
def create_unit(payload: dict, user: User = Depends(ADMIN), db: Session = Depends(get_db)):
    name = str(payload.get("name", "")).strip()
    code = str(payload.get("code", "")).strip().upper()
    if not name or not code:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unit name and code are required.")
    if db.query(Unit).filter((Unit.name == name) | (Unit.code == code)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "A unit with that name or code exists.")
    u = Unit(name=name, code=code, location=str(payload.get("location", "")).strip())
    db.add(u)
    log_action(db, user, "Created unit", f"{name} ({code})")
    db.commit()
    return {"message": f"Unit {name} created.", "id": u.id}


@router.put("/units/{unit_id}")
def update_unit(unit_id: int, payload: dict, user: User = Depends(ADMIN),
                db: Session = Depends(get_db)):
    u = db.query(Unit).filter(Unit.id == unit_id).first()
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unit not found.")
    if "location" in payload:
        u.location = str(payload["location"]).strip()
    if "name" in payload and str(payload["name"]).strip():
        u.name = str(payload["name"]).strip()
    log_action(db, user, "Updated unit", u.name)
    db.commit()
    return {"message": f"Unit {u.name} updated."}


# ---------------- system settings ----------------
DEFAULT_SETTINGS = {
    "notifications": {
        "checkin_reminder_days": 7,
        "quiet_hours": "22:00-06:00",
        "channels": ["in_app"],
        "high_risk_notify_officers": True,
        "language": "en",
    },
    "system": {
        "maintenance_mode": False,
        "session_timeout_minutes": 720,
        "data_region": "local-prototype",
    },
}


def _get_setting(db: Session, key: str) -> dict:
    from ..models import SystemSetting
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    base = dict(DEFAULT_SETTINGS.get(key.split(".")[0], {}))
    if row and isinstance(row.value, dict):
        base.update(row.value)
    return base


def _put_setting(db: Session, key: str, value: dict):
    from ..models import SystemSetting
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not row:
        row = SystemSetting(key=key, value=value)
        db.add(row)
    else:
        merged = dict(row.value or {})
        merged.update(value)
        row.value = merged
    row.updated_at = datetime.utcnow()


@router.get("/settings")
def get_settings(section: str | None = None, user: User = Depends(ADMIN), db=Depends(get_db)):
    return {
        "notifications": _get_setting(db, "notifications.settings"),
        "system": _get_setting(db, "system.settings"),
    }


@router.put("/settings")
def put_settings(payload: dict, user: User = Depends(ADMIN), db=Depends(get_db)):
    changed = []
    if isinstance(payload.get("notifications"), dict):
        _put_setting(db, "notifications.settings", payload["notifications"])
        changed.append("notifications")
    if isinstance(payload.get("system"), dict):
        _put_setting(db, "system.settings", payload["system"])
        changed.append("system")
    log_action(db, user, "Updated system settings", ", ".join(changed) or "none")
    db.commit()
    return {"message": f"Settings updated ({', '.join(changed) or 'no changes'}).",
            "notifications": _get_setting(db, "notifications.settings"),
            "system": _get_setting(db, "system.settings")}


@router.get("/model-config")
def get_model_config(user: User = Depends(ADMIN), db=Depends(get_db)):
    from ..ml import get_engine
    eng = get_engine()
    cfg = _get_setting(db, "model.config")
    return {
        "model_version": "rf-prototype-1.0",
        "algorithm": "RandomForestClassifier (220 trees, max_depth 14)",
        "training_records": 24000,
        "features": 9,
        "metrics": eng.metrics,
        "thresholds": {
            "moderate_min": cfg.get("moderate_min", 0.34),
            "high_min": cfg.get("high_min", 0.70),
            "critical_min": cfg.get("critical_min", 0.85),
            "confidence_floor": cfg.get("confidence_floor", 0.60),
        },
        "retrain_available": True,
        "note": ("Prototype model on synthetic data. Threshold changes apply to new "
                 "predictions only."),
    }


@router.put("/model-config")
def put_model_config(payload: dict, user: User = Depends(ADMIN), db=Depends(get_db)):
    th = payload.get("thresholds") or {}
    clean = {}
    for k in ("moderate_min", "high_min", "critical_min", "confidence_floor"):
        if k in th:
            try:
                clean[k] = float(th[k])
            except (TypeError, ValueError):
                pass
    _put_setting(db, "model.config", clean)
    log_action(db, user, "Updated AI model configuration", str(clean))
    db.commit()
    return {"message": "Model configuration saved.", **get_model_config(user, db)}


@router.post("/model/retrain")
def retrain_model(user: User = Depends(ADMIN)):
    from ..ml import get_engine
    metrics = get_engine().train()
    log_action(db, user, "Retrained AI model", "rf-prototype-1.0")
    return {"message": "Model retrained on the synthetic dataset.", "metrics": metrics}


@router.get("/permissions")
def permissions_matrix(user: User = Depends(ADMIN)):
    return {"roles": [
        {"role": "personnel", "permissions": ["own:read", "own:export", "consent:write",
                                              "checkin:create", "assistant:use"]},
        {"role": "welfare_officer", "permissions": ["aggregate:read", "alerts:review",
                                                    "interventions:*", "personnel:welfare-read",
                                                    "reports:read"]},
        {"role": "commander", "permissions": ["aggregate:read", "analytics:read", "insights:read"]},
        {"role": "administrator", "permissions": ["users:*", "units:*", "settings:*",
                                                  "audit:read", "broadcast:*",
                                                  "aggregate:read", "interventions:*"]},
    ]}
