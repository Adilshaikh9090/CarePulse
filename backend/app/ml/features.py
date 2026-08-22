import numpy as np

MODEL_VERSION = "rf-prototype-1.0"

FEATURE_NAMES = [
    "workload_score", "fatigue_score", "sleep_quality", "duty_hours",
    "overtime_frequency", "job_satisfaction", "rest_break_quality",
    "self_reported_stress", "recent_workload_change",
]

FACTOR_LABELS = {
    "workload_score": "Workload",
    "fatigue_score": "Fatigue",
    "sleep_quality": "Sleep Quality",
    "duty_hours": "Duty Hours",
    "overtime_frequency": "Overtime Frequency",
    "job_satisfaction": "Job Satisfaction",
    "rest_break_quality": "Rest Break Quality",
    "self_reported_stress": "Self-Reported Stress",
    "recent_workload_change": "Recent Workload Change",
}

# +1 → higher value pushes risk up; -1 → lower value pushes risk up.
# Used only to build the synthetic training signal, not for explanations.
RISK_DIRECTION = {
    "workload_score": 1, "fatigue_score": 1, "sleep_quality": -1, "duty_hours": 1,
    "overtime_frequency": 1, "job_satisfaction": -1, "rest_break_quality": -1,
    "self_reported_stress": 1, "recent_workload_change": 1,
}

BOUNDS = {
    "workload_score": (1, 10), "fatigue_score": (1, 10), "sleep_quality": (1, 5),
    "duty_hours": (4, 16), "overtime_frequency": (0, 10), "job_satisfaction": (1, 10),
    "rest_break_quality": (1, 5), "self_reported_stress": (1, 10),
    "recent_workload_change": (-3, 3),
}

NEUTRAL = np.array([6.0, 5.5, 3.0, 9.0, 4.0, 6.5, 3.0, 5.0, 0.0])


def vectorize(payload: dict) -> np.ndarray:
    vals = []
    for i, feat in enumerate(FEATURE_NAMES):
        lo, hi = BOUNDS[feat]
        v = float(payload.get(feat, float(NEUTRAL[i])))
        vals.append(min(max(v, lo), hi))
    return np.array(vals)


def synthetic_training_set(n: int = 24000, seed: int = 42):
    rng = np.random.default_rng(seed)
    workload = rng.normal(6.2, 1.7, n).clip(1, 10)
    fatigue = (workload * 0.55 + rng.normal(2.2, 1.4, n)).clip(1, 10)
    sleep = (5.6 - fatigue * 0.32 + rng.normal(0, 0.7, n)).clip(1, 5)
    duty = (7.4 + workload * 0.45 + rng.normal(0, 1.1, n)).clip(4, 16)
    overtime = (workload * 0.6 + rng.normal(0.8, 1.6, n)).clip(0, 10)
    satisfaction = (11.5 - workload * 0.75 + rng.normal(0, 1.6, n)).clip(1, 10)
    rest = (5.4 - fatigue * 0.28 + rng.normal(0, 0.8, n)).clip(1, 5)
    stress = ((workload + fatigue) * 0.42 + (6.0 - satisfaction) * 0.35 + rng.normal(0, 0.9, n)).clip(1, 10)
    change = rng.choice([-3, -2, -1, 0, 0, 0, 1, 1, 2, 3], n).astype(float)

    X = np.column_stack([workload, fatigue, sleep, duty, overtime, satisfaction, rest, stress, change])

    norm = (X - NEUTRAL) / np.array([3.5, 3.5, 1.5, 3.5, 4.0, 3.5, 1.5, 3.5, 1.5])
    signed = norm * np.array([RISK_DIRECTION[f] for f in FEATURE_NAMES])
    weights = np.array([0.16, 0.18, 0.12, 0.14, 0.08, 0.14, 0.06, 0.16, 0.10])
    latent = signed @ weights + rng.normal(0, 0.10, n)

    y = np.where(latent > 0.55, 2, np.where(latent > 0.15, 1, 0))  # 0 Low | 1 Moderate | 2 High
    return X, y
