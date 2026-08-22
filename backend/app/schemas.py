from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    login_id: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=6, max_length=128)


class UserOut(BaseModel):
    id: int
    personnel_id: str
    full_name: str
    role: str
    unit: str | None = None
    designation: str
    joining_date: date
    email: str
    phone: str

    model_config = {"from_attributes": True}

    @field_validator("unit", mode="before")
    @classmethod
    def unit_to_name(cls, v):
        return getattr(v, "name", v)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class CheckInRequest(BaseModel):
    feeling: int = Field(ge=1, le=5)
    sleep_quality: int = Field(ge=1, le=5)
    fatigue: int = Field(ge=1, le=5)
    workload: int = Field(ge=1, le=5)
    job_satisfaction: int = Field(ge=1, le=5)
    duty_hours: float = Field(ge=0, le=24)
    overtime: bool
    rest_breaks: Literal["Adequate", "Limited", "None"]
    comment: str | None = Field(default=None, max_length=500)

    @field_validator("comment")
    @classmethod
    def clean(cls, v):
        return v.strip() if isinstance(v, str) else v


class PredictRequest(BaseModel):
    workload_score: float = Field(ge=1, le=10)
    fatigue_score: float = Field(ge=1, le=10)
    sleep_quality: float = Field(ge=1, le=5)
    duty_hours: float = Field(ge=0, le=24)
    overtime_frequency: float = Field(ge=0, le=10)
    job_satisfaction: float = Field(ge=1, le=10)
    rest_break_quality: float = Field(ge=1, le=5)
    self_reported_stress: float = Field(ge=1, le=10)
    recent_workload_change: float = Field(ge=-3, le=3)


class ConsentUpdate(BaseModel):
    wellbeing_checkins: bool | None = None
    optional_feedback: bool | None = None
    notifications_enabled: bool | None = None


class RecommendationAction(BaseModel):
    action: Literal["accepted", "dismissed", "completed"]


class AlertReviewRequest(BaseModel):
    decision: Literal["confirm_support", "no_action", "follow_up"]
    assign_officer_id: int | None = None
    notes: str | None = Field(default=None, max_length=1000)


class InterventionCreate(BaseModel):
    alert_id: int | None = None
    subject_user_id: int | None = None
    unit_id: int | None = None
    risk_level: str = "Moderate"
    action: str = Field(min_length=4, max_length=220)
    due_days: int = Field(default=7, ge=1, le=60)


class InterventionUpdate(BaseModel):
    status: Literal["pending", "in_review", "support_offered", "completed"] | None = None
    assigned_officer_id: int | None = None
    notes: str | None = Field(default=None, max_length=1000)


class ProfileUpdate(BaseModel):
    email: str | None = Field(default=None, max_length=160)
    phone: str | None = Field(default=None, max_length=30)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=6, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(max_length=30)
