from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..ml import get_engine
from ..models import (Alert, ConsentPreferences, Intervention, Notification, RiskFactor,
                      RiskPrediction, User, WelfareRecommendation, WellbeingAssessment)
from ..schemas import (CheckInRequest, ChatRequest, ConsentUpdate, PasswordChange,
                       PredictRequest, ProfileUpdate, RecommendationAction, UserOut)
from ..security import hash_password, verify_password, get_current_user, require_roles
from ..services.synthetic_data import checkin_payload
from ..services.support_plan import build_support_plan
from ..services.templates import REPEAT_REC

router = APIRouter(prefix="/personnel", tags=["personnel"])
OFFICER_OR_ADMIN = require_roles("welfare_officer", "administrator")


def own_prediction(pred: RiskPrediction) -> dict:
    factors = [{"name": f.name, "impact": f.impact, "direction": f.direction,
                "description": f.description} for f in pred.factors]
    return {
        "id": pred.id, "created_at": pred.created_at.isoformat() + "Z",
        "risk_level": pred.risk_level, "risk_score": pred.risk_score,
        "confidence": pred.confidence,
        "sub_scores": {"stress": pred.stress_score or 0, "burnout": pred.burnout_score or 0,
                       "fatigue": pred.fatigue_score or 0},
        "model_version": pred.model_version,
        "top_factors": factors[:3], "all_factors": factors,
        "explanation": pred.explanation or "",
        "recommendations": pred.recommendations or [],
        "disclaimer": ("AI-generated wellness indicator — not a medical diagnosis. "
                       "Human welfare review is required before any intervention."),
    }


def _store_support_plan(db: Session, user: User, pred: RiskPrediction, result: dict) -> None:
    """Persist the rule-based welfare support plan for a fresh prediction."""
    plan = build_support_plan(result["risk_level"], result["top_factors"])
    for prio, step in enumerate(plan, start=1):
        db.add(WelfareRecommendation(
            user_id=user.id, prediction_id=pred.id, priority=prio,
            title=step["title"], reason=step["reason"], timeframe=step["timeframe"],
            tier=step["tier"], category=step.get("category", ""),
            actions=step.get("actions", []),
            support_text="\n".join(step.get("support", {}).get("lines", [])),
            status="pending"))
    db.add(WelfareRecommendation(user_id=user.id, prediction_id=pred.id, priority=len(plan) + 1,
                                 **REPEAT_REC, tier="optional", category="Follow-up"))


def _serialize_rec(r: WelfareRecommendation) -> dict:
    return {
        "id": r.id, "title": r.title, "reason": r.reason, "timeframe": r.timeframe,
        "priority": r.priority, "status": r.status,
        "tier": r.tier or ("recommended" if r.priority <= 2 else "optional"),
        "category": r.category or "",
        "actions": r.actions or [],
        "support_text": r.support_text or "",
        "snoozed_until": r.snoozed_until.isoformat() + "Z" if r.snoozed_until else None,
        "created_at": r.created_at.date().isoformat(),
    }


def _follow_up_info(db: Session, user: User) -> dict:
    """Next check-in guidance: 7-day cadence + reminder state."""
    last = (db.query(WellbeingAssessment).filter(WellbeingAssessment.user_id == user.id)
            .order_by(WellbeingAssessment.entry_date.desc()).first())
    anchor = last.entry_date if last else datetime.utcnow().date()
    next_due = anchor + timedelta(days=7)
    days_until = (next_due - datetime.utcnow().date()).days
    last_created = (db.query(WellbeingAssessment).filter(WellbeingAssessment.user_id == user.id)
                    .order_by(WellbeingAssessment.created_at.desc()).first())
    reminder_set = False
    if last_created is not None:
        reminder_set = bool(
            db.query(Notification)
            .filter(Notification.user_id == user.id,
                    Notification.category == "checkin_reminder",
                    Notification.created_at >= last_created.created_at)
            .first())
    return {
        "cadence_days": 7,
        "last_checkin": last.entry_date.isoformat() if last else None,
        "next_recommended": next_due.isoformat(),
        "days_until": max(days_until, 0),
        "reminder_set": reminder_set,
    }


