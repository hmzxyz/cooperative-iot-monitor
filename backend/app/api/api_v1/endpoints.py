from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import crud
from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import get_db
from app.schemas import SensorReading, SensorReadingCreate, SensorQuery, Token, UserCreate, UserRead
from app.api.deps import get_current_active_admin, get_current_active_user

router = APIRouter()


@router.post("/auth/register", response_model=UserRead)
def register_user(*, db: Session = Depends(get_db), user_in: UserCreate) -> UserRead:
    """Register a new user with email and password."""
    existing_user = crud.get_user_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    return crud.create_user(db=db, user_in=user_in)


@router.post("/auth/login", response_model=Token)
def login_user(*, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
    """Authenticate a user and return a JWT access token."""
    user = crud.authenticate_user(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(subject=user.email, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/users/me", response_model=UserRead)
def read_current_user(current_user=Depends(get_current_active_user)) -> UserRead:
    """Return the profile of the currently authenticated user."""
    return current_user


@router.get("/users", response_model=list[UserRead])
def read_users(*, db: Session = Depends(get_db), _: Any = Depends(get_current_active_admin)) -> list[UserRead]:
    """Return a list of all users. Admin-only endpoint."""
    return crud.get_users(db=db)


@router.post("/sensors", response_model=SensorReading)
def ingest_sensor_reading(*, db: Session = Depends(get_db), data: SensorReadingCreate) -> SensorReading:
    """Persist a sensor reading sent to the API."""
    return crud.create_sensor_reading(db=db, data=data)


@router.get("/sensors", response_model=list[SensorReading])
def list_sensor_readings(*, db: Session = Depends(get_db), query: SensorQuery = Depends()) -> list[SensorReading]:
    """List recent sensor readings with pagination support."""
    return crud.get_sensor_readings(db=db, skip=query.skip, limit=query.limit)
