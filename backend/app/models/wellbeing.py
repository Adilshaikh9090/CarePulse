from datetime import date, datetime
from sqlalchemy import String, Integer, Float, Boolean, Date, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class WellbeingAssessment(Base):
    __tablename__ = "wellbeing_assessments"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    entry_date: Mapped[date] = mapped_column(Date, index=True)
    feeling: Mapped[int] = mapped_column(Integer)          # self-reported mood 1..5
    sleep_quality: Mapped[int] = mapped_column(Integer)     # 1..5
    fatigue: Mapped[int] = mapped_column(Integer)           # 1..5
    workload: Mapped[int] = mapped_column(Integer)          # 1..5
    job_satisfaction: Mapped[int] = mapped_column(Integer)  # 1..5
    duty_hours: Mapped[float] = mapped_column(Float)
    overtime: Mapped[bool] = mapped_column(Boolean, default=False)
    rest_breaks: Mapped[str] = mapped_column(String(20), default="Adequate")  # Adequate|Limited|None
    energy_level: Mapped[int | None] = mapped_column(Integer, nullable=True)        # 1 High · 2 Normal · 3 Low · 4 Very Low
    emotional_fatigue: Mapped[int | None] = mapped_column(Integer, nullable=True)   # 1 None .. 5 Very High
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RiskPrediction(Base):
    __tablename__ = "risk_predictions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    risk_level: Mapped[str] = mapped_column(String(12))   # Low | Moderate | High | Critical
    risk_score: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)
    stress_score: Mapped[int | None] = mapped_column(Integer, nullable=True)    # 0-100 prototype indicator
    burnout_score: Mapped[int | None] = mapped_column(Integer, nullable=True)   # 0-100
    fatigue_score: Mapped[int | None] = mapped_column(Integer, nullable=True)   # 0-100
    model_version: Mapped[str] = mapped_column(String(40), default="rf-prototype-1.0")
    input_json: Mapped[dict] = mapped_column(JSON, default=dict)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendations: Mapped[list | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="completed")  # completed | reviewed

    factors: Mapped[list["RiskFactor"]] = relationship(back_populates="prediction", cascade="all, delete-orphan")


class RiskFactor(Base):
    __tablename__ = "risk_factors"
    id: Mapped[int] = mapped_column(primary_key=True)
    prediction_id: Mapped[int] = mapped_column(ForeignKey("risk_predictions.id"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    impact: Mapped[float] = mapped_column(Float)
    direction: Mapped[str] = mapped_column(String(16), default="increasing")  # increasing|decreasing
    description: Mapped[str] = mapped_column(Text, default="")

    prediction: Mapped[RiskPrediction] = relationship(back_populates="factors")
