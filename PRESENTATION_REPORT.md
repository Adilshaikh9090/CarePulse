# PersonnelAI — Presentation Report

## Project Title
**PersonnelAI — AI-Based Predictive Personnel Stress & Welfare Monitoring System**

---

## 1. Problem Statement

Personnel welfare monitoring in large organizations (defense, healthcare, paramilitary) is typically **reactive** — welfare issues are addressed only after a crisis occurs. There is no systematic, data-driven early-warning mechanism to detect stress, burnout, or fatigue before they escalate.

**Key Challenges:**
- Welfare data is scattered across paper records, inconsistent check-ins
- No predictive capability — decisions are reactive, not preventive
- Privacy concerns prevent transparent welfare monitoring
- Welfare officers lack aggregated, real-time workforce health visibility

---

## 2. Proposed Solution

PersonnelAI is an **AI-powered predictive welfare monitoring platform** that:

1. Collects voluntary daily wellbeing check-ins from personnel
2. Uses a **Random Forest ML model** to predict welfare-risk levels (Low / Moderate / High / Critical)
3. Generates **explainable AI predictions** — showing *why* a risk was flagged
4. Provides an **early-warning center** for welfare officers to intervene proactively
5. Maintains full **privacy controls** — anonymization, consent management, audit trails

---

## 3. Architecture

```
┌──────────────────────────────────────────────────┐
│                  FRONTEND (React 18)              │
│          Vite + TypeScript + TailwindCSS          │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Personnel │ │  Welfare  │ │   Administrator  │  │
│  │  Portal   │ │  Officer  │ │    Dashboard     │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
└────────────────────┬─────────────────────────────┘
                     │ REST API (JSON)
┌────────────────────┴─────────────────────────────┐
│                  BACKEND (FastAPI)                 │
│              Python 3.12 + Uvicorn                │
│                                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐ │
│  │ Auth │ │Person│ │  AI  │ │Welfar│ │ Admin  │ │
│  │      │ │nel   │ │Engine│ │e     │ │        │ │
│  └──────┘ └──────┘ └──────┘ └──────┘ └────────┘ │
│                                                   │
│  ┌──────────────────────────────────────────────┐ │
│  │  ML: RandomForest (220 trees, 9 features)   │ │
│  │  Synthetic training: 24,000 records          │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────┴─────────────────────────────┐
│              DATABASE (SQLite + SQLAlchemy)        │
│          17 tables · 67,897 rows of data          │
└──────────────────────────────────────────────────┘
```

---

## 4. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | SPA with type safety |
| **Build** | Vite 6 | Fast dev/build |
| **Styling** | TailwindCSS 3.4 | Responsive UI, dark/light themes |
| **Charts** | Recharts | Data visualization |
| **Animations** | Framer Motion | Smooth transitions |
| **Backend** | FastAPI (Python) | High-performance async API |
| **ORM** | SQLAlchemy 2 | Database abstraction |
| **Auth** | JWT + 2FA | Secure authentication |
| **ML** | scikit-learn (RandomForest) | Risk prediction |
| **Database** | SQLite | Lightweight, portable |
| **Deployment** | Render (backend) + Netlify (frontend) | 24/7 hosting |

---

## 5. Key Features

### 5.1 Daily Wellbeing Check-In
- 10-question voluntary questionnaire (feeling, sleep, fatigue, workload, etc.)
- Submits in < 2 seconds
- Triggers ML prediction automatically

### 5.2 AI Risk Prediction
- **Algorithm:** RandomForestClassifier (220 trees, max_depth=14)
- **9 features:** workload, fatigue, sleep quality, duty hours, overtime, job satisfaction, rest quality, stress, workload change
- **3 output classes:** Low / Moderate / High (+ Critical escalation rule)
- **Explainability:** Each prediction shows top contributing factors with impact scores
- **Confidence score** displayed per prediction

### 5.3 What-If Simulator
- Personnel can adjust their own inputs to see how changes would affect their risk score
- Demonstrates the model's behavior transparently

### 5.4 Early Warning Center
- Real-time alerts for High/Critical risk personnel
- Severity-based color coding
- Alert review workflow (confirm / follow-up / no action)

