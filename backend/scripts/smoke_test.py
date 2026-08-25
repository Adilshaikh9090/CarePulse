"""End-to-end smoke test for the PersonnelAI backend.

Run from the backend/ directory:
    python scripts/smoke_test.py

Resets the local SQLite DB and model file for a deterministic run, boots the
app in-process (auto-creates tables, seeds ~500 personnel, trains the model),
then exercises every major endpoint group. Exits non-zero on any failure.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import BASE_DIR  # noqa: E402


def _reset() -> None:
    """Wipe data for a deterministic run even if a live server holds the DB file."""
    p = Path(BASE_DIR) / "model.pkl"
    if p.exists():
        p.unlink()
        print("(reset) removed model.pkl")
    import app.models  # noqa: F401  -- must load so Base.metadata knows every table
    from app.database import Base, engine
    Base.metadata.drop_all(bind=engine)
    print("(reset) dropped all tables")


_reset()

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

PASS, FAIL = [], []


def check(name: str, cond: bool, extra: str = ""):
    (PASS if cond else FAIL).append(name)
    print(f"  [{'PASS' if cond else 'FAIL'}] {name}" + (f" — {extra}" if extra else ""))


def main() -> int:
    with TestClient(app) as c:
        print("== general ==")
        r = c.get("/health")
        check("health", r.status_code == 200 and r.json()["model_ready"] is True)

        print("== auth & RBAC ==")
        r = c.post("/auth/login", json={"login_id": "CPF-1001", "password": "wrong-pass"})
        check("login rejects bad password", r.status_code == 401)
        r = c.post("/auth/login", json={"login_id": "CPF-1001", "password": "demo1234"})
        check("personnel login", r.status_code == 200 and r.json()["user"]["role"] == "personnel")
        ptok = {"Authorization": "Bearer " + r.json()["access_token"]}
        r = c.post("/auth/login", json={"login_id": "WELFARE-01", "password": "demo1234"})
        check("welfare login", r.status_code == 200 and r.json()["user"]["role"] == "welfare_officer")
        wtok = {"Authorization": "Bearer " + r.json()["access_token"]}
        r = c.post("/auth/login", json={"login_id": "ADMIN-01", "password": "demo1234"})
        atok = {"Authorization": "Bearer " + r.json()["access_token"]}
        check("admin login", r.status_code == 200)

        r = c.get("/welfare/alerts", headers=ptok)
        check("RBAC blocks personnel from welfare alerts", r.status_code == 403)
        r = c.get("/admin/users", headers=wtok)
        check("RBAC blocks officer from admin users", r.status_code == 403)
        r = c.get("/auth/me", headers=ptok)
        check("auth/me", r.status_code == 200 and r.json()["unit"] is not None)

        print("== personnel ==")
        r = c.get("/personnel/predictions/latest", headers=ptok)
        pred = r.json()
        check("latest prediction exists",
              r.status_code == 200 and pred and pred["risk_level"] in ("Low", "Moderate", "High"))
        check("prediction carries explanation & factors",
              bool(pred["explanation"]) and len(pred["all_factors"]) >= 3)
        r = c.get("/personnel/predictions/history", headers=ptok)
        check("prediction history (8 weeks)", len(r.json()["items"]) == 8)
        r = c.get("/personnel/assessments?days=30", headers=ptok)
        check("assessments list", r.status_code == 200 and r.json()["count"] > 25)
        r = c.post("/personnel/assessments", headers=ptok, json={
            "feeling": 2, "sleep_quality": 2, "fatigue": 4, "workload": 5,
            "job_satisfaction": 2, "duty_hours": 13.5, "overtime": True,
            "rest_breaks": "None", "comment": None})
        check("daily check-in runs fresh prediction",
              r.status_code == 200 and r.json()["prediction"]["risk_level"] in ("Low", "Moderate", "High"))
        r = c.post("/personnel/assessments", headers=ptok, json={
            "feeling": 2, "sleep_quality": 2, "fatigue": 4, "workload": 5,
            "job_satisfaction": 2, "duty_hours": 13.5, "overtime": True,
            "rest_breaks": "None"})
        check("duplicate same-day check-in rejected", r.status_code == 409)
        r = c.post("/personnel/predictions", headers=ptok, json={
            "workload_score": 9, "fatigue_score": 8.5, "sleep_quality": 1.5, "duty_hours": 14,
            "overtime_frequency": 8, "job_satisfaction": 3, "rest_break_quality": 1,
            "self_reported_stress": 8, "recent_workload_change": 3})
        check("what-if prediction (High expected)", r.json()["risk_level"] == "High")
        r = c.post("/personnel/predictions", headers=ptok, json={
            "workload_score": 3, "fatigue_score": 2, "sleep_quality": 4.5, "duty_hours": 8,
            "overtime_frequency": 0, "job_satisfaction": 8.5, "rest_break_quality": 4.5,
            "self_reported_stress": 2, "recent_workload_change": -1})
        check("what-if prediction (Low expected)", r.json()["risk_level"] == "Low")
        r = c.get("/personnel/recommendations", headers=ptok)
        recs = r.json()["items"]
        check("recommendations generated", len(recs) > 0)
        r = c.post(f"/personnel/recommendations/{recs[0]['id']}/action", headers=ptok,
                   json={"action": "accepted"})
        check("recommendation accept", r.status_code == 200)
        r = c.put("/personnel/consent", headers=ptok, json={"notifications_enabled": False})
        r = c.get("/personnel/consent", headers=ptok)
        check("consent update persisted", r.json()["notifications_enabled"] is False)
        r = c.get("/personnel/export-data", headers=ptok)
        check("personal data export", all(k in r.json() for k in
              ("profile", "assessments", "predictions", "recommendations")))
        r = c.post("/personnel/assistant/chat", headers=ptok,
                   json={"messages": [{"role": "user", "content": "tips for better sleep?"}]})
        check("assistant chat", r.status_code == 200 and len(r.json()["reply"]) > 30)

        print("== ai ==")
        r = c.get("/ai/model-info", headers=ptok)
        mi = r.json()
        check("model info + metrics", mi["metrics"]["cv_f1_macro_mean"] > 0.7)
        r = c.get("/ai/latest", headers=ptok)
        check("ai latest includes input features", "input_features" in (r.json() or {}))

        print("== welfare ==")
        r = c.get("/welfare/alerts", headers=wtok)
        alerts = r.json()["items"]
        check("alerts listed with open counts", len(alerts) > 5 and "high" in r.json()["open_counts"])
        open_alert = next(a for a in alerts if a["status"] == "open")
        r = c.post(f"/welfare/alerts/{open_alert['id']}/review", headers=wtok,
                   json={"decision": "confirm_support", "notes": "smoke test"})
        check("alert review creates intervention", r.status_code == 200 and r.json()["intervention_id"])
        iv_id = r.json()["intervention_id"]
        r = c.put(f"/welfare/interventions/{iv_id}", headers=wtok,
                  json={"status": "support_offered", "notes": "contacted member"})
        check("intervention status update", r.status_code == 200)
        r = c.get("/welfare/interventions", headers=wtok)
        check("interventions list", len(r.json()["items"]) >= 40)
        r = c.get("/welfare/reports/list", headers=wtok)
        check("report library", len(r.json()["items"]) >= 6)
        r = c.get("/welfare/reports/overview", headers=wtok)
        o = r.json()
        check("overview aggregates", o["total_personnel"] >= 500 and sum(
            o["current_risk_distribution"].values()) >= 400)

        print("== admin ==")
        r = c.get("/admin/analytics/risk-distribution", headers=atok)
        check("risk distribution", sum(r.json().values()) >= 400)
        r = c.get("/admin/analytics/units", headers=atok)
        check("unit stats", len(r.json()["units"]) == 5)
        r = c.post("/admin/users", headers=atok, json={
            "personnel_id": "CPF-SMOKE", "full_name": "Smoke Tester",
            "role": "personnel", "unit_id": 1})
        check("user create", r.status_code == 200)
        uid = r.json()["id"]
        r = c.post("/admin/users", headers=atok, json={
            "personnel_id": "CPF-SMOKE", "full_name": "Dup", "role": "personnel"})
        check("duplicate personnel id rejected", r.status_code == 409)
        r = c.put(f"/admin/users/{uid}", headers=atok, json={"active": False})
        check("user deactivate", r.status_code == 200)
        r = c.post(f"/admin/users/{uid}/reset-password", headers=atok)
        check("password reset", r.status_code == 200)
        r = c.post("/admin/notifications/broadcast", headers=atok,
                   json={"title": "Smoke", "body": "Broadcast works."})
        check("broadcast", r.json()["message"].startswith("Notification sent to "))
        r = c.get("/admin/audit-log?limit=10", headers=atok)
        check("audit log records actions", len(r.json()["items"]) >= 5)
        r = c.get("/welfare/audit-log/search?q=intervention", headers=atok)
        check("audit search", r.status_code == 200)

    print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
