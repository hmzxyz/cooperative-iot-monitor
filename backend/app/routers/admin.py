"""
Admin-only user management endpoints.
All routes require role == "admin" (enforced by _require_admin dependency).
"""
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, hash_password
from app.database import get_db
from app.models.user import User
from app.utils.email_utils import send_email_sync

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Helpers ────────────────────────────────────────────────────────────────

def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def _generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(length))
        if any(c.isupper() for c in pwd) and any(c.isdigit() for c in pwd):
            return pwd


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "is_blocked": user.is_blocked,
        "phone": user.phone,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }


async def _get_user_or_404(db: AsyncSession, user_id: int) -> User:
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── Schemas ────────────────────────────────────────────────────────────────

class CreateTechnicianRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3)


# ── Routes ─────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return [_user_dict(u) for u in result.scalars().all()]


@router.post("/users", status_code=201)
async def create_technician(
    body: CreateTechnicianRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    if (await db.execute(select(User).where(User.email == body.email.lower()))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    if (await db.execute(select(User).where(User.username == body.username))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    temp_password = _generate_temp_password()
    user = User(
        email=body.email.lower(),
        username=body.username,
        hashed_password=hash_password(temp_password),
        role="technician",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Best-effort welcome email — never fails the request if SMTP is unconfigured
    try:
        send_email_sync(
            to_addr=user.email,
            subject="Welcome to CoopIoT Monitor",
            body_text=(
                f"Hello {user.username},\n\n"
                f"Your account was created by {admin.username}.\n\n"
                f"  Username : {user.username}\n"
                f"  Email    : {user.email}\n"
                f"  Password : {temp_password}\n\n"
                "Log in and change your password on first use.\n\n"
                "— CoopIoT Monitor"
            ),
        )
    except Exception:
        pass

    # Return temp_password so admin can share it manually if email delivery fails
    return {**_user_dict(user), "temp_password": temp_password}


@router.patch("/users/{user_id}/block")
async def block_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    user = await _get_user_or_404(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot block your own account")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot block another admin")
    user.is_blocked = True
    await db.commit()
    return _user_dict(user)


@router.patch("/users/{user_id}/unblock")
async def unblock_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    user = await _get_user_or_404(db, user_id)
    user.is_blocked = False
    await db.commit()
    return _user_dict(user)