### 5.5 Welfare Officer Dashboard
- Aggregated anonymized risk distribution across all personnel
- Unit-by-unit comparison charts
- Individual welfare profiles (with audit logging)

### 5.6 Administrator Panel
- User management (CRUD operations)
- System settings and model configuration
- Full audit log of all access
- Role-based access control (4 roles)

### 5.7 Privacy & Consent
- GDPR-like data export
- Granular consent preferences (check-ins, feedback, notifications, biometric)
- Anonymization by default — named access requires justification and is logged
- RBAC matrix enforcement

### 5.8 Welfare Assistant Chat
- Rule-based conversational guidance
- Topics: sleep, stress, workload, breaks, prediction explanations
- Always framed as supportive guidance, never prescriptive

---

## 6. Database Design

**17 tables** with **67,897 rows** of synthetic data:

| Table | Rows | Purpose |
|-------|------|---------|
| wellbeing_assessments | 30,005 | Daily check-in responses |
| risk_factors | 12,021 | AI explanation factors |
| welfare_recommendations | 5,723 | Personalized suggestions |
| risk_predictions | 4,007 | ML prediction results |
| duty_records | 2,510 | Duty roster |
| leave_records | 1,385 | Leave balances |
| deployment_records | 1,028 | Deployment history |
| users | 515 | Personnel + officers |
| audit_logs | 114 | Access audit trail |
| interventions | 40 | Welfare interventions |
| alerts | 14 | Early warning alerts |

---

## 7. API Endpoints

**72 REST API endpoints** across 8 routers:

| Router | Endpoints | Purpose |
|--------|-----------|---------|
| Auth | 9 | Login, register, 2FA, password reset |
| Personnel | 20 | Check-ins, predictions, profile, recommendations |
| AI | 6 | Model info, prediction, demo, analytics |
| Welfare | 14 | Alerts, interventions, reports, command view |
| Admin | 18 | User management, settings, model config, audit |
| Analytics | 2 | Summary analytics, insights |
| Privacy | 1 | Privacy overview |
| General | 2 | Health check, service info |

---

## 8. Frontend Pages

**27 page components** with responsive design (mobile + desktop):

| Section | Pages |
|---------|-------|
| Public | Landing, Login, Register |
| Personnel | Dashboard, Check-In, AI Prediction, AI Analytics, History, Recommendations, Wellness Hub, Settings |
| Officer | Command Dashboard, Personnel Table, Personnel Detail |
| Admin | Admin Dashboard, Org Analytics, Early Warning, Alert Review, Interventions, Reports, User Management, System Settings, Audit Log |
| Shared | Notification Center, Privacy Center |

---

## 9. Machine Learning Model

### Model Specifications
- **Algorithm:** RandomForestClassifier
- **Estimators:** 220 trees
- **Max depth:** 14
- **Min samples per leaf:** 6
- **Class balancing:** Automatic (balanced weights)
- **Training data:** 24,000 synthetic records
- **Cross-validation:** 3-fold stratified

### Feature Engineering (9 features)
| # | Feature | Source | Range |
|---|---------|--------|-------|
| 1 | Workload score | Check-in workload + duty hours + overtime | 0–10 |
| 2 | Fatigue score | Energy level + rest breaks + duty hours | 0–10 |
| 3 | Sleep quality | Check-in sleep rating | 1–5 |
| 4 | Duty hours | Direct from check-in | 4–16 |
| 5 | Overtime frequency | Check-in overtime field | 0–7/week |
| 6 | Job satisfaction | Check-in satisfaction rating | 1–5 |
| 7 | Rest break quality | Computed from rest_breaks + energy | 0–10 |
| 8 | Self-reported stress | Feeling + emotional fatigue | 0–10 |
| 9 | Recent workload change | Delta vs 7-day average | -3 to +3 |

### Risk Level Logic
- **Low:** Model confidence < 40% for High
- **Moderate:** Model indicates moderate risk
- **High:** Model confidence ≥ 40% for High OR score ≥ 0.70
- **Critical:** Model confidence ≥ 60% for High OR score ≥ 0.85

