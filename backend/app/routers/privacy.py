from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (AuditLog, ConsentPreferences, RiskPrediction, User,
                      WellbeingAssessment, WelfareRecommendation)
from ..security import get_current_user

router = APIRouter(prefix="/privacy", tags=["privacy"])

WHAT_WHO = [
    {"item": "Daily wellness check-in answers", "why": "To compute a personal welfare-risk "
     "indicator and offer supportive actions.", "who": "You. Officers see only anonymized "
     "aggregates; named access requires the alert-review workflow and is audit-logged."},
    {"item": "AI risk indicator & contributing factors", "why": "Explainable early warning so "
     "support can arrive before problems escalate.", "who": "You always; welfare officers via "
     "authorized review only."},
    {"item": "Welfare recommendations & their status", "why": "To track voluntary support steps.",
     "who": "You; officers see intervention status they are assigned to."},
    {"item": "Interventions you are part of", "why": "Coordination of voluntary welfare support.",
     "who": "Assigned welfare officer and administrators, under least-privilege access."},
    {"item": "Consent preferences & privacy settings", "why": "To honor your choices.",
     "who": "You and system administrators for compliance."},
]

RBAC_MATRIX = [
    {"role": "Personnel", "access": "Own wellness information only — scores, explanations, "
     "recommendations, consents, data export.", "individual_data": False},
    {"role": "Welfare Officer", "access": "Authorized welfare information for assigned personnel: "
     "anonymized dashboards, alert-driven reviews, interventions.", "individual_data": True},
    {"role": "Commander", "access": "Aggregated organizational trends only — no individual rows.",
     "individual_data": False},
    {"role": "Administrator", "access": "System configuration, user administration, audit logs. "
     "No routine access to individual wellness content.", "individual_data": True},
]


@router.get("/overview")
def overview(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    consent = db.query(ConsentPreferences).filter(ConsentPreferences.user_id == user.id).first()
    my_assessments = db.query(func.count(WellbeingAssessment.id)).filter(
        WellbeingAssessment.user_id == user.id).scalar()
    my_predictions = db.query(func.count(RiskPrediction.id)).filter(
        RiskPrediction.user_id == user.id).scalar()
    my_recs = db.query(func.count(WelfareRecommendation.id)).filter(
        WelfareRecommendation.user_id == user.id).scalar()
    accesses = (db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(12).all())

    return {
        "what_why_who": WHAT_WHO,
        "rbac_matrix": RBAC_MATRIX,
        "my_data_counts": {"checkins": int(my_assessments or 0),
                           "predictions": int(my_predictions or 0),
                           "recommendations": int(my_recs or 0)},
        "encryption": {
            "transit": "TLS 1.3 enforced in production deployment (HTTPS/WSS)",
            "at_rest": "AES-256 at rest in production target; prototype stores local SQLite",
            "passwords": "PBKDF2-HMAC-SHA256, 120,000 iterations, per-user salt",
            "tokens": "Signed JWT sessions with expiry; revocation on password change path",
        },
        "retention": [
            {"data": "Wellness check-ins", "retention": "24 months, then aggregated & deleted"},
            {"data": "Risk predictions", "retention": "24 months"},
            {"data": "Intervention records", "retention": "36 months (welfare case file)"},
            {"data": "Audit logs", "retention": "36 months"},
            {"data": "Biometric streams (if ever consented)", "retention": "90 days raw, then aggregates"},
        ],
        "consent": {
            "wellbeing_checkins": bool(consent.wellbeing_checkins) if consent else True,
            "optional_feedback": bool(consent.optional_feedback) if consent else True,
            "notifications_enabled": bool(consent.notifications_enabled) if consent else True,
            "biometric_consent": bool(consent.biometric_consent) if consent else False,
        },
        "biometrics": {
            "enabled_by_default": False,
            "status": "disabled",
            "metrics": ["Heart rate", "Sleep duration", "Activity level", "HRV"],
            "notice": ("Optional — only available with user authorization and applicable "
                       "legal/organizational approval."),
        },
        "access_history": [{"timestamp": a.timestamp.isoformat() + "Z", "actor": a.actor_name,
                            "role": a.actor_role, "action": a.action, "resource": a.resource}
                           for a in accesses],
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }
