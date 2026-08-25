import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECRET_KEY = os.getenv("CAREPULSE_SECRET_KEY", "prototype-only-dev-secret-change-in-production")
TOKEN_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = int(os.getenv("CAREPULSE_TOKEN_MINUTES", "720"))

DATABASE_URL = os.getenv(
    "CAREPULSE_DATABASE_URL",
    f"sqlite:///{os.path.join(BASE_DIR, 'carepulse.db')}",
)

MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
FORCE_RETRAIN = os.getenv("CAREPULSE_FORCE_RETRAIN", "0") == "1"
DEMO_PASSWORD = os.getenv("CAREPULSE_DEMO_PASSWORD", "demo1234")

API_PREFIX = "/api"
CORS_ORIGINS = os.getenv(
    "CAREPULSE_CORS",
    "http://localhost:5173,http://127.0.0.1:5173,https://carepulse-app.netlify.app"
).split(",")
APP_NAME = "PersonnelAI — Predictive Welfare & Stress Monitoring (Prototype)"
DISCLAIMER = (
    "AI-generated welfare indicators are intended to support early intervention and should not be "
    "treated as medical diagnoses or definitive judgments."
)
HUMAN_REVIEW_NOTICE = "Human review is required before welfare action is taken."
FOOTER = ("Prototype for demonstration purposes • Synthetic data • Not an official Government of India system")

SEED_USERS = 500
HISTORY_DAYS = 60
WEEKLY_PREDICTION_WEEKS = 8
