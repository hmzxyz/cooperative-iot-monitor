from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models import SensorReading, User
from app.schemas import SensorReadingCreate, UserCreate


def get_user_by_email(db: Session, email: str) -> User | None:
    """Return the first user matching the provided email."""
    return db.query(User).filter(User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    """Return a list of users with pagination support."""
    return db.query(User).offset(skip).limit(limit).all()


def create_user(db: Session, user_in: UserCreate) -> User:
    """Create a new user with a hashed password."""
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        role=user_in.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Verify user email and password credentials."""
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_sensor_reading(db: Session, data: SensorReadingCreate) -> SensorReading:
    """Create a sensor reading record from incoming MQTT payload data."""
    reading = SensorReading(
        temperature=data.temperature,
        pressure=data.pressure,
        milk_weight=data.milk_weight,
        alert=data.alert,
        topic=data.topic,
        payload=str(data.payload),
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


def get_sensor_readings(db: Session, skip: int = 0, limit: int = 100) -> list[SensorReading]:
    """Return recent sensor readings in descending timestamp order."""
    return db.query(SensorReading).order_by(SensorReading.received_at.desc()).offset(skip).limit(limit).all()
