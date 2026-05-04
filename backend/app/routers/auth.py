from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])
PASSWORD_MIN_LENGTH = 8
COMMON_WEAK_PASSWORDS = {
    "password",
    "password123",
    "12345678",
    "qwerty123",
    "admin123",
}


def _normalize(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _find_user_by_username(db: Session, username: str) -> User | None:
    normalized = username.lower()
    return db.query(User).filter(func.lower(User.username) == normalized).first()


def _validate_password_strength(password: str, username: str) -> None:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at least {PASSWORD_MIN_LENGTH} characters long",
        )
    if any(ch.isspace() for ch in password):
        raise HTTPException(status_code=400, detail="Password must not contain whitespace")
    if not any(ch.islower() for ch in password):
        raise HTTPException(status_code=400, detail="Password must include a lowercase letter")
    if not any(ch.isupper() for ch in password):
        raise HTTPException(status_code=400, detail="Password must include an uppercase letter")
    if not any(ch.isdigit() for ch in password):
        raise HTTPException(status_code=400, detail="Password must include a number")
    if not any(not ch.isalnum() for ch in password):
        raise HTTPException(status_code=400, detail="Password must include a special character")

    lowered_password = password.lower()
    if lowered_password in COMMON_WEAK_PASSWORDS:
        raise HTTPException(status_code=400, detail="Password is too common")
    if username.lower() in lowered_password:
        raise HTTPException(status_code=400, detail="Password must not contain your username")


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=128)
    role: Literal["technician", "admin", "viewer"] = "technician"
    phone: str | None = Field(default=None, max_length=32)
    security_question: str | None = Field(default=None, max_length=160)
    security_answer: str | None = Field(default=None, max_length=160)


class PasswordResetQuestionResponse(BaseModel):
    security_question: str

class PasswordResetRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    security_answer: str = Field(min_length=1, max_length=160)
    new_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=128)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account (technician by default)."""
    username = _normalize(body.username)
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    if _find_user_by_username(db, username):
        raise HTTPException(status_code=400, detail="Username already taken")

    _validate_password_strength(body.password, username)

    security_question = _normalize(body.security_question)
    security_answer = _normalize(body.security_answer)

    if (security_question and not security_answer) or (security_answer and not security_question):
        raise HTTPException(
            status_code=400,
            detail="Security question and answer must both be provided",
        )

    user = User(
        username=username,
        hashed_password=hash_password(body.password),
        role=body.role,
        phone=_normalize(body.phone),
        security_question=security_question,
        security_answer_hash=hash_password(security_answer) if security_answer else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.to_dict()

@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    normalized_username = _normalize(form.username)
    if not normalized_username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    user = _find_user_by_username(db, normalized_username)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token({"sub": user.username, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user": user.to_dict(),
    }


@router.get("/password-reset/question", response_model=PasswordResetQuestionResponse)
def get_password_reset_question(
    username: str = Query(..., min_length=3, max_length=64),
    db: Session = Depends(get_db),
):
    """Return the configured security question for a username."""
    normalized_username = _normalize(username)
    if not normalized_username:
        raise HTTPException(status_code=400, detail="Username is required")

    user = _find_user_by_username(db, normalized_username)
    if not user or not user.security_question or not user.security_answer_hash:
        raise HTTPException(status_code=404, detail="No recovery question configured for this user")

    return {"security_question": user.security_question}


@router.post("/password-reset")
def password_reset(body: PasswordResetRequest, db: Session = Depends(get_db)):
    """Reset password using security question answer."""
    normalized_username = _normalize(body.username)
    if not normalized_username:
        raise HTTPException(status_code=400, detail="Username is required")

    user = _find_user_by_username(db, normalized_username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.security_question or not user.security_answer_hash:
        raise HTTPException(status_code=400, detail="No security question set for this user")

    if not verify_password(body.security_answer, user.security_answer_hash):
        raise HTTPException(status_code=401, detail="Incorrect security answer")

    _validate_password_strength(body.new_password, normalized_username)

    user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.get("/me")
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return current_user.to_dict()


@router.get("/technicians")
def list_technicians(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all technicians (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    technicians = db.query(User).filter(User.role == "technician").all()
    return [t.to_dict() for t in technicians]

@router.delete("/technicians/{user_id}")
def delete_technician(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a technician account (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == user_id, User.role == "technician").first()
    if not user:
        raise HTTPException(status_code=404, detail="Technician not found")

    db.delete(user)
    db.commit()
    return {"message": "Technician deleted"}
