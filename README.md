# PersonnelAI — Predictive Personnel Stress & Welfare Monitoring

Hackathon **prototype** for an AI-based early-warning welfare monitoring system.
All data is synthetic; predictions are supportive welfare indicators — never diagnoses
or employment judgments.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Recharts + React Router |
| Backend  | FastAPI + SQLAlchemy 2 + JWT auth (PyJWT) |
| ML       | scikit-learn RandomForestClassifier with sensitivity-based factor attribution |
| DB       | SQLite (`backend/carepulse.db`, auto-created) |

## Run it

**Backend** (first run trains the model and seeds ~500 synthetic personnel):

```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Frontend:**

```powershell
cd frontend
npm install
npm run dev          # http://localhost:5173  (proxies /api -> :8000)
```

### Demo accounts (password `demo1234`)

| ID         | Role            | Scenario |
|------------|-----------------|----------|
| `CPF-1001` | Personnel       | Aarav Sharma — crafted rising workload/fatigue trend (Moderate→High flagship scenario) |
| `WELFARE-01` | Welfare Officer | Aggregated analytics, early-warning alerts, interventions, reports |
| `ADMIN-01` | Administrator   | System analytics, user management, audit log |

## Features

**Personnel portal**
- Daily wellbeing check-in (mood, sleep, fatigue, workload, duty hours) → instant AI analysis
- Explainable risk prediction: score gauge, per-factor contribution bars, plain-language narrative, what-if simulator
- Prediction history with trend chart, personalized recommendations (accept/dismiss/complete)
- Wellness hub, consent & privacy toggles, JSON data export, rule-based welfare assistant chat

**Welfare / Admin workspace**
- Command dashboard with anonymized aggregates only
- System analytics: check-in volume, stress index, unit comparisons, role distribution
- Early Warning Center: severity-ranked alerts → confirm support / follow-up / close (human decision required)
- Intervention tracking with status workflow and officer assignment
- Printable overview report, report library
- User management (create/deactivate/reset), immutable audit trail

## ML model contract

9 features (workload, fatigue, sleep quality, duty hours, overtime frequency,
job satisfaction, rest-break quality, self-reported stress, recent workload change)
→ `Low / Moderate / High` + risk score + confidence. Explanations are produced by
probing each feature against a neutral baseline (sensitivity analysis). Trained on
24,000 synthetic records; CV macro-F1 ≈ 0.82.

## Privacy & safety notes

- Role-based access control on every route; personnel can only read their own data
- Consent preferences gate collection; full personal-data export endpoint
- Every welfare action is audit-logged
- Prototype disclaimer surfaces on landing page, predictions, dashboards and footer

> Synthetic data only. Not connected to any real government system.
