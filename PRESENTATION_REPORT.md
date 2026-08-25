# PersonnelAI — Full Presentation Report (PPT Source Content)

Complete slide-by-slide content for building your pitch deck. Each slide includes:
headline, body content, speaker notes, and a suggested visual from the live app.

---

## SLIDE 1 — Title

**Title:** PersonnelAI
**Subtitle:** AI-Based Predictive Personnel Stress & Welfare Monitoring System
**Tagline:** *"From detecting risk… to helping people take the next step."*

- Footer badges: `React · FastAPI · RandomForest · Privacy-by-Design`
- Team name / institution / hackathon name / date

> **Speaker notes:** One sentence hook: "We built an AI system that notices when a
> person is struggling — before they burn out — and automatically offers them
> supportive next steps, confidentially."

**Visual:** Landing page hero (radar background + glass card).

---

## SLIDE 2 — The Problem

- Burnout and chronic stress are usually detected **too late** — after performance drops or people quit.
- Traditional welfare checks are **periodic, manual, subjective**, and easy to fake ("I'm fine").
- **Stigma** stops honest self-reporting — especially in uniformed/shift-based workforces.
- Welfare teams have **no early-warning signal** and no structured way to offer help.
- Result: preventable attrition, sick leave, low morale, degraded operational readiness.

> **Speaker notes:** Emphasize the gap: organizations collect almost no *continuous,
> low-friction* wellbeing signal, and even when they do, there's no safe process to act on it.

**Visual:** Simple problem graphic (person under pressure / rising curve with no warning sign).

---

## SLIDE 3 — Our Solution

An end-to-end welfare intelligence platform:

1. **Daily micro check-in** — under 2 minutes, 8 simple indicators.
2. **AI risk prediction** — RandomForest model scores each check-in instantly.
3. **Explainable results** — every score shows *which* factors drove it and why.
4. **Automated support plan** — tiered, practical, voluntary actions generated from the top factors.
5. **Officer console** — anonymized early warnings so humans stay in charge.
6. **Confidential by design** — individuals are never exposed; only aggregates travel upward.

> **Speaker notes:** Key framing: "This isn't surveillance. It's an early-warning
> radar plus a support dispatcher — with the person, not the manager, at the center."

**Visual:** 4-step horizontal flow graphic: Check-in → AI Prediction → Contributing Factors → Support Plan.

---

## SLIDE 4 — Feature Overview

| Feature | What it does |
|---|---|
| Daily Check-in | 8 wellbeing indicators + free-text note, once per day |
| AI Risk Prediction | Instant Low / Moderate / High indicator with confidence % |
| Explainability | Ranked contributing factors with impact bars + plain-language narrative |
| Welfare Support Plan | Rule-based tiered recommendations generated from top factors |
| Action Buttons | Mark as Done · Remind Me Later · View Support resources |
| Follow-up Cadence | "Next check-in recommended: 7 days" + one-click Schedule Reminder |
| Scenario Demo Mode | Judges run real model on Low/Moderate/High presets — zero persistence |
| Early Warning Center | Aggregated alerts for welfare officers, severity triage |
| Interventions | Assign officers, track support actions to completion |
| Analytics & Reports | Unit comparisons, risk distribution, exportable reports |
| Consent & Export | Toggle consent, download all personal data anytime |
| AI Assistant | In-app chatbot explaining predictions, privacy, and wellbeing tips |

**Visual:** Screenshot collage (dashboard, prediction page, admin console).

---

## SLIDE 5 — System Architecture

```
┌──────────────────────────────────────────────────────────┐
│  FRONTEND — React 18 + TypeScript + Vite SPA             │
│  Tailwind CSS · framer-motion · Recharts · lucide icons  │
└───────────────┬──────────────────────────────────────────┘
                │ REST (JSON) — typed contracts
┌───────────────▼──────────────────────────────────────────┐
│  BACKEND — FastAPI (Python 3.12, Uvicorn)                │
│  Routers: auth · personnel · ai · welfare · admin        │
│  JWT auth · role guards · Pydantic v2 validation         │
├──────────────────────────────────────────────────────────┤
│  SERVICE LAYER                                           │
│  • ML engine wrapper (predict + explain)                 │
│  • Support-plan rule engine                              │
│  • Notification / audit services                         │
├──────────────────────────────────────────────────────────┤
│  DATA — SQLAlchemy 2 ORM → SQLite                        │
│  users · assessments · predictions · factors ·           │
│  recommendations · alerts · interventions · audit logs   │
└──────────────────────────────────────────────────────────┘
```

