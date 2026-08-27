from fastapi import APIRouter

from ..config import APP_NAME

router = APIRouter(tags=["general"])


@router.get("/health")
def health():
    # lightweight liveness probe — deliberately avoids importing/loading the ML
    # engine so keepalive pings and the frontend boot gate stay fast
    return {"status": "ok", "service": f"{APP_NAME} API",
            "model_version": "rf-prototype-1.0", "model_ready": True}


@router.get("/")
def root():
    return {"service": f"{APP_NAME} API", "docs": "/docs"}