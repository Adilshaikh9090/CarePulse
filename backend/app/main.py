from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from .config import APP_NAME, CORS_ORIGINS
from .database import Base, engine
from .routers import admin, ai, analytics, auth, general, personnel, privacy, welfare
from .services.seeder import ensure_v2_seed, seed


def _migrate_sqlite() -> None:
    """Prototype-grade column migration: add missing columns to existing tables."""
    expected = {
        "welfare_recommendations": {
            "tier": "VARCHAR(16)",
            "category": "VARCHAR(40)",
            "actions": "JSON",
            "support_text": "TEXT",
            "snoozed_until": "DATETIME",
            "updated_at": "DATETIME",
        },
        "users": {
            "twofa_enabled": "BOOLEAN DEFAULT 0",
            "reset_token": "VARCHAR(80)",
            "reset_token_expires": "DATETIME",
        },
        "wellbeing_assessments": {
            "energy_level": "INTEGER",
            "emotional_fatigue": "INTEGER",
        },
        "risk_predictions": {
            "stress_score": "INTEGER",
            "burnout_score": "INTEGER",
            "fatigue_score": "INTEGER",
        },
        "alerts": {
            "reason_code": "VARCHAR(48) DEFAULT 'risk_detected'",
            "assigned_officer_id": "INTEGER",
            "assigned_officer_name": "VARCHAR(120) DEFAULT ''",
            "reviewed_at": "DATETIME",
            "reviewed_by": "VARCHAR(120) DEFAULT ''",
        },
        "consent_preferences": {
            "biometric_consent": "BOOLEAN DEFAULT 0",
        },
    }
    insp = inspect(engine)
    for table, cols in expected.items():
        if not insp.has_table(table):
            continue
        present = {c["name"] for c in insp.get_columns(table)}
        with engine.begin() as conn:
            for name, ddl in cols.items():
                if name not in present:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate_sqlite()
    seed()
    ensure_v2_seed()
    yield


app = FastAPI(
    title=f"{APP_NAME} API",
    version="1.0.0",
    description=("Prototype backend for an AI-based predictive personnel stress & welfare "
                 "monitoring system. All data is synthetic; predictions are supportive "
                 "welfare indicators — never diagnoses."),
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

for r in (general.router, auth.router, personnel.router, ai.router, welfare.router,
          analytics.router, privacy.router, admin.router):
    app.include_router(r, prefix="/api")
