"""Prototype scoring helpers: 0-100 sub-scores and the CRITICAL escalation rule.

These are heuristic demo indicators derived from the model's class probabilities
and per-factor sensitivity contributions. They are NOT clinically validated and
exist to make triage readable for human welfare reviewers.
"""

CRITICAL_P_HIGH = 0.60
CRITICAL_RISK = 0.85

_DIMENSIONS: dict[str, dict[str, float]] = {
    "stress": {
        "Self-Reported Stress": 1.0, "Workload": 0.55, "Recent Workload Change": 0.35,
        "Duty Hours": 0.35, "Overtime Frequency": 0.25,
    },
    "burnout": {
        "Fatigue": 1.0, "Job Satisfaction": 0.65, "Overtime Frequency": 0.5,
        "Rest Break Quality": 0.35, "Workload": 0.3,
    },
    "fatigue": {
        "Fatigue": 1.0, "Sleep Quality": 0.8, "Duty Hours": 0.55,
        "Rest Break Quality": 0.3,
    },
}


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> int:
    return int(round(max(lo, min(hi, v))))


def compute_sub_scores(p_low: float, p_mod: float, p_high: float,
                       factors: list[dict]) -> dict[str, int]:
    base = 42 * p_mod + 88 * p_high
    inc = {f["name"]: f["impact"] for f in factors if f["direction"] == "increasing"}
    dec = {f["name"]: f["impact"] for f in factors if f["direction"] == "decreasing"}

    scores: dict[str, int] = {}
    for dim, weights in _DIMENSIONS.items():
        push = sum(w * inc.get(label, 0.0) for label, w in weights.items())
        ease = sum(w * dec.get(label, 0.0) for label, w in weights.items())
        raw = base * 0.72 + 95 * push - 40 * ease
        scores[dim] = _clamp(raw)
    return scores


def resolve_level(risk_score: float, p_high: float) -> str:
    """Four-tier welfare indicator: Low | Moderate | High | Critical."""
    if p_high >= CRITICAL_P_HIGH or risk_score >= CRITICAL_RISK:
        return "Critical"
    if p_high >= 0.40 or risk_score >= 0.70:
        return "High"
    if risk_score >= 0.34:
        return "Moderate"
    return "Low"


def severity_for_level(level: str) -> str:
    return {"Critical": "critical", "High": "high", "Moderate": "moderate"}.get(level, "low")
