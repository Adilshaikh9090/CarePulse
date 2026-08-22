from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import APP_NAME, CORS_ORIGINS
from .database import Base, engine
from .ml import get_engine
from .routers import admin, ai, auth, general, personnel, welfare
from .services.seeder import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed()
    get_engine().load()
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

for r in (general.router, auth.router, personnel.router, ai.router, welfare.router, admin.router):
    app.include_router(r)
