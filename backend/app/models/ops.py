from datetime import date
from sqlalchemy import String, Integer, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class DeploymentRecord(Base):
    __tablename__ = "deployment_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id"), nullable=True)
    location: Mapped[str] = mapped_column(String(120), default="")
    deployment_type: Mapped[str] = mapped_column(String(40), default="Field")  # Field|Border|Peacekeeping|Training|Desk
    intensity: Mapped[str] = mapped_column(String(12), default="medium")       # low|medium|high
    started_on: Mapped[date] = mapped_column(Date)
    ended_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="active")          # active|completed


class LeaveRecord(Base):
    __tablename__ = "leave_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    leave_type: Mapped[str] = mapped_column(String(30))                        # Annual|Sick|Casual|Earned
    days: Mapped[int] = mapped_column(Integer)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(16), default="approved")        # pending|approved|rejected
    year: Mapped[int] = mapped_column(Integer)


class DutyRecord(Base):
    __tablename__ = "duty_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    duty_date: Mapped[date] = mapped_column(Date, index=True)
    shift: Mapped[str] = mapped_column(String(20), default="Morning")          # Morning|Afternoon|Night|Rest Day
    location: Mapped[str] = mapped_column(String(120), default="")
