from datetime import datetime, timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ConsentPreferences, Unit, User
from ..schemas import (ForgotPasswordRequest, LoginRequest, RegisterRequest,
                       ResetPasswordRequest, TokenResponse, TwoFactorRequest, UserOut)
from ..security import ROLE_HOME, create_token, get_current_user, hash_password, verify_password
from .welfare import log_action

router = APIRouter(prefix="/auth", tags=["auth"])
DEMO_OTP = "123456"


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    login_id = payload.login_id.strip()
    user = db.query(User).filter(User.personnel_id == login_id.upper()).first()
    if not user and '@' in login_id:
        user = db.query(User).filter(User.email == login_id.lower()).first()
    if not user or not verify_password(payload.password, user.salt, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                            "Invalid credentials. Please check your ID/email and password.")
    if not user.active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated.")
    if user.twofa_enabled and (payload.otp or "").strip() != DEMO_OTP:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                            detail={"code": "2fa_required",
                                    "message": "Two-factor authentication code required."})
    log_action(db, user, "Signed in", f"{user.personnel_id} ({user.role})")
    db.commit()
    return TokenResponse(access_token=create_token(user), user=UserOut.model_validate(user))


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Demo flow: returns the reset token directly (no email service in prototype)."""
    login_id = payload.login_id.strip()
    user = db.query(User).filter(User.personnel_id == login_id.upper()).first()
    if not user and '@' in login_id:
        user = db.query(User).filter(User.email == login_id.lower()).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No account found with that Personnel ID.")
    token = secrets.token_urlsafe(24)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(minutes=30)
    log_action(db, user, "Requested password reset", user.personnel_id)
    db.commit()
    return {"message": "Reset link generated. In production this would be emailed securely.",
            "reset_token": token, "expires_in_minutes": 30}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == payload.token.strip()).first()
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired reset link.")
    pw_hash, salt = hash_password(payload.new_password)
    user.password_hash, user.salt = pw_hash, salt
    user.reset_token = None
    user.reset_token_expires = None
    log_action(db, user, "Completed password reset", user.personnel_id)
    db.commit()
    return {"message": "Password updated. You can now sign in with your new password."}


@router.post("/2fa/setup")
def twofa_setup(payload: TwoFactorRequest, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    user.twofa_enabled = payload.enabled
    log_action(db, user, "Two-factor authentication " + ("enabled" if payload.enabled else "disabled"),
               user.personnel_id)
    db.commit()
    return {
        "enabled": payload.enabled,
        "message": ("Two-factor authentication enabled. Demo verification code is 123456."
                    if payload.enabled else "Two-factor authentication disabled."),
        "demo_code": DEMO_OTP if payload.enabled else None,
    }


@router.get("/2fa/status")
def twofa_status(user: User = Depends(get_current_user)):
    return {"enabled": bool(user.twofa_enabled)}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Self-service registration for new personnel.

    A Personnel ID is assigned automatically; the account is created with the
    'personnel' role only — staff accounts are provisioned by administrators.
    """
    max_num = 1000
    for (pid,) in db.query(User.personnel_id).filter(User.personnel_id.like("CPF-%")).all():
        try:
            max_num = max(max_num, int(pid.split("-")[1]))
        except (IndexError, ValueError):
            continue
    new_pid = f"CPF-{max_num + 1}"

    unit = db.query(Unit).filter(Unit.id == payload.unit_id).first() \
        if payload.unit_id else None
    pw_hash, salt = hash_password(payload.password)
    new_user = User(
        personnel_id=new_pid,
        password_hash=pw_hash,
        salt=salt,
        full_name=payload.full_name.strip(),
        role="personnel",
        unit=unit,
        designation=(payload.designation or "").strip() or "Officer",
        joining_date=datetime.utcnow().date(),
        email=payload.email.strip().lower(),
        phone=(payload.phone or "").strip(),
    )
    db.add(new_user)
    db.flush()
    db.add(ConsentPreferences(user_id=new_user.id))
    log_action(db, new_user, "Self-registered account", f"{new_pid} (personnel)")
    db.commit()
    db.refresh(new_user)
    return TokenResponse(access_token=create_token(new_user), user=UserOut.model_validate(new_user))


@router.get("/units")
def public_units(db: Session = Depends(get_db)):
    """Active duty units for the sign-up form."""
    units = db.query(Unit).order_by(Unit.name.asc()).all()
    return {"items": [{"id": u.id, "name": u.name} for u in units]}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.get("/home")
def home(user: User = Depends(get_current_user)):
    return {"redirect": ROLE_HOME.get(user.role, "/login")}
