from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String(30), default="system")
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text, default="")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    actor_id: Mapped[int | None] = mapped_column(nullable=True)
    actor_name: Mapped[str] = mapped_column(String(120), default="")
    actor_role: Mapped[str] = mapped_column(String(30), default="")
    action: Mapped[str] = mapped_column(String(160))
    resource: Mapped[str] = mapped_column(String(160), default="")
    result: Mapped[str] = mapped_column(String(20), default="Successful")


class ConsentPreferences(Base):
    __tablename__ = "consent_preferences"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    wellbeing_checkins: Mapped[bool] = mapped_column(Boolean, default=True)
    optional_feedback: Mapped[bool] = mapped_column(Boolean, default=True)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(180))
    category: Mapped[str] = mapped_column(String(80))
    period: Mapped[str] = mapped_column(String(60))
    generated_by: Mapped[str] = mapped_column(String(120), default="System")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(20), default="ready")
    meta_json: Mapped[dict] = mapped_column(JSON, default=dict)


def audit(db, actor, action: str, resource: str = "", result: str = "Successful"):
    db.add(AuditLog(actor_id=getattr(actor, "id", None), actor_name=getattr(actor, "full_name", "System"),
                    actor_role=getattr(actor, "role", "system"), action=action, resource=resource,
                    result=result))
