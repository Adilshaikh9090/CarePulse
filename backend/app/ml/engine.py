import os

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

from ..config import FORCE_RETRAIN, MODEL_PATH
from .features import FACTOR_LABELS, FEATURE_NAMES, NEUTRAL, synthetic_training_set, vectorize


class WelfareRiskEngine:
    """Prototype RandomForest welfare-risk model with sensitivity-based explanations.

    Trained/evaluated on fully synthetic data. Outputs are supportive welfare-risk
    indicators for human review — never medical diagnoses or employment judgments.
    """

    def __init__(self):
        self.model: RandomForestClassifier | None = None
        self.metrics: dict = {}

    def train(self) -> dict:
        X, y = synthetic_training_set()
        clf = RandomForestClassifier(
            n_estimators=220, max_depth=14, min_samples_leaf=6,
            class_weight="balanced", random_state=42, n_jobs=-1,
        )
        scores = cross_val_score(clf, X, y, cv=3, scoring="f1_macro")
        clf.fit(X, y)
        self.model = clf
        self.metrics = {
            "cv_f1_macro_mean": round(float(scores.mean()), 3),
            "cv_f1_macro_std": round(float(scores.std()), 3),
        }
        joblib.dump({"model": clf, "metrics": self.metrics, "version": "rf-prototype-1.0"}, MODEL_PATH)
        return self.metrics

    def load(self):
        if os.path.exists(MODEL_PATH) and not FORCE_RETRAIN:
            blob = joblib.load(MODEL_PATH)
            if blob.get("version") == "rf-prototype-1.0":
                self.model = blob["model"]
                self.metrics = blob.get("metrics", {})
        if self.model is None:
            self.train()
        return self

    # ---------------- single prediction ----------------
    def predict(self, payload: dict) -> dict:
        x = vectorize(payload)
        p = self.model.predict_proba(x.reshape(1, -1))[0]
        p_low, p_mod, p_high = float(p[0]), float(p[1]), float(p[2])

        risk_score = round(p_mod + p_high, 4)
        if p_high >= 0.40 or risk_score >= 0.70:
            level = "High"
        elif risk_score >= 0.34:
            level = "Moderate"
        else:
            level = "Low"

        confidence = round(0.60 + 0.37 * max(p_low, p_mod, p_high), 3)
        factors = self._explain_one(x)
        return {
            "risk_level": level,
            "risk_score": risk_score,
            "confidence": confidence,
            "model_version": "rf-prototype-1.0",
            "top_factors": factors[:3],
            "all_factors": factors,
            "explanation": self._narrative(level, factors),
            "recommendations": self._recommendations(level, factors),
            "disclaimer": ("This prediction is an AI-generated welfare indicator and is not a medical "
                           "diagnosis. Human review by authorized welfare personnel is required before any action."),
        }

    def _explain_one(self, x: np.ndarray) -> list[dict]:
        base_p = float(self.model.predict_proba(NEUTRAL.reshape(1, -1))[0][1:].sum())
        contributions = []
        for i, feat in enumerate(FEATURE_NAMES):
            probe = NEUTRAL.copy()
            probe[i] = x[i]
            p_i = float(self.model.predict_proba(probe.reshape(1, -1))[0][1:].sum())
            contributions.append({"feat": feat, "delta": p_i - base_p})
        total = sum(abs(c["delta"]) for c in contributions) or 1e-6
        out = []
        for c in contributions:
            label = FACTOR_LABELS[c["feat"]]
            direction = "increasing" if c["delta"] >= 0 else "decreasing"
            phrase = (f"{label} is currently elevating the welfare-risk indicator."
                      if direction == "increasing" else
                      f"{label} is in a supportive range and lowering the indicator.")
            out.append({"name": label, "impact": round(abs(c["delta"]) / total, 3),
                        "direction": direction, "description": phrase})
        out.sort(key=lambda r: r["impact"], reverse=True)
        return out

    def _narrative(self, level: str, factors: list[dict]) -> str:
        rising = [f for f in factors if f["direction"] == "increasing"][:3]
        supportive = [f for f in factors if f["direction"] == "decreasing"][:1]
        if not rising:
            return (f"The current welfare-risk indicator is {level.lower()}. Key wellbeing "
                    f"indicators appear within a comfortable range at this time.")
        names = ", ".join(f["name"].lower() for f in rising[:-1])
        names = names + f" and {rising[-1]['name'].lower()}" if names else rising[-1]["name"].lower()
        text = f"The current welfare-risk indicator is primarily associated with elevated {names}. "
        if supportive:
            text += f"{supportive[0]['name']} remains a supportive factor at this time. "
        if level == "High":
            text += "Several indicators have risen together, suggesting a timely need for supportive human review."
        elif level == "Moderate":
            text += "Early attention to these areas could prevent further escalation of the indicator."
        else:
            text += "Overall wellbeing appears stable; routine monitoring continues."
        return text

    def _recommendations(self, level: str, factors: list[dict]) -> list[str]:
        recs, names = [], {f["name"] for f in factors[:4]}
        if "Workload" in names:
            recs.append("Review current workload distribution and consider task prioritization")
        if names & {"Fatigue", "Sleep Quality", "Rest Break Quality"}:
            recs.append("Encourage adequate rest period and protected break time")
        if names & {"Duty Hours", "Overtime Frequency"}:
            recs.append("Review duty roster to reduce extended duty hours where feasible")
        if names & {"Job Satisfaction", "Self-Reported Stress"}:
            recs.append("Offer optional confidential welfare consultation")
        if level in ("Moderate", "High"):
            recs.append("Repeat wellbeing assessment in 7 days to track the trend")
        return recs or ["Continue routine weekly wellbeing check-ins"]

    # ---------------- bulk (seeding) ----------------
    def predict_batch(self, payloads: list[dict]) -> list[dict]:
        n = len(payloads)
        X = np.vstack([vectorize(p) for p in payloads])
        proba = self.model.predict_proba(X)

        k = len(FEATURE_NAMES)
        probes = np.tile(NEUTRAL, (n * k, 1))
        for i in range(n):
            for j in range(k):
                probes[i * k + j][j] = X[i][j]
        pp = self.model.predict_proba(probes)[:, 1:].sum(axis=1).reshape(n, k)
        base_p = proba[:, 1:].sum(axis=1)
        deltas = pp - base_p[:, None]
        totals = np.abs(deltas).sum(axis=1)
        totals[totals == 0] = 1e-6

        results = []
        for i in range(n):
            p_low, p_mod, p_high = (float(proba[i][0]), float(proba[i][1]), float(proba[i][2]))
            risk_score = round(p_mod + p_high, 4)
            if p_high >= 0.40 or risk_score >= 0.70:
                level = "High"
            elif risk_score >= 0.34:
                level = "Moderate"
            else:
                level = "Low"
            factors = []
            for j, feat in enumerate(FEATURE_NAMES):
                label = FACTOR_LABELS[feat]
                direction = "increasing" if deltas[i][j] >= 0 else "decreasing"
                factors.append({
                    "name": label, "impact": round(float(abs(deltas[i][j]) / totals[i]), 3),
                    "direction": direction,
                    "description": (f"{label} is currently elevating the welfare-risk indicator."
                                    if direction == "increasing" else
                                    f"{label} is in a supportive range and lowering the indicator."),
                })
            factors.sort(key=lambda r: r["impact"], reverse=True)
            results.append({
                "risk_level": level, "risk_score": risk_score,
                "confidence": round(0.60 + 0.37 * max(p_low, p_mod, p_high), 3),
                "top_factors": factors[:3], "all_factors": factors,
                "explanation": self._narrative(level, factors[:5]),
                "recommendations": self._recommendations(level, factors[:5]),
            })
        return results


_engine: WelfareRiskEngine | None = None


def get_engine() -> WelfareRiskEngine:
    global _engine
    if _engine is None:
        _engine = WelfareRiskEngine().load()
    return _engine
