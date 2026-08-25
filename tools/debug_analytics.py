import sys
sys.path.insert(0, "C:/CarePulse/backend")
from app.database import get_db, engine
from app.models import *
from sqlalchemy.orm import Session
from datetime import date, timedelta

db = Session(bind=engine)
today = date.today()
since = today - timedelta(days=30)

assessments = db.query(
    WellbeingAssessment.entry_date, WellbeingAssessment.feeling,
    WellbeingAssessment.fatigue, WellbeingAssessment.sleep_quality,
    WellbeingAssessment.workload, User.unit_id
).join(User, User.id == WellbeingAssessment.user_id
).filter(User.role == "personnel",
         WellbeingAssessment.entry_date >= since).all()

print(f"assessments: {len(assessments)}")

units = db.query(Unit).order_by(Unit.name.asc()).all()
print(f"units: {[u.name for u in units]}")

# Check heatmap generation
def _stress_index(feeling):
    return (5 - feeling) * 25.0

by_cell = {}
for r in assessments:
    key = (r[5] or 0, r[0])
    by_cell.setdefault(key, []).append(_stress_index(r[1]))
print(f"by_cell keys: {len(by_cell)}")

grid_days = min(30, 21)
heat_days = [today - timedelta(days=i) for i in range(grid_days - 1, -1, -1)]
heatmap = []
for u in units:
    row = {"unit": u.name.replace("Unit ", ""), "values": []}
    for d in heat_days:
        vals = by_cell.get((u.id, d))
        row["values"].append(round(sum(vals) / len(vals), 1) if vals else None)
    heatmap.append(row)
print(f"heatmap rows: {len(heatmap)}")

# Check risk predictions
from app.models import RiskPrediction
from sqlalchemy import func
wk_start = today - timedelta(weeks=11)
preds = db.query(RiskPrediction.burnout_score, RiskPrediction.stress_score,
                  RiskPrediction.fatigue_score, RiskPrediction.created_at,
                  RiskPrediction.risk_level).filter(
    RiskPrediction.created_at >= datetime.combine(wk_start, datetime.min.time()) if hasattr(date, 'combine') else True
).all()
print(f"preds: {len(preds)}")

# Check leave records
leaves = db.query(LeaveRecord.days, LeaveRecord.leave_type).filter(
    LeaveRecord.status == "approved", LeaveRecord.year == today.year).all()
print(f"leaves: {len(leaves)}")

# Check interventions
from app.models import Intervention
ivs = db.query(Intervention).all()
print(f"interventions: {len(ivs)}")

# Check deployments
deps = db.query(DeploymentRecord.deployment_type, DeploymentRecord.intensity,
                DeploymentRecord.user_id).filter(DeploymentRecord.status == "active").all()
print(f"deployments: {len(deps)}")

print("ALL OK")
db.close()
