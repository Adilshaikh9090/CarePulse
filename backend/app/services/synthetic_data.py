import random
from datetime import date, timedelta

import numpy as np

FIRST_NAMES = ["Aarav", "Aditya", "Akash", "Amit", "Ananya", "Anil", "Anjali", "Arjun", "Bhavna", "Deepak",
               "Divya", "Gaurav", "Isha", "Karthik", "Kavya", "Kiran", "Manish", "Meera", "Neha", "Nikhil",
               "Pooja", "Prateek", "Rahul", "Rajesh", "Rakesh", "Riya", "Rohan", "Sanya", "Shreya", "Siddharth",
               "Sneha", "Sunil", "Tanvi", "Uday", "Varun", "Vikas", "Vikram", "Yash", "Priya", "Mohit"]
LAST_NAMES = ["Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Gupta", "Mehta", "Joshi", "Desai",
              "Kulkarni", "Menon", "Chauhan", "Rathore", "Bose", "Das", "Kapoor", "Malhotra", "Pillai", "Rao"]
DESIGNATIONS = ["Field Operations Officer", "Patrol Officer", "Communications Officer", "Technical Officer",
                "Logistics Officer", "Desk Officer", "Admin Support Officer"]
UNITS = [("Unit Alpha", "ALP", "North Sector Campus"), ("Unit Bravo", "BRV", "Central Command Complex"),
         ("Unit Charlie", "CHR", "Riverside Facility"), ("Unit Delta", "DLT", "Highland Post"),
         ("Unit Echo", "ECH", "Coastal Division HQ")]
DEMO_PERSONNEL_ID = "CPF-1001"
COMMENTS = ["Long shift this week.", "Duty roster feels tight lately.", "Feeling okay overall.",
            "Extra overtime assigned.", "Rest breaks were shorter than usual.", "", "", ""]
BREAK_MAP = {"Adequate": 4.0, "Limited": 2.5, "None": 1.0}
WORKLOAD_SCORE_MAP = {1: 2.0, 2: 5.0, 3: 7.5, 4: 10.0, 5: 10.0}


def clip(v, lo, hi):
    return max(lo, min(hi, v))


def generate_personnel(count: int, units: list, start_index: int = 2):
    """Return list of profile dicts (fictional personnel baselines)."""
    rng = random.Random(42)
    people = []
    used_names: set[str] = set()
    for i in range(start_index, start_index + count):
        while True:
            name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
            if name not in used_names:
                used_names.add(name)
                break
        people.append({
            "personnel_id": f"CPF-{1000 + i}",
            "full_name": name,
            "unit": rng.choice(units),
            "designation": rng.choice(DESIGNATIONS),
            "joining_year": rng.randint(2014, 2025),
            "email": f"cpf{1000 + i}@demo.example",
            "phone": f"+91 9{rng.randint(100000000, 999999999)}",
            "baseline": {
                "wl": rng.gauss(2.95, 0.65), "ft": rng.gauss(2.5, 0.6),
                "slp": rng.gauss(3.2, 0.7), "sat": rng.gauss(3.2, 0.65),
                "duty": rng.gauss(9.3, 0.9), "ot": clip(rng.gauss(0.35, 0.18), 0.05, 0.85),
                "trend": rng.choice([0.0] * 7 + [0.02] * 2 + [-0.016] * 1),
            },
        })
    return people


