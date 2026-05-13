from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.sensor_reading import SensorReading

router = APIRouter(prefix="/api/sensors", tags=["sensors"])


@router.get("/devices")
async def list_devices(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(SensorReading.device_id).distinct().order_by(SensorReading.device_id))
    return [row[0] for row in result.all()]


@router.get("/")
async def get_sensor_history(
    sensor_id: str = Query(..., min_length=1),
    device_id: str | None = Query(None, description="Machine/device id (e.g. Hopper_01)"),
    limit: int = Query(40, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    sensor_value = func.jsonb_extract_path_text(SensorReading.sensors, sensor_id)

    stmt = select(
        SensorReading.id,
        SensorReading.device_id,
        SensorReading.timestamp,
        sensor_value.label("value_text"),
    )
    if device_id:
        stmt = stmt.where(SensorReading.device_id == device_id)
    stmt = (
        stmt.where(SensorReading.sensors.is_not(None))
        .where(sensor_value.is_not(None))
        .order_by(desc(SensorReading.timestamp), desc(SensorReading.id))
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()
    response = []
    for row in rows:
        try:
            value = float(row.value_text)
        except (TypeError, ValueError):
            continue
        response.append(
            {
                "id": row.id,
                "device_id": row.device_id,
                "sensor_id": sensor_id,
                "payload": {"value": value},
                "timestamp": row.timestamp.isoformat() if row.timestamp else None,
            }
        )
    return response


@router.get("/latest")
async def get_latest_readings(
    device_id: str | None = Query(None, description="Machine/device id (e.g. Hopper_01)"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    # Select only the columns we need so this endpoint remains compatible even
    # if older deployments are missing optional columns (e.g. legacy `payload`).
    stmt = select(
        SensorReading.id,
        SensorReading.device_id,
        SensorReading.timestamp,
        SensorReading.sensors,
    ).where(SensorReading.sensors.is_not(None))
    if device_id:
        stmt = stmt.where(SensorReading.device_id == device_id)
    stmt = stmt.order_by(desc(SensorReading.timestamp), desc(SensorReading.id)).limit(1)
    result = await db.execute(stmt)
    latest_row = result.first()
    if not latest_row:
        return {}

    sensors = latest_row.sensors or {}
    response: dict[str, dict] = {}
    for key, value in sensors.items():
        if isinstance(value, (int, float)):
            response[str(key)] = {
                "device_id": latest_row.device_id,
                "sensor_id": str(key),
                "payload": {"value": float(value)},
                "timestamp": latest_row.timestamp.isoformat() if latest_row.timestamp else None,
            }
    return response
