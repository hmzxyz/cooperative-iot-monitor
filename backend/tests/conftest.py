import os
import sys
from pathlib import Path

import pytest

TEST_DB_PATH = Path(__file__).resolve().parent / "test_sensors.db"
BACKEND_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["JWT_SECRET_KEY"] = "test-secret-key"

from app.database import SessionLocal, engine, init_db
from app.models.sensor_reading import SensorReading
from app.models.user import User
from app.routers import auth


def _reset_db() -> None:
    db = SessionLocal()
    try:
        db.query(SensorReading).delete()
        db.query(User).delete()
        db.commit()
    finally:
        db.close()


def pytest_sessionstart(session):
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    init_db()


def pytest_sessionfinish(session, exitstatus):
    engine.dispose()
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest.fixture(autouse=True)
def clean_db():
    _reset_db()
    yield
    _reset_db()


@pytest.fixture(autouse=True)
def fast_auth_hashing(monkeypatch):
    monkeypatch.setattr(auth, "hash_password", lambda plain: f"plain::{plain}")
    monkeypatch.setattr(auth, "verify_password", lambda plain, hashed: hashed == f"plain::{plain}")


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
