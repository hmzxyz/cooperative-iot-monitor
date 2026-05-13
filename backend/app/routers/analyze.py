from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.sensor_reading import SensorReading


router = APIRouter(prefix="/v1", tags=["analyze"])


class AnalyzeRequest(BaseModel):
    device_id: str = Field(..., min_length=1)
    sensor_id: str = Field(default="bundle", min_length=1)
    tick: int = Field(..., ge=0)
    sensors: dict[str, float] = Field(default_factory=dict)

    # Optional gateway metadata (Node-RED, etc.)
    gateway_ts: datetime | None = None
    gateway_meta: dict[str, Any] = Field(default_factory=dict)


def _score_anomaly(sensors: dict[str, float]) -> tuple[str, float, dict[str, Any]]:
    """
    Lightweight rule-based anomaly scoring (placeholder for Phase 2 ML).
    Returns (status, anomaly_score, decision_reason_json).
    """
    reasons: list[dict[str, Any]] = []
    worst = 0.0

    # Simple domain thresholds aligned with the existing dashboard.
    limits = {
        "temperature": {"target": (18.0, 30.0), "warning": (16.0, 33.0), "critical": (12.0, 37.0)},
        "humidity": {"target": (45.0, 78.0), "warning": (35.0, 86.0), "critical": (25.0, 94.0)},
        "weight": {"target": (2.0, 44.0), "warning": (0.5, 48.0), "critical": (0.0, 50.0)},
        "flow": {"target": (0.4, 7.0), "warning": (0.1, 9.0), "critical": (0.0, 10.0)},
    }

    def band_score(key: str, value: float) -> float:
        l = limits.get(key)
        if not l:
            return 0.0
        if value < l["critical"][0] or value > l["critical"][1]:
            return 92.0
        if value < l["warning"][0] or value > l["warning"][1]:
            return 72.0
        if value < l["target"][0] or value > l["target"][1]:
            return 44.0
        return 12.0

    for key, value in sensors.items():
        if not isinstance(value, (int, float)):
            continue
        score = band_score(key, float(value))
        if score > 0:
            reasons.append({"sensor": key, "value": float(value), "score": score})
        worst = max(worst, score)

    if worst >= 75:
        status = "critical"
    elif worst >= 45:
        status = "warning"
    else:
        status = "nominal"

    decision_reason = {
        "model": "RuleThresholdAnomaly v1",
        "status": status,
        "reasons": sorted(reasons, key=lambda r: r["score"], reverse=True)[:5],
    }
    return status, float(worst), decision_reason


@router.post("/analyze")
async def analyze(
    body: AnalyzeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    # Persist one row per sensor for compatibility with the dashboard history APIs.
    created = []
    ts = datetime.utcnow()
    for sensor_key, value in (body.sensors or {}).items():
        if not isinstance(value, (int, float)):
            continue
        reading = SensorReading(
            device_id=body.device_id,
            sensor_id=str(sensor_key),
            payload={"value": float(value), "tick": body.tick, "source": "gateway"},
            timestamp=ts,
        )
        db.add(reading)
        created.append(reading)

    await db.commit()
    for reading in created:
        await db.refresh(reading)

    payload = {
        "type": "reading_batch",
        "data": [reading.to_dict() for reading in created],
    }
    manager = getattr(request.app.state, "realtime_manager", None)
    if manager:
        await manager.broadcast_json(payload)

    return {"ok": True, "count": len(created)}
