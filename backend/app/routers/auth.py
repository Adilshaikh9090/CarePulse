from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import LoginRequest, TokenResponse, UserOut
from ..security import ROLE_HOME, create_token, get_current_user, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.personnel_id == payload.login_id.strip().upper()).first()
    if not user or not verify_password(payload.password, user.salt, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                            "Invalid credentials. Please check your Personnel ID and password.")
    if not user.active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated.")
    return TokenResponse(access_token=create_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.get("/home")
def home(user: User = Depends(get_current_user)):
    return {"redirect": ROLE_HOME.get(user.role, "/login")}
