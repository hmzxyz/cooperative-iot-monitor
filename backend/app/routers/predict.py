from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.sensor_reading import SensorReading

router = APIRouter(prefix="/api/predict", tags=["predict"])


# In the Docker flow, Node-RED already computes `status`, `anomaly_score`,
# and `decision_reason` and persists them alongside `sensors` JSONB.


def _to_frontend_status(status: str | None) -> str:
    if not status:
        return "learning"
    s = status.strip().lower()
    if s in {"critical"}:
        return "critical"
    if s in {"warning", "watch"}:
        return "warning"
    if s in {"running", "nominal"}:
        return "nominal"
    return "learning"


@router.get("/analytics")
async def analytics(
    device_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    # Select explicit columns to avoid coupling to optional/legacy columns.
    stmt = select(
        SensorReading.id,
        SensorReading.device_id,
        SensorReading.tick,
        SensorReading.status,
        SensorReading.anomaly_score,
        SensorReading.decision_reason,
        SensorReading.sensors,
        SensorReading.timestamp,
    ).where(SensorReading.sensors.is_not(None))
    if device_id:
        stmt = stmt.where(SensorReading.device_id == device_id)
    stmt = stmt.order_by(desc(SensorReading.timestamp), desc(SensorReading.id)).limit(1)
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        return {
            "model_name": "NodeRedDecision v1",
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "status": "learning",
            "risk_score": 0,
            "primary_action": "Waiting for simulated readings from Node-RED.",
            "data_quality": "no_data",
            "recommendations": [],
            "sensors": [],
        }

    overall_status = _to_frontend_status(row.status)
    risk_score = float(row.anomaly_score or 0.0)
    sensors = []
    for key, value in (row.sensors or {}).items():
        sensors.append(
            {
                "sensor_id": str(key),
                "label": str(key).replace("_", " ").title(),
                "unit": "",
                "status": overall_status if overall_status != "learning" else "learning",
                "risk_score": risk_score,
                "confidence": 0.68,
                "last_value": float(value) if isinstance(value, (int, float)) else None,
                "rolling_mean": None,
                "volatility": None,
                "trend": None,
                "forecast_next": None,
                "sample_count": 1,
                "action": "See decision reasons panel.",
            }
        )

    recommendations = [
        {
            "priority": overall_status if overall_status != "learning" else "nominal",
            "title": f"{row.device_id} status: {row.status}",
            "message": "; ".join((row.decision_reason or [])[:3]) if isinstance(row.decision_reason, list) else str(row.decision_reason),
            "action": "Inspect the machine and verify sensor readings.",
            "sensor_id": None,
            "confidence": 0.68,
        }
    ]

    return {
        "model_name": "NodeRedDecision v1",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "status": overall_status,
        "risk_score": risk_score,
        "primary_action": recommendations[0]["action"],
        "data_quality": "nodered_persisted_latest",
        "recommendations": recommendations,
        "sensors": sensors,
        "decision_reason": row.decision_reason,
        "device_id": row.device_id,
        "tick": row.tick,
        "timestamp": row.timestamp.isoformat() if row.timestamp else None,
    }
