from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sensor_reading import SensorReading


ALLOWED_DEVICE_IDS = {"Hopper_01", "Mixer_01", "Conveyor_01"}
ALLOWED_MACHINES = {"Hopper", "Mixer", "Conveyor"}
ALLOWED_STATUSES = {"RUNNING", "WATCH", "WARNING", "CRITICAL"}


class TelemetryValidationError(ValueError):
    pass


@dataclass(frozen=True)
class CanonicalTelemetry:
    device_id: str
    machine: str
    tick: int
    timestamp: datetime
    timestamp_text: str
    sensors: dict[str, Any]
    status: str
    anomaly_score: float
    decision_reason: list[Any]
    payload: dict[str, Any]


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def _coerce_tick(value: Any) -> int:
    if isinstance(value, bool):
        raise TelemetryValidationError("tick must be an integer")
    if isinstance(value, int):
        return value
    if isinstance(value, float) and math.isfinite(value) and value.is_integer():
        return int(value)
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.isdigit():
            return int(stripped)
    raise TelemetryValidationError("tick must be an integer")


def _parse_timestamp(value: Any) -> tuple[datetime, str]:
    if value is None:
        now = datetime.now(timezone.utc).replace(microsecond=0)
        return now.replace(tzinfo=None), now.isoformat().replace("+00:00", "Z")

    if not isinstance(value, str) or not value.strip():
        raise TelemetryValidationError("timestamp must be an ISO 8601 string")

    normalized = value.strip()
    parse_value = normalized.replace("Z", "+00:00") if normalized.endswith("Z") else normalized
    try:
        parsed = datetime.fromisoformat(parse_value)
    except ValueError as exc:
        raise TelemetryValidationError("timestamp must be an ISO 8601 string") from exc

    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)

    return parsed, normalized


def validate_telemetry_payload(payload: Any, expected_device_id: str | None = None) -> CanonicalTelemetry:
    if not isinstance(payload, dict):
        raise TelemetryValidationError("payload must be a JSON object")

    device_id = payload.get("device_id")
    if device_id not in ALLOWED_DEVICE_IDS:
        raise TelemetryValidationError("device_id is not allowed")
    if expected_device_id and device_id != expected_device_id:
        raise TelemetryValidationError("topic device_id does not match payload device_id")

    machine = payload.get("machine")
    if machine not in ALLOWED_MACHINES:
        raise TelemetryValidationError("machine is not allowed")

    tick = _coerce_tick(payload.get("tick"))

    sensors = payload.get("sensors")
    if not isinstance(sensors, dict):
        raise TelemetryValidationError("sensors must be an object")

    status = payload.get("status")
    if status not in ALLOWED_STATUSES:
        raise TelemetryValidationError("status is not allowed")

    anomaly_score = payload.get("anomaly_score")
    if not _is_number(anomaly_score):
        raise TelemetryValidationError("anomaly_score must be numeric")

    decision_reason = payload.get("decision_reason")
    if not isinstance(decision_reason, list):
        raise TelemetryValidationError("decision_reason must be a list")

    timestamp, timestamp_text = _parse_timestamp(payload.get("timestamp"))
    normalized_payload = dict(payload)
    normalized_payload.update(
        {
            "device_id": device_id,
            "machine": machine,
            "tick": tick,
            "timestamp": timestamp_text,
            "sensors": sensors,
            "status": status,
            "anomaly_score": float(anomaly_score),
            "decision_reason": decision_reason,
        }
    )

    return CanonicalTelemetry(
        device_id=device_id,
        machine=machine,
        tick=tick,
        timestamp=timestamp,
        timestamp_text=timestamp_text,
        sensors=sensors,
        status=status,
        anomaly_score=float(anomaly_score),
        decision_reason=decision_reason,
        payload=normalized_payload,
    )


def make_sensor_reading(
    *,
    device_id: str,
    sensor_id: str,
    tick: int | None = None,
    status: str | None = None,
    anomaly_score: float | None = None,
    decision_reason: Any = None,
    sensors: dict[str, Any] | None = None,
    payload: dict[str, Any] | None = None,
    timestamp: datetime | None = None,
) -> SensorReading:
    return SensorReading(
        device_id=device_id,
        sensor_id=sensor_id,
        tick=tick,
        status=status,
        anomaly_score=anomaly_score,
        decision_reason=decision_reason,
        sensors=sensors,
        payload=payload,
        timestamp=timestamp or datetime.utcnow(),
    )


async def persist_sensor_readings(db: AsyncSession, readings: list[SensorReading]) -> list[SensorReading]:
    for reading in readings:
        db.add(reading)
    await db.commit()
    for reading in readings:
        await db.refresh(reading)
    return readings


async def persist_canonical_telemetry(db: AsyncSession, telemetry: CanonicalTelemetry) -> SensorReading:
    reading = make_sensor_reading(
        device_id=telemetry.device_id,
        sensor_id=telemetry.machine,
        tick=telemetry.tick,
        status=telemetry.status,
        anomaly_score=telemetry.anomaly_score,
        decision_reason=telemetry.decision_reason,
        sensors=telemetry.sensors,
        payload=telemetry.payload,
        timestamp=telemetry.timestamp,
    )
    created = await persist_sensor_readings(db, [reading])
    return created[0]


async def broadcast_readings(manager: Any, readings: list[SensorReading]) -> None:
    if not manager:
        return
    await manager.broadcast_json(
        {
            "type": "reading_batch",
            "data": [reading.to_dict() for reading in readings],
        }
    )
