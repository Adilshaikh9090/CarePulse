from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    login_id: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=6, max_length=128)
    otp: str | None = Field(default=None, min_length=4, max_length=8)


class ForgotPasswordRequest(BaseModel):
    login_id: str = Field(min_length=3, max_length=40)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=8, max_length=80)
    new_password: str = Field(min_length=8, max_length=128)


class TwoFactorRequest(BaseModel):
    enabled: bool


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=3, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    phone: str | None = Field(default=None, max_length=30)
    designation: str | None = Field(default=None, max_length=80)
    unit_id: int | None = None
    gender: Literal["male", "female"] | None = None
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def name_has_two_parts(cls, v):
        v = v.strip()
        if len(v.split()) < 2:
            raise ValueError("Please provide your full name (first and last name).")
        return v

    @field_validator("email")
    @classmethod
    def basic_email(cls, v):
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Please provide a valid email address.")
        return v


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
    gender: str | None = None

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
    """v2 five-question check-in. Legacy fields stay optional for backward compat.

    Stored semantics: feeling 1..5 where 5 = Very Good; sleep_quality 1..5 where
    5 = Excellent; workload 1..4 (Light..Extremely Heavy); energy_level 1..4
    (1 High .. 4 Very Low); emotional_fatigue 1..5 (1 None .. 5 Very High).
    """
    feeling: int = Field(ge=1, le=5)
    sleep_quality: int = Field(ge=1, le=5)
    energy_level: int | None = Field(default=None, ge=1, le=4)
    workload: int = Field(ge=1, le=5)
    emotional_fatigue: int | None = Field(default=None, ge=1, le=5)
    fatigue: int | None = Field(default=None, ge=1, le=5)
    job_satisfaction: int | None = Field(default=None, ge=1, le=5)
    duty_hours: float | None = Field(default=None, ge=0, le=24)
    overtime: bool | None = None
    rest_breaks: Literal["Adequate", "Limited", "None"] | None = None
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
    biometric_consent: bool | None = None


class AlertStatusUpdate(BaseModel):
    status: Literal["new", "reviewing", "assigned", "resolved"]


class RecommendationAction(BaseModel):
    action: Literal["accepted", "dismissed", "completed", "remind_later"]


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