> **Speaker notes:** Point out clean separation: the model is swappable behind the
> service layer; frontend never talks to the model directly.

**Visual:** Redraw this diagram with brand colors.

---

## SLIDE 6 — Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18, TypeScript, Vite | Fast dev loop, type-safe contracts |
| Styling | Tailwind CSS v3 (CSS-variable theme tokens) | Dual-theme glassmorphism system |
| Animation | framer-motion v13 | Production-grade motion, reduced-motion aware |
| Charts | Recharts | Declarative, animated analytics |
| Icons | lucide-react | Consistent professional icon set |
| Backend | FastAPI + Pydantic v2 + Uvicorn | Async, auto-documented REST (Swagger) |
| ORM/DB | SQLAlchemy 2.0 (typed) + SQLite | Rapid prototyping, zero-config persistence |
| ML | scikit-learn RandomForestClassifier + NumPy + joblib | Robust tabular baseline, inherently explainable-ish |
| Quality | 38-check smoke test suite | Every endpoint verified after each change |

---

## SLIDE 7 — User Journey (Personnel)

1. **Register / Login** — role-based accounts (validated signup).
2. **Daily check-in** — mood, sleep, fatigue, workload, job satisfaction, duty hours, overtime, break quality (+ optional comment).
3. **Instant prediction** — gauge shows risk level, score %, model confidence.
4. **"Why this result?"** — top-3 factors with animated impact bars.
5. **Welfare Support Plan** — tiered actions appear automatically:
   - Mark as Done ✅ · Remind Me Later 🔔 (2-day snooze) · View Support 🛟
6. **Follow-up** — "Next check-in recommended: 7 days" + Schedule Reminder button.
7. **Recommendations page** — full history filterable by status.

> **Speaker notes:** Stress friction removal: whole loop is <2 minutes/day.

**Visual:** Screenshots of check-in → prediction → support plan.

---

## SLIDE 8 — The AI Model

- **Algorithm:** RandomForestClassifier (ensemble of decision trees)
- **Training data:** 24,000 synthetically generated records (prototype-safe, no real personal data)
- **Inputs (9 features):**
  workload score (1–10), fatigue (1–10), sleep quality (1–5), duty hours (0–24),
  overtime frequency (0–10), job satisfaction (1–10), rest-break quality (1–5),
  self-reported stress (1–10), recent workload change (−3…+3)
- **Risk score:** `risk_score = P(Moderate) + P(High)` from class probabilities
- **Classification thresholds:**
  - **High** — p(High) ≥ 0.40 or risk_score ≥ 0.70
  - **Moderate** — risk_score ≥ 0.34
  - **Low** — otherwise
- **Confidence:** `0.60 + 0.37 × max(class probability)`
- **Validation:** Macro-F1 **0.816 ± 0.005** across 5-fold cross-validation
- **Output also includes:** ranked factor sensitivities + templated narrative + disclaimer

> **Speaker notes:** Why RandomForest: strong tabular baseline, handles non-linear
> interactions, gives us probabilities we can turn into calibrated-feeling scores.

**Visual:** Model card graphic (inputs → forest icon → probabilities → level).

---

## SLIDE 9 — Explainable AI (the trust layer)

- **Per-factor sensitivity analysis:** each feature is individually probed against a
  neutral baseline; the shift in predicted risk = that factor's contribution.
- Contributions are **normalized to impact %** and tagged with direction:
  - ↑ *elevating* (pushing risk up)
  - ↓ *supportive* (protective range)
- **Plain-language narrative** auto-generated, e.g.:
  > "Workload is currently elevating the welfare-risk indicator."
- UI surfaces **top-3 factors** on the dashboard and the **full ranked list** on the prediction page.

