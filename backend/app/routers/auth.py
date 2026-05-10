from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Local imports - ensure these match your project structure
from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models.user import User
from app.utils.email_utils import generate_and_store_otp, send_email_sync, validate_otp

router = APIRouter(prefix="/api/auth", tags=["auth"])

# --- Constants ---
PASSWORD_MIN_LENGTH = 8
COMMON_WEAK_PASSWORDS = {"password", "password123", "12345678", "admin123", "qwerty123"}

# --- Helpers ---
def _normalize(value: str | None) -> str | None:
    if value is None: return None
    cleaned = value.strip()
    return cleaned if cleaned else None

async def _find_user_by_email(db: AsyncSession, email: str) -> User | None:
    stmt = select(User).where(func.lower(User.email) == email.strip().lower())
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

def _validate_password_strength(password: str, identifier: str) -> None:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise HTTPException(status_code=400, detail=f"Minimum {PASSWORD_MIN_LENGTH} characters required")
    if not any(c.isupper() for c in password) or not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password needs uppercase and numbers")
    if identifier.lower() in password.lower():
        raise HTTPException(status_code=400, detail="Password cannot contain your email/username")

# --- Schemas ---
class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)
    role: Literal["technician", "admin", "viewer"] = "technician"
    phone: str | None = None
    security_question: str | None = None
    security_answer: str | None = None

class EmailRequest(BaseModel):
    email: EmailStr

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

class PasswordResetRequest(BaseModel):
    email: EmailStr
    security_answer: str
    new_password: str

# --- Endpoints ---

@router.post("/send-otp")
def send_otp(body: EmailRequest):
    email = body.email.strip().lower()
    otp = generate_and_store_otp(email)
    
    send_email_sync(
        to_addr=email,
        subject="IoT Monitor Verification",
        body_text=f"Your code is: {otp}. Valid for 10 minutes."
    )
    return {"msg": "OTP sent"}

@router.post("/verify-otp")
async def verify_otp(body: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    if not validate_otp(email, body.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user = await _find_user_by_email(db, email)
    if not user:
        # Auto-provision technician if verified but not registered
        user = User(
            email=email,
            username=email.split("@")[0],
            hashed_password=hash_password("Provisioned123!"),
            role="technician"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token({"sub": user.email, "role": user.role})
    # `users.last_login` is stored without timezone; keep value naive (UTC).
    user.last_login = datetime.utcnow()
    await db.commit()

    return {"access_token": token, "token_type": "bearer", "user": user.to_dict()}

@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await _find_user_by_email(db, form.username)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # `users.last_login` is stored without timezone; keep value naive (UTC).
    user.last_login = datetime.utcnow()
    await db.commit()

    token = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "user": user.to_dict()}

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user.to_dict()

@router.post("/register", status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if await _find_user_by_email(db, body.email):
        raise HTTPException(status_code=400, detail="Email already exists")
    
    _validate_password_strength(body.password, body.email)

    user = User(
        email=body.email.lower(),
        username=body.username,
        hashed_password=hash_password(body.password),
        role=body.role,
        phone=_normalize(body.phone),
        security_question=_normalize(body.security_question),
        security_answer_hash=hash_password(body.security_answer) if body.security_answer else None
    )
    db.add(user)
    await db.commit()
    return user.to_dict()