def build_history(profile: dict, user_id: int, today: date, days: int, is_demo: bool = False):
    """Generate one daily assessment row-dict per day. Demo user gets a crafted
    two-week workload/fatigue rise so the flagship Moderate-risk scenario exists."""
    b = profile["baseline"] if profile else {"wl": 2.9, "ft": 2.6, "slp": 3.1, "sat": 3.3,
                                             "duty": 9.3, "ot": 0.45, "trend": 0.0}
    rnd = random.Random(hash(profile["personnel_id"]) % (2**32)) if profile else random.Random(7)
    rows = {}
    for t in range(days):
        # history ends *yesterday* so today's live check-in slot stays open
        day = today - timedelta(days=days - t)
        wave = np.sin(2 * np.pi * t / 7 + rnd.uniform(-0.4, 0.4))
        n = lambda s=0.55: rnd.gauss(0, s)
        wl = b["wl"] + b["trend"] * t + wave * 0.35 + n()
        ft = b["ft"] + b["trend"] * t * 0.8 + wave * 0.3 + n()
        slp = b["slp"] - b["trend"] * t * 6 - wave * 0.25 + n(0.45)
        sat = b["sat"] - b["trend"] * t * 8 + n(0.5)
        duty = b["duty"] + b["trend"] * t * 22 + wave * 0.3 + n(0.5)
        stress = (wl * 0.55 + ft * 0.5 - sat * 0.28) / 1.6 + n(0.4)

        if is_demo and t >= days - 14:
            k = (t - (days - 15)) / 14.0
            wl += 2.5 * k
            ft += 2.3 * k
            duty += 2.3 * k
            slp -= 1.2 * k
            sat -= 1.7 * k
            stress += 2.2 * k
            ot_today = rnd.random() < max(b["ot"], 0.75)
        else:
            ot_today = rnd.random() < b["ot"]

        wl_i, ft_i = int(round(clip(wl, 1, 5))), int(round(clip(ft, 1, 5)))
        slp_i, sat_i = int(round(clip(slp, 1, 5))), int(round(clip(sat, 1, 5)))
        feel_i = int(round(clip(5.6 - stress * 0.85, 1, 5)))
        rest_q = slp_i + (1 if not ot_today else 0)
        breaks = "Adequate" if rest_q >= 4 else ("Limited" if rest_q >= 2 else "None")
        rows[t] = {
            "user_id": user_id, "entry_date": day, "feeling": feel_i,
            "sleep_quality": slp_i, "fatigue": ft_i, "workload": wl_i,
            "job_satisfaction": sat_i, "duty_hours": round(clip(duty, 6, 15), 1),
            "overtime": ot_today, "rest_breaks": breaks,
            "comment": rnd.choice(COMMENTS) if rnd.random() < 0.08 else None,
        }
    return rows


def week_payload(rows: list[dict]) -> dict:
    """Aggregate a block of daily rows into the 9 ML feature values."""
    n = len(rows)
    wls = [r["workload"] for r in rows]
    slope = (wls[-1] - wls[0]) / max(n - 1, 1)
    return {
        "workload_score": round(float(np.mean([r["workload"] for r in rows])) * 2, 2),
        "fatigue_score": round(float(np.mean([r["fatigue"] for r in rows])) * 2, 2),
        "sleep_quality": round(float(np.mean([r["sleep_quality"] for r in rows])), 2),
        "duty_hours": round(float(np.mean([r["duty_hours"] for r in rows])), 2),
        "overtime_frequency": round(sum(1 for r in rows if r["overtime"]) / n * 10, 2),
        "job_satisfaction": round(float(np.mean([r["job_satisfaction"] for r in rows])) * 2, 2),
        "rest_break_quality": round(float(np.mean([BREAK_MAP[r["rest_breaks"]] for r in rows])), 2),
        "self_reported_stress": round(float(np.mean([(6 - r["feeling"]) for r in rows])) * 2, 2),
        "recent_workload_change": float(clip(round(slope * n), -3, 3)),
    }


def checkin_payload(row: dict, prev_workload: int | None) -> dict:
    """Map a single check-in to the 9 ML feature values.

    Accepts both the classic 8-field payload and the v2 five-question payload.
    Missing legacy fields are filled with documented demo heuristics so the ML
    contract stays unchanged.
    """
    feeling = row["feeling"]                                   # 1 Very Stressed .. 5 Very Good (stored semantic)
    sleep_q = row["sleep_quality"]
    workload = row["workload"]
    fatigue = row.get("emotional_fatigue") or row.get("fatigue") or 3
    energy = row.get("energy_level") or 2                      # 1 High .. 4 Very Low

    duty_hours = row.get("duty_hours")
    if duty_hours is None:
        duty_hours = clip(7.0 + workload * 1.35 + (1.4 if energy >= 3 else 0), 6, 15)

    overtime = row.get("overtime")
    if overtime is None:
        overtime = workload >= 4 or duty_hours >= 12 or energy == 4

    job_sat = row.get("job_satisfaction")
    if job_sat is None:
        job_sat = int(round(clip(feeling * 0.75 + (5 - energy) * 0.55, 1, 5)))

    breaks = row.get("rest_breaks")
    if breaks is None:
        if sleep_q >= 4 and workload <= 3:
            breaks = "Adequate"
        elif sleep_q <= 2 or workload >= 5 or (workload >= 4 and energy >= 3):
            breaks = "None"
        else:
            breaks = "Limited"

    slope = (workload - prev_workload) if prev_workload is not None else 0
    return {
        "workload_score": WORKLOAD_SCORE_MAP.get(workload, workload * 2.0),
        "fatigue_score": fatigue * 2,
        "sleep_quality": float(sleep_q),
        "duty_hours": float(duty_hours),
        "overtime_frequency": 10.0 if overtime else 3.0,
        "job_satisfaction": job_sat * 2,
        "rest_break_quality": BREAK_MAP.get(breaks, 3.0),
        "self_reported_stress": (6 - feeling) * 2,
        "recent_workload_change": float(clip(slope, -3, 3)),
    }