> **Speaker notes:** Judges care about black-box concerns — this is our answer.
> Every number on screen has a visible reason behind it.

**Visual:** Prediction page screenshot with factor bars + "Why this result?" card.

---

## SLIDE 10 — Support Plan Engine (rules)

Rule-based layer converts *(risk level × top factor)* → concrete supportive actions:

| Condition | Headline step | Priority |
|---|---|---|
| Risk **High** + top factor **Workload** family* | "Review current workload" | 🔴 High |
| Risk **Moderate** + top factor **Fatigue** | "Encourage adequate rest period" | 🟡 Recommended |
| **Sleep quality** low | Recovery time + sleep/wellness resources | 🟡 / 🔵 |
| **Job satisfaction** low | Optional confidential consultation + feedback channels | 🟡 / 🔵 |
| Risk **Low** | Continue regular wellbeing check-ins | 🔵 Optional |

\* Factor families: Recent Workload Change / Overtime Frequency map to **Workload**;
Duty Hours / Rest Break Quality map to **Fatigue**.

**Every step ships with:**
- 2–3 concrete sub-actions (checklist)
- A timeframe ("Within 2 days")
- Supportive resource content (View Support modal)
- Explicit tone guardrails: *voluntary, confidential, never disciplinary*

**Follow-up logic:** 7-day cadence, next-date computed from last check-in,
idempotent Schedule Reminder → confirmation notification.

**Visual:** Rules table styled as the deck's centerpiece slide.

---

## SLIDE 11 — Demo Mode (judge-friendly)

- Route: `/prediction` → three scenario cards: **Low / Moderate / High** presets
- Presets are hard-coded payloads mapped exactly to the existing model contract
- Click → **animated AI pipeline visualization** (~2.5 s):
  Data validation → Workload analysis → Fatigue analysis → Risk estimation → Recommendation generation ✓
- Reveal: **animated gauge arc** (zone-colored), count-up score, confidence bar,
  factor bars drawing 0→impact with shimmer, tiered action cards
- **Zero persistence** — dedicated `/ai/demo-predict` endpoint runs the real model
  without writing anything to `risk_predictions`, recommendations, or alerts
  (verified: latest-prediction timestamp unchanged after runs)

> **Speaker notes:** This is the 60-second wow path: click a card, watch the
> pipeline animate, land on a fully explained result.

**Visual:** Three screenshots side by side: Low (green gauge) / Moderate (amber) / High (red).

---

## SLIDE 12 — Officer & Admin Console

**Welfare Officers see:**
- **Early Warning Center** — individual-scope alerts with severity counts (high/moderate/low)
- **Alert review workflow** — Confirm Support / No Action / Follow-up
  - Confirming auto-creates an **Intervention**, assigns a welfare officer, sets a due date, and notifies the member ("confidential consultation arranged… fully voluntary")
- **Interventions tracker** — status pipeline: pending → in review → support offered → completed
- **Reports** — aggregated, anonymized statistics + export list

**Administrators additionally get:**
- User management (create/deactivate/reset password)
- Broadcast notifications
- **Audit log** with search — every sensitive action recorded

> **Speaker notes:** "Human-in-the-loop is mandatory: the AI flags, a human decides,
> and every decision is auditable."

**Visual:** Early-warning screenshot + intervention board.

---

## SLIDE 13 — Privacy & Ethics (differentiator slide)

- ✅ **Voluntary** — participation optional; dismiss/snooze any recommendation
- ✅ **Consent controls** — wellbeing check-ins / optional feedback / notifications toggles
- ✅ **Confidentiality** — individual responses never shown to peers or managers; only anonymized aggregates go up
- ✅ **Human review required** — AI output is a supportive indicator, never automatic action against a person
- ✅ **Supportive tone** — wording reviewed to avoid disciplinary framing ("offer", "encourage", "optional")
- ✅ **Data ownership** — one-click full personal-data export (portability/transparency)
- ✅ **Disclaimers everywhere** — "not a medical diagnosis"
- ✅ **Synthetic-only data** in prototype — nothing real leaves the room

