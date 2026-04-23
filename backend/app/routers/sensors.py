from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db
from app.models.sensor_reading import SensorReading
from app.models.user import User

router = APIRouter(prefix="/api/sensors", tags=["sensors"])


@router.get("/")
def list_readings(
    sensor_id: str | None = Query(default=None),
    device_id: str | None = Query(default=None),
    limit: int = Query(default=50, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(SensorReading).order_by(SensorReading.timestamp.desc())
    if sensor_id:
        q = q.filter(SensorReading.sensor_id == sensor_id)
    if device_id:
        q = q.filter(SensorReading.device_id == device_id)
    return [r.to_dict() for r in q.limit(limit).all()]


@router.get("/devices")
def list_devices(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Return distinct device IDs seen so far."""
    rows = db.query(SensorReading.device_id).distinct().all()
    return [r.device_id for r in rows]


@router.get("/latest")
def latest_readings(
    device_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sensor_ids = ["temperature", "humidity", "weight", "flow"]
    result = {}
    for sid in sensor_ids:
        q = db.query(SensorReading).filter(SensorReading.sensor_id == sid)
        if device_id:
            q = q.filter(SensorReading.device_id == device_id)
        row = q.order_by(SensorReading.timestamp.desc()).first()
        result[sid] = row.to_dict() if row else None
    return result
