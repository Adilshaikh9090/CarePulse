from fastapi import APIRouter, Depends

from ..ml import get_engine
from ..security import get_current_user

router = APIRouter(tags=["general"])


@router.get("/health")
def health():
    eng = get_engine()
    return {"status": "ok", "service": "PersonnelAI API",
            "model_version": "rf-prototype-1.0",
            "model_ready": eng.model is not None}


@router.get("/")
def root():
    return {"service": "PersonnelAI API", "docs": "/docs"}