---

## 10. Security Features

| Feature | Implementation |
|---------|---------------|
| Authentication | JWT tokens with expiry |
| Password hashing | PBKDF2 with random salt |
| Two-Factor Auth | TOTP-based 2FA (Google Authenticator compatible) |
| Role-Based Access | 4 roles with fine-grained permissions |
| Audit Logging | Every data access is logged with actor, action, timestamp |
| CORS | Restricted to known origins |
| Named Access Control | Viewing identifiable data requires justification + is logged |
| Consent Management | Granular opt-in/opt-out per data type |

---

## 11. Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Netlify | https://carepulse-app.netlify.app |
| Backend | Render | https://carepulse-66bx.onrender.com |
| Source Code | GitHub | https://github.com/Adilshaikh9090/CarePulse |

**Infrastructure:**
- GitHub Actions: Backend keepalive ping every 10 minutes (prevents cold start)
- CORS configured for both localhost (dev) and Netlify (production)
- Runtime config injection for API URL (no rebuild needed)

---

## 12. Project Statistics

| Metric | Value |
|--------|-------|
| Total source files | 82 |
| Lines of code | ~10,439 |
| Frontend files | 52 (React + TypeScript) |
| Backend files | 30 (Python) |
| API endpoints | 72 |
| Database tables | 17 |
| Database rows | 67,897 |
| Frontend routes | ~30 |
| ML features | 9 |
| Seed users | 500 |
| Response time (cached) | < 0.3s |

---

## 13. Demo Flow (Recommended)

### Step 1: Landing Page
Open https://carepulse-app.netlify.app — Show the professional landing page with aurora background animation.

### Step 2: Login
Click "Admin Demo" → Login with **ADMIN-01** / **demo1234**

### Step 3: Admin Dashboard
Show the command overview — risk distribution pie chart, stat cards, quick links.

### Step 4: Personnel Table
Navigate to Personnel Register — show the card-based mobile view and full table on desktop. Highlight anonymous vs named view toggle.

### Step 5: Org Analytics
Show unit-level comparison bar chart and risk distribution.

### Step 6: Early Warning
Show the alert center — how High/Critical risks trigger alerts for officer review.

### Step 7: Interventions
Show how welfare officers create and track interventions.

### Step 8: User Management
Show user CRUD operations, role assignment.

### Step 9: Audit Log
Show the complete access audit trail — every action is logged.

### Step 10: Dark/Light Mode
Toggle the theme to show both modes work perfectly.

### Step 11: Mobile View
Resize the browser to show responsive mobile layout with bottom navigation.

---

## 14. Key Differentiators

1. **Explainable AI** — Not just a risk score; shows *why* with factor-level impact
2. **Privacy-First** — Anonymization by default, consent management, GDPR-like export
3. **Voluntary & Supportive** — Every interaction is framed as support, never punitive
4. **Full Audit Trail** — Every data access is logged for accountability
5. **What-If Simulator** — Personnel can explore how lifestyle changes affect their risk
6. **Real-Time Early Warning** — Proactive alerts before crisis occurs
7. **Mobile-First** — Fully responsive with bottom navigation for field use

---

## 15. Limitations & Future Work

| Limitation | Future Enhancement |
|-----------|-------------------|
| SQLite (single file) | PostgreSQL for production scale |
| Synthetic data only | Integration with real HR systems |
| Rule-based chat assistant | LLM-powered conversational AI |
| No real-time push notifications | WebSocket-based real-time alerts |
| Single ML model | Ensemble of models (stress, burnout, fatigue separately) |
| No video/media support | Multimedia check-ins (voice, video) |

---

## 16. Conclusion

PersonnelAI demonstrates how **AI and data-driven approaches** can transform personnel welfare from a reactive to a **proactive, predictive** system. By combining explainable machine learning with strong privacy controls and a modern, responsive interface, the platform provides welfare officers and administrators with the tools they need to **detect early warning signs and intervene before problems escalate**.

**All predictions are supportive indicators — never diagnoses or employment decisions.**
