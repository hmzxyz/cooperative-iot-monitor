from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Enum as SqlEnum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class RoleEnum(str, Enum):
    """User role options for RBAC."""
    user = "user"
    admin = "admin"


class User(Base):
    """Database model representing a registered user."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(256), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    full_name = Column(String(256), nullable=True)
    role = Column(SqlEnum(RoleEnum), default=RoleEnum.user, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    readings = relationship("SensorReading", back_populates="owner")


class SensorReading(Base):
    """Database model representing one sensor event from the ESP32."""
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    temperature = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    milk_weight = Column(Float, nullable=False)
    alert = Column(String(128), nullable=True)
    topic = Column(String(256), nullable=False)
    payload = Column(Text, nullable=False)
    received_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    owner = relationship("User", back_populates="readings")