def _persist_prediction(db: Session, user: User, features: dict, result: dict,
                        created_at: datetime | None = None) -> RiskPrediction:
    sub = result.get("sub_scores", {})
    pred = RiskPrediction(
        user_id=user.id, risk_level=result["risk_level"], risk_score=result["risk_score"],
        confidence=result["confidence"], stress_score=sub.get("stress"),
        burnout_score=sub.get("burnout"), fatigue_score=sub.get("fatigue"),
        model_version=result["model_version"], input_json=features,
        explanation=result["explanation"], recommendations=result["recommendations"],
        created_at=created_at or datetime.utcnow())
    db.add(pred)
    db.flush()
    for prio, f in enumerate(result["top_factors"], start=1):
        db.add(RiskFactor(prediction_id=pred.id, name=f["name"], impact=f["impact"],
                          direction=f["direction"], description=f["description"]))
    return pred


def _maybe_alert(db: Session, user: User, result: dict) -> None:
    if result["risk_level"] in ("High", "Critical"):
        sev = "critical" if result["risk_level"] == "Critical" else "high"
        prefix = "Critical welfare-support need" if sev == "critical" else "High welfare-support need"
        db.add(Alert(code=f"EW-{datetime.utcnow().strftime('%H%M%S%f')[:10]}", scope="individual",
                     unit_id=user.unit_id, subject_user_id=user.id,
                     title=f"{prefix} flagged — {user.personnel_id}",
                     severity=sev, reason_code="high_risk_detected",
                     detected_at=datetime.utcnow(),
                     factors=[f["name"] for f in result["top_factors"]],
                     recommendation=("Priority welfare officer review with appropriate professional "
                                     "support." if sev == "critical" else
                                     "Assign welfare officer for supportive human review."),
                     status="new"))


# ---------------- profile ----------------
@router.get("/profile", response_model=UserOut)
def profile(user: User = Depends(get_current_user)):
    return user


