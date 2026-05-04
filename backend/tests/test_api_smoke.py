import asyncio
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.models.sensor_reading import SensorReading
from app.models.user import User
from app.routers import auth as auth_router
from app.routers.auth import PasswordResetRequest, RegisterRequest
from app.routers.prediction_service import PredictFailureRequest, get_sensor_summary, predict_failure
from app.routers.sensors import latest_readings, list_devices, list_readings


class _LoginForm:
    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password


def test_register_and_login_flow(db_session):
    created = auth_router.register(RegisterRequest(username="alice", password="StrongPass1!"), db_session)
    assert created["username"] == "alice"

    login_payload = auth_router.login(_LoginForm(username="alice", password="StrongPass1!"), db_session)
    assert login_payload["token_type"] == "bearer"
    assert isinstance(login_payload["access_token"], str)
    assert login_payload["access_token"]


def test_register_duplicate_user_is_rejected(db_session):
    auth_router.register(RegisterRequest(username="alice", password="StrongPass1!"), db_session)
    with pytest.raises(HTTPException) as exc:
        auth_router.register(RegisterRequest(username="alice", password="OtherPass1!"), db_session)
    assert exc.value.status_code == 400


def test_register_duplicate_username_is_case_insensitive(db_session):
    auth_router.register(RegisterRequest(username="Alice", password="StrongPass1!"), db_session)
    with pytest.raises(HTTPException) as exc:
        auth_router.register(RegisterRequest(username="alice", password="OtherPass1!"), db_session)
    assert exc.value.status_code == 400


def test_register_rejects_weak_passwords(db_session):
    weak_passwords = [
        "password123",
        "alllowercase1!",
        "ALLUPPERCASE1!",
        "NoNumberPass!",
        "NoSpecial123",
        "AliCe123!",
    ]
    for weak_password in weak_passwords:
        with pytest.raises(HTTPException) as exc:
            auth_router.register(
                RegisterRequest(username="alice", password=weak_password),
                db_session,
            )
        assert exc.value.status_code == 400


def test_register_defaults_user_to_technician_role(db_session):
    created = auth_router.register(
        RegisterRequest(
            username="technician_1",
            password="StrongPass1!",
            security_question="Favorite machine?",
            security_answer="Mixer A",
        ),
        db_session,
    )
    assert created["role"] == "technician"


def test_password_reset_flow(db_session):
    auth_router.register(
        RegisterRequest(
            username="alice",
            password="StrongPass1!",
            security_question="Favorite machine?",
            security_answer="Mixer A",
        ),
        db_session,
    )

    question_payload = auth_router.get_password_reset_question(username="alice", db=db_session)
    assert question_payload["security_question"] == "Favorite machine?"

    with pytest.raises(HTTPException) as exc:
        auth_router.password_reset(
            PasswordResetRequest(
                username="alice",
                security_answer="Wrong answer",
                new_password="NewStrongPass1!",
            ),
            db_session,
        )
    assert exc.value.status_code == 401

    with pytest.raises(HTTPException) as exc:
        auth_router.password_reset(
            PasswordResetRequest(
                username="alice",
                security_answer="Mixer A",
                new_password="password123",
            ),
            db_session,
        )
    assert exc.value.status_code == 400

    result = auth_router.password_reset(
        PasswordResetRequest(
            username="alice",
            security_answer="Mixer A",
            new_password="NewStrongPass1!",
        ),
        db_session,
    )
    assert result["message"] == "Password updated successfully"

    with pytest.raises(HTTPException) as exc:
        auth_router.login(_LoginForm(username="alice", password="StrongPass1!"), db_session)
    assert exc.value.status_code == 401

    login_payload = auth_router.login(_LoginForm(username="alice", password="NewStrongPass1!"), db_session)
    assert login_payload["token_type"] == "bearer"


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


def test_prediction_routes_use_persisted_sensor_readings(db_session):
    db_session.add_all(
        [
            SensorReading(
                device_id="dev-001",
                sensor_id="temperature",
                payload={"value": 23.5 + index},
                timestamp=datetime.now(timezone.utc),
            )
            for index in range(12)
        ]
    )
    db_session.commit()

    prediction = asyncio.run(
        predict_failure(
            PredictFailureRequest(sensor_id="temperature", hours=24),
            db_session,
        )
    )
    summary = asyncio.run(get_sensor_summary(db_session))

    assert prediction.sensor_id == "temperature"
    assert prediction.predicted_status in {"nominal", "warning", "critical"}
    assert summary.total_devices == 1
    assert summary.total_readings == 12
