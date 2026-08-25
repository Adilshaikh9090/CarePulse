from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..ml import get_engine
from ..models import RiskFactor, RiskPrediction, User
from ..schemas import PredictRequest
from ..security import get_current_user, require_roles
from ..services.support_plan import build_support_plan
from .personnel import own_prediction

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/model-info")
def model_info(user: User = Depends(get_current_user)):
    eng = get_engine()
    return {"model_version": "rf-prototype-1.0",
            "algorithm": "RandomForestClassifier (ensemble of decision trees)",
            "trained_on": "Synthetic prototype data — 24,000 generated records",
            "classes": ["Low", "Moderate", "High"],
            "metrics": eng.metrics,
            "explainability": ("Per-factor sensitivity analysis: each feature is probed against a "
                               "neutral baseline to estimate its contribution to the risk indicator."),
            "disclaimer": ("Prototype trained on synthetic data for demonstration only. "
                           "Outputs are supportive welfare indicators, not diagnoses.")}


@router.post("/predict")
def predict(payload: PredictRequest, user: User = Depends(get_current_user)):
    return get_engine().predict(payload.model_dump())


@router.post("/demo-predict")
def demo_predict(payload: PredictRequest, user: User = Depends(get_current_user)):
    """Scenario-driven demo prediction.

    Runs the real model and rule-based support-plan builder but persists NOTHING —
    demo runs never touch risk_predictions, welfare_recommendations or alerts.
    """
    result = get_engine().predict(payload.model_dump())
    result["plan"] = build_support_plan(result["risk_level"], result["top_factors"])
    result["is_demo"] = True
    return result


@router.get("/latest")
def latest(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Latest prediction with factor details (used by the Prediction detail page)."""
    pred = (db.query(RiskPrediction).filter(RiskPrediction.user_id == user.id)
            .order_by(RiskPrediction.created_at.desc()).first())
    if not pred:
        return None
    out = own_prediction(pred)
    out["input_features"] = pred.input_json or {}
    out["timestamp"] = pred.created_at.isoformat() + "Z"
    return out


@router.get("/factors/{prediction_id}")
def factors(prediction_id: int, user: User = Depends(get_current_user),
            db: Session = Depends(get_db)):
    pred = db.query(RiskPrediction).filter(RiskPrediction.id == prediction_id).first()
    if not pred:
        from fastapi import HTTPException, status
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prediction not found.")
    if pred.user_id != user.id and user.role == "personnel":
        from fastapi import HTTPException, status
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted.")
    rows = db.query(RiskFactor).filter(RiskFactor.prediction_id == prediction_id)\
        .order_by(RiskFactor.impact.desc()).all()
    return {"prediction_id": prediction_id,
            "risk_level": pred.risk_level, "risk_score": pred.risk_score,
            "items": [{"name": f.name, "impact": f.impact, "direction": f.direction,
                       "description": f.description} for f in rows],
            "generated_at": datetime.utcnow().isoformat() + "Z"}


@router.get("/analytics/unit-trends")
def unit_trends(days: int = 30, user: User = Depends(require_roles("welfare_officer", "administrator")),
                db: Session = Depends(get_db)):
    from sqlalchemy import func
    from ..models import Unit, WellbeingAssessment
    since = datetime.utcnow().date() - __import__("datetime").timedelta(days=days)
    rows = (db.query(Unit.name,
                     func.avg(WellbeingAssessment.workload),
                     func.avg(WellbeingAssessment.fatigue),
                     func.avg(WellbeingAssessment.sleep_quality),
                     func.count(WellbeingAssessment.id))
            .join(User, User.unit_id == Unit.id)
            .join(WellbeingAssessment, WellbeingAssessment.user_id == User.id)
            .filter(WellbeingAssessment.entry_date >= since)
            .group_by(Unit.name).all())
    return {"window_days": days, "units": [{
        "unit": r[0], "avg_workload": round(float(r[1] or 0), 2),
        "avg_fatigue": round(float(r[2] or 0), 2), "avg_sleep": round(float(r[3] or 0), 2),
        "assessments": int(r[4]),
    } for r in rows]}
