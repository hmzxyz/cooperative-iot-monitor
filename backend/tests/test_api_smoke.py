from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.models.sensor_reading import SensorReading
from app.models.user import User
from app.routers import auth as auth_router
from app.routers.auth import RegisterRequest
from app.routers.sensors import latest_readings, list_devices, list_readings


class _LoginForm:
    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password


def test_register_and_login_flow(db_session):
    created = auth_router.register(RegisterRequest(username="alice", password="strongpass"), db_session)
    assert created["username"] == "alice"

    login_payload = auth_router.login(_LoginForm(username="alice", password="strongpass"), db_session)
    assert login_payload["token_type"] == "bearer"
    assert isinstance(login_payload["access_token"], str)
    assert login_payload["access_token"]


def test_register_duplicate_user_is_rejected(db_session):
    auth_router.register(RegisterRequest(username="alice", password="strongpass"), db_session)
    with pytest.raises(HTTPException) as exc:
        auth_router.register(RegisterRequest(username="alice", password="newpass"), db_session)
    assert exc.value.status_code == 400


def test_sensors_latest_list_and_devices(db_session):
    user = User(username="operator1", hashed_password="plain::secret")
    db_session.add(user)
    db_session.add_all(
        [
            SensorReading(
                device_id="dev-001",
                sensor_id="temperature",
                payload={"value": 23.5},
                timestamp=datetime.now(timezone.utc),
            ),
            SensorReading(
                device_id="dev-001",
                sensor_id="humidity",
                payload={"value": 55.2},
                timestamp=datetime.now(timezone.utc),
            ),
        ]
    )
    db_session.commit()

    latest = latest_readings(device_id="dev-001", db=db_session, _=user)
    assert latest["temperature"]["device_id"] == "dev-001"
    assert latest["temperature"]["sensor_id"] == "temperature"

    readings = list_readings(sensor_id="temperature", device_id="dev-001", limit=10, db=db_session, _=user)
    assert len(readings) == 1
    assert readings[0]["sensor_id"] == "temperature"

    devices = list_devices(db=db_session, _=user)
    assert "dev-001" in devices