> **Speaker notes:** Say it plainly: "We designed the system we'd want used on us."
> This slide wins ethics-heavy judging rubrics.

**Visual:** Shield graphic with these 8 checkmarks.

---

## SLIDE 14 — Design System & UX Craft

- **Glassmorphism UI**: frosted panels, layered shadows, airy blue light theme +
  deep-navy "command center" dark theme (one-click toggle, persisted)
- **Token architecture**: single set of CSS variables drives both themes —
  components written once, themed automatically
- **Motion language** (framer-motion): staggered card reveals, count-up statistics,
  blur-to-sharp entrances, sliding nav pill, route crossfades, animated charts
- **Iconography**: consistent Lucide set throughout
- **Accessibility**: respects OS *reduced-motion*, never color-only signaling
  (text labels always accompany color)

**Visual:** Side-by-side light/dark screenshots.

---

## SLIDE 15 — Engineering Quality

- **Typed end-to-end**: Pydantic schemas ↔ TypeScript interfaces mirror each other
- **38-check automated smoke test** covering auth → check-in → prediction →
  recommendations → alerts → interventions → admin; suite is self-resetting
- **Safe schema evolution**: startup migration adds new columns without data loss
  (used when shipping the support-plan feature onto a populated database)
- **Rule-engine unit verification**: all four canonical scenarios validated
  (High+workload / Moderate+fatigue / Low / mixed factors)
- **Idempotent endpoints**: reminders, notification reads, alert reviews

---

## SLIDE 16 — Impact & Use Cases

- **Who benefits:** defense/uniformed services, healthcare, call centers, any
  shift-based or high-stress workforce
- **Early detection** → support arrives weeks earlier than annual surveys
- **Normalized conversations** — daily check-ins make wellbeing routine, not exceptional
- **Officer efficiency** — triage focus shifts to genuinely flagged cases with context attached
- **Responsible-AI template** — demonstrates explainability + human oversight +
  confidentiality working together in production shape

---

## SLIDE 17 — Roadmap

| Horizon | Item |
|---|---|
| Next | Time-series trend forecasting; unit-level heatmaps over time |
| Next | Multilingual check-ins; progressive web app (mobile-first) |
| Later | Rostering/HR integrations (duty rosters feed fatigue context) |
| Later | Privacy-preserving aggregate benchmarking across units |
| Later | Model upgrades (gradient boosting, calibration, fairness audits) |

---

## SLIDE 18 — Closing

**Line to land:**

> "Most systems detect risk and stop there.
> PersonnelAI detects risk **and helps the person take a supportive next step** —
> explained, voluntary, and confidential."

**Live-demo CTA:** Login → Dashboard → **Try Demo** → click all three scenarios (~90 seconds).

Contact / QR code placeholder.

---
---

# APPENDIX — Quick-reference facts for Q&A

| Question | Answer |
|---|---|
| Model accuracy? | **Macro-F1 = 0.816 ± 0.005** (5-fold cross-validation on the 24k synthetic records — stable across folds) |
| Does demo pollute data? | No — `/ai/demo-predict` persists nothing; verified by timestamp comparison |
| What if user skips days? | Follow-up date anchors to last check-in; reminder nudge fires around day 7 |
| Can officers see individuals? | Only via alert-review workflow with explicit confirmation; dashboards show aggregates |
| Is it diagnosis? | No — explicitly disclaimed; supportive indicator only |
| Scale? | Prototype SQLite; architecture swaps to Postgres via SQLAlchemy URL change |
| Recommendation persistence? | Real check-ins persist tiered recommendations tied to the prediction row |
| Snooze behavior | "Remind Me Later" snoozes the item 2 days (`snoozed_until`) then re-surfaces |

### Numbers worth memorizing
- **24,000** training records · **9** model features · **3** risk classes
- **Macro-F1 0.816 ± 0.005** (5-fold CV) — quote this when asked about accuracy
- **~2 minutes** daily check-in · **7-day** follow-up cadence · **2-day** snooze window
- **38** smoke-test checks · **12+** database tables · **3** user roles
- Demo animation ≈ **2.5 s** across 5 analysis steps
