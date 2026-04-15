from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class Role(str, Enum):
    """Available user roles for RBAC."""
    user = "user"
    admin = "admin"


class UserBase(BaseModel):
    """Shared fields for user requests and responses."""
    email: EmailStr
    full_name: str | None = None
    role: Role = Role.user


class UserCreate(UserBase):
    """Request schema for user registration."""
    password: str = Field(..., min_length=8)


class UserRead(UserBase):
    """Response schema for user profile data."""
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class Token(BaseModel):
    """Response schema for JWT tokens."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Internal payload type for decoded tokens."""
    email: str | None = None


class SensorReadingBase(BaseModel):
    """Common fields for sensor readings."""
    temperature: float
    pressure: float
    milk_weight: float
    alert: str | None = None


class SensorReadingCreate(SensorReadingBase):
    """Schema for creating sensor readings."""
    topic: str
    payload: dict[str, Any]


class SensorReading(SensorReadingBase):
    """Schema returned from sensor reading endpoints."""
    id: int
    received_at: datetime
    topic: str
    payload: dict[str, Any]

    class Config:
        orm_mode = True


class SensorQuery(BaseModel):
    """Query parameters for listing sensor readings."""
    limit: int = 50
    skip: int = 0
