from datetime import date, datetime
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class WelfareRecommendation(Base):
    __tablename__ = "welfare_recommendations"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    prediction_id: Mapped[int | None] = mapped_column(ForeignKey("risk_predictions.id"), nullable=True)
    priority: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(160))
    reason: Mapped[str] = mapped_column(Text, default="")
    timeframe: Mapped[str] = mapped_column(String(60), default="Within 7 days")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|accepted|dismissed|completed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    # support-plan extensions
    tier: Mapped[str | None] = mapped_column(String(16), default="recommended")  # high|recommended|optional
    category: Mapped[str | None] = mapped_column(String(40), default="")
    actions: Mapped[list | None] = mapped_column(JSON, default=list)
    support_text: Mapped[str | None] = mapped_column(Text, default="")
    snoozed_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(16), unique=True)
    scope: Mapped[str] = mapped_column(String(16), default="unit")  # unit|individual
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id"), nullable=True)
    subject_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    severity: Mapped[str] = mapped_column(String(12))  # low|moderate|high|critical
    reason_code: Mapped[str] = mapped_column(String(48), default="risk_detected")
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    factors: Mapped[list] = mapped_column(JSON, default=list)
    recommendation: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="new")  # new|reviewing|assigned|resolved|closed_no_action
    assigned_officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    assigned_officer_name: Mapped[str] = mapped_column(String(120), default="")
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewed_by: Mapped[str] = mapped_column(String(120), default="")


class Intervention(Base):
    __tablename__ = "interventions"
    id: Mapped[int] = mapped_column(primary_key=True)
    alert_id: Mapped[int | None] = mapped_column(ForeignKey("alerts.id"), nullable=True)
    subject_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id"), nullable=True)
    subject_label: Mapped[str] = mapped_column(String(120), default="")
    risk_level: Mapped[str] = mapped_column(String(12))
    action: Mapped[str] = mapped_column(String(220))
    assigned_officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    officer_name: Mapped[str] = mapped_column(String(120), default="Unassigned")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="pending")  # pending|in_review|support_offered|completed
    notes: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
