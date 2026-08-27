from fastapi import APIRouter, Depends

from ..ml import get_engine

router = APIRouter(tags=["general"])


@router.get("/health")
def health():
    eng = get_engine()
    # do not force-load the model; report readiness lazily so /api/health stays fast
    return {"status": "ok", "service": "PersonnelAI API",
            "model_version": "rf-prototype-1.0",
            "model_ready": eng.model is not None}


@router.get("/")
def root():
    return {"service": "PersonnelAI API", "docs": "/docs"}