@router.put("/profile", response_model=UserOut)
def update_profile(payload: ProfileUpdate, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    if payload.email is not None:
        user.email = payload.email.strip()
    if payload.phone is not None:
        user.phone = payload.phone.strip()
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password")
def change_password(payload: PasswordChange, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, user.salt, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect.")
    new_hash, new_salt = hash_password(payload.new_password)
    user.password_hash, user.salt = new_hash, new_salt
    db.commit()
    return {"message": "Password updated successfully."}


# ---------------- assessments ----------------
@router.get("/assessments")
def list_assessments(days: int = 30, user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    since = datetime.utcnow().date() - timedelta(days=min(max(days, 7), 90))
    rows = (db.query(WellbeingAssessment)
            .filter(WellbeingAssessment.user_id == user.id,
                    WellbeingAssessment.entry_date >= since)
            .order_by(WellbeingAssessment.entry_date.asc()).all())
    return {
        "items": [{
            "date": r.entry_date.isoformat(), "feeling": r.feeling,
            "sleep_quality": r.sleep_quality, "fatigue": r.fatigue, "workload": r.workload,
            "job_satisfaction": r.job_satisfaction, "duty_hours": r.duty_hours,
            "overtime": r.overtime, "rest_breaks": r.rest_breaks, "comment": r.comment,
        } for r in rows],
        "count": len(rows),
    }


@router.post("/assessments")
def submit_assessment(payload: CheckInRequest, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    existing = (db.query(WellbeingAssessment)
                .filter(WellbeingAssessment.user_id == user.id,
                        WellbeingAssessment.entry_date == today).first())
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            "You have already submitted a check-in today. Please return tomorrow.")
    prev = (db.query(WellbeingAssessment)
            .filter(WellbeingAssessment.user_id == user.id,
                    WellbeingAssessment.entry_date < today)
            .order_by(WellbeingAssessment.entry_date.desc()).first())

    row = WellbeingAssessment(
        user_id=user.id, entry_date=today, feeling=payload.feeling,
        sleep_quality=payload.sleep_quality, fatigue=payload.emotional_fatigue or payload.fatigue or 3,
        workload=payload.workload, job_satisfaction=payload.job_satisfaction or 3,
        duty_hours=payload.duty_hours or 8.0, overtime=bool(payload.overtime),
        rest_breaks=payload.rest_breaks or "Adequate",
        energy_level=payload.energy_level, emotional_fatigue=payload.emotional_fatigue,
        comment=payload.comment or None,
        created_at=datetime.utcnow(),
    )
    db.add(row)

    # run fresh prediction from this check-in (v2 heuristics fill legacy gaps)
    features = checkin_payload({
        "workload": payload.workload, "fatigue": row.fatigue,
        "sleep_quality": payload.sleep_quality, "duty_hours": payload.duty_hours,
        "overtime": payload.overtime, "job_satisfaction": payload.job_satisfaction,
        "rest_breaks": payload.rest_breaks, "feeling": payload.feeling,
        "energy_level": payload.energy_level, "emotional_fatigue": payload.emotional_fatigue,
    }, prev.workload if prev else None)
    result = get_engine().predict(features)
    pred = _persist_prediction(db, user, features, result)
    _store_support_plan(db, user, pred, result)
    db.add(Notification(user_id=user.id, category="system",
                        title="Wellbeing assessment received",
                        body="Thank you. Your latest wellbeing indicators have been recorded securely.",
                        created_at=datetime.utcnow()))
    db.commit()
    return {"message": "Check-in recorded.", "prediction_id": pred.id,
            "prediction": _prediction_with_plan(db, user, pred)}


# ---------------- predictions ----------------
def _prediction_with_plan(db: Session, user: User, pred: RiskPrediction) -> dict:
    """Prediction + its persisted support plan + follow-up guidance."""
    p = own_prediction(pred)
    recs = (db.query(WelfareRecommendation)
            .filter(WelfareRecommendation.prediction_id == pred.id)
            .order_by(WelfareRecommendation.priority.asc()).all())
    p["recommendation_items"] = [_serialize_rec(r) for r in recs]
    p["follow_up"] = _follow_up_info(db, user)
    return p


@router.get("/predictions/latest")
def latest_prediction(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pred = (db.query(RiskPrediction)
            .filter(RiskPrediction.user_id == user.id)
            .order_by(RiskPrediction.created_at.desc()).first())
    if not pred:
        return None
    return _prediction_with_plan(db, user, pred)


@router.get("/predictions/history")
def prediction_history(limit: int = 12, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    rows = (db.query(RiskPrediction)
            .filter(RiskPrediction.user_id == user.id)
            .order_by(RiskPrediction.created_at.desc()).limit(min(limit, 60)).all())
    items = []
    for r in reversed(rows):
        items.append({"id": r.id, "date": r.created_at.strftime("%d %b %Y"),
                      "iso_date": r.created_at.date().isoformat(),
                      "risk_level": r.risk_level, "risk_score": r.risk_score,
                      "confidence": r.confidence})
    counts = {"High": 0, "Moderate": 0, "Low": 0}
    for it in items:
        counts[it["risk_level"]] += 1
    trend_word = "stable"
    if len(items) >= 2:
        a, b = items[-2]["risk_score"], items[-1]["risk_score"]
        trend_word = "rising" if b - a > 0.05 else ("improving" if a - b > 0.05 else "stable")
    return {"items": list(reversed(items)), "counts": counts, "trend": trend_word}


@router.post("/predictions")
def run_prediction(payload: PredictRequest, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    features = payload.model_dump()
    result = get_engine().predict(features)
    pred = _persist_prediction(db, user, features, result)
    _store_support_plan(db, user, pred, result)
    _maybe_alert(db, user, result)
    db.commit()
    return _prediction_with_plan(db, user, pred)


@router.post("/follow-up/reminder")
def schedule_followup_reminder(user: User = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    """Schedule a gentle next-check-in reminder (idempotent per day)."""
    info = _follow_up_info(db, user)
    today = datetime.utcnow().date()
    existing_today = (db.query(Notification)
                      .filter(Notification.user_id == user.id,
                              Notification.category == "checkin_reminder",
                              Notification.created_at >= datetime.combine(today, datetime.min.time()))
                      .first())
    if existing_today:
        return {"message": "Reminder already scheduled.", "next_check_in": info["next_recommended"],
                "reminder_set": True}
    db.add(Notification(
        user_id=user.id, category="checkin_reminder",
        title="Check-in reminder scheduled",
        body=(f"We'll gently remind you to complete your next wellbeing check-in around "
              f"{info['next_recommended']} ({info['cadence_days']}-day cadence). "
              f"Participation remains voluntary."),
        created_at=datetime.utcnow()))
    db.commit()
    return {"message": f"Reminder scheduled — we'll nudge you around {info['next_recommended']}.",
            "next_check_in": info["next_recommended"], "reminder_set": True}


# ---------------- duties & leave ----------------
@router.get("/duties")
def upcoming_duties(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from ..models import DutyRecord
    today = datetime.utcnow().date()
    rows = (db.query(DutyRecord).filter(DutyRecord.user_id == user.id,
                                        DutyRecord.duty_date >= today)
            .order_by(DutyRecord.duty_date.asc()).limit(6).all())
    return {"items": [{"id": d.id, "title": d.title, "date": d.duty_date.isoformat(),
                       "shift": d.shift, "location": d.location} for d in rows]}


@router.get("/leave")
def leave_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from ..models import LeaveRecord
    year = datetime.utcnow().year
    rows = db.query(LeaveRecord).filter(LeaveRecord.user_id == user.id,
                                        LeaveRecord.year == year).all()
    entitlement = {"Annual": 30, "Earned": 15, "Sick": 10, "Casual": 8}
    summary = {}
    for lt, total in entitlement.items():
        used = sum(r.days for r in rows if r.leave_type == lt and r.status == "approved")
        pending = sum(r.days for r in rows if r.leave_type == lt and r.status == "pending")
        summary[lt] = {"entitled": total, "used": used, "pending": pending,
                       "remaining": max(total - used - pending, 0)}
    recent = sorted(rows, key=lambda r: r.start_date, reverse=True)[:5]
    return {"year": year, "summary": summary,
            "recent": [{"id": r.id, "type": r.leave_type, "days": r.days,
                        "start": r.start_date.isoformat(), "end": r.end_date.isoformat(),
                        "status": r.status} for r in recent]}


# ---------------- recommendations / consent / notifications ----------------
@router.get("/recommendations")
def my_recommendations(status: str | None = None, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    q = (db.query(WelfareRecommendation)
         .filter(WelfareRecommendation.user_id == user.id)
         .order_by(WelfareRecommendation.created_at.desc(), WelfareRecommendation.priority.asc()))
    if status:
        q = q.filter(WelfareRecommendation.status == status)
    return {"items": [_serialize_rec(r) for r in q.limit(50).all()]}


@router.post("/recommendations/{rec_id}/action")
def recommendation_action(rec_id: int, payload: RecommendationAction,
                          user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = db.query(WelfareRecommendation).filter(
        WelfareRecommendation.id == rec_id,
        WelfareRecommendation.user_id == user.id).first()
    if not rec:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recommendation not found.")
    if payload.action == "remind_later":
        rec.snoozed_until = datetime.utcnow() + timedelta(days=2)
        message = f"We'll check back about “{rec.title}” in a couple of days."
    else:
        rec.status = payload.action
        rec.snoozed_until = None
        message = f"Marked as {payload.action.replace('_', ' ')}."
    rec.updated_at = datetime.utcnow()
    db.commit()
    return {"message": message, **{k: v for k, v in _serialize_rec(rec).items()
                                   if k in ("status", "snoozed_until")}}


@router.get("/consent")
def get_consent(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(ConsentPreferences).filter(ConsentPreferences.user_id == user.id).first()
    if not c:
        c = ConsentPreferences(user_id=user.id)
        db.add(c)
        db.commit()
        db.refresh(c)
    return {"wellbeing_checkins": c.wellbeing_checkins, "optional_feedback": c.optional_feedback,
            "notifications_enabled": c.notifications_enabled, "updated_at": c.updated_at.isoformat() + "Z"}


@router.put("/consent")
def update_consent(payload: ConsentUpdate, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    c = db.query(ConsentPreferences).filter(ConsentPreferences.user_id == user.id).first()
    if not c:
        c = ConsentPreferences(user_id=user.id)
        db.add(c)
    if payload.wellbeing_checkins is not None:
        c.wellbeing_checkins = payload.wellbeing_checkins
    if payload.optional_feedback is not None:
        c.optional_feedback = payload.optional_feedback
    if payload.notifications_enabled is not None:
        c.notifications_enabled = payload.notifications_enabled
    c.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Consent preferences saved."}


@router.get("/notifications")
def my_notifications(unread_only: bool = False, user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    q = (db.query(Notification).filter(Notification.user_id == user.id)
         .order_by(Notification.created_at.desc()).limit(30))
    if unread_only:
        q = q.filter(Notification.read.is_(False))
    items = [{"id": n.id, "category": n.category, "title": n.title, "body": n.body,
              "read": n.read, "created_at": n.created_at.isoformat() + "Z"} for n in q.all()]
    unread = db.query(func.count(Notification.id)).filter(
        Notification.user_id == user.id, Notification.read.is_(False)).scalar()
    return {"items": items, "unread_count": unread}


@router.post("/notifications/{notif_id}/read")
def mark_notification(notif_id: int, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notif_id,
                                      Notification.user_id == user.id).first()
    if not n:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found.")
    n.read = True
    db.commit()
    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == user.id,
                                  Notification.read.is_(False)).update({"read": True})
    db.commit()
    return {"ok": True}


# ---------------- assistant & export ----------------
@router.post("/assistant/chat")
def assistant_chat(payload: ChatRequest, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    last = payload.messages[-1].content.lower()
    pred = (db.query(RiskPrediction).filter(RiskPrediction.user_id == user.id)
            .order_by(RiskPrediction.created_at.desc()).first())
    level = pred.risk_level if pred else "unknown"
    topics = {
        ("sleep",): "A consistent sleep routine supports recovery: aim for regular sleep and wake times, and avoid screens close to bedtime. Your welfare officer can share the unit's rest-guidance resource.",
        ("stress", "anx"): "Short breathing exercises (4-7-8 breathing) and brief walks are effective first steps. If stress persists, an optional confidential welfare consultation is available to you.",
        ("break", "rest"): "Protected break windows matter. Try scheduling short breaks between task blocks, and flag repeated missed breaks through your next check-in.",
        ("workload", "overtime"): "If your workload feels consistently heavy, mention it in your weekly check-in — trends feed early-warning reviews that can trigger workload rebalancing.",
        ("recommendation", "suggest"): "Open the Recommendations page to see personalized, supportive actions ranked by priority. You can accept or dismiss each one.",
        ("predict", "score", "risk"): f"Your most recent welfare-risk indicator is {level}. It reflects aggregated wellbeing signals only — it is never a diagnosis and never shared with peers.",
        ("confidential", "private", "data"): "Your individual responses stay confidential by design. Supervisors see anonymized aggregates; named alerts require dual authorization under prototype policy.",
        ("help", "hello", "hi"): "I can explain predictions, summarize recommendations, suggest rest strategies, or clarify data-privacy rules. What would you like to know?",
    }
    reply = None
    for keys, text in topics.items():
        if any(k in last for k in keys):
            reply = text
            break
    if reply is None:
        reply = ("I can help with wellbeing questions — sleep, stress, workload, breaks, "
                 "your risk indicator, recommendations, or privacy. Try asking about one of those.")
    if pred and pred.risk_level == "High":
        reply += " Also, given your current indicator, consider reaching out for a confidential consultation soon."
    return {"reply": reply, "disclaimer": "Guidance only — not medical advice."}


@router.get("/export-data")
def export_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    assessments = (db.query(WellbeingAssessment)
                   .filter(WellbeingAssessment.user_id == user.id)
                   .order_by(WellbeingAssessment.entry_date.asc()).all())
    preds = (db.query(RiskPrediction).filter(RiskPrediction.user_id == user.id)
             .order_by(RiskPrediction.created_at.asc()).all())
    recs = (db.query(WelfareRecommendation).filter(WelfareRecommendation.user_id == user.id).all())
    interventions = db.query(Intervention).filter(Intervention.subject_user_id == user.id).all()
    return {
        "profile": {"personnel_id": user.personnel_id, "full_name": user.full_name,
                    "role": user.role, "unit": user.unit.name if user.unit else None,
                    "designation": user.designation},
        "assessments": [{c.name: getattr(r, c.name) for c in WellbeingAssessment.__table__.columns
                         if c.name != "user_id"} for r in assessments],
        "predictions": [{"date": p.created_at.isoformat(), "risk_level": p.risk_level,
                         "risk_score": p.risk_score, "confidence": p.confidence} for p in preds],
        "recommendations": [{"title": r.title, "status": r.status,
                             "created_at": r.created_at.date().isoformat()} for r in recs],
        "interventions": [{"action": i.action, "status": i.status,
                           "officer": i.officer_name} for i in interventions],
        "exported_at": datetime.utcnow().isoformat() + "Z",
    }
