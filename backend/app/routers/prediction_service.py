from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sensor_reading import SensorReading

prediction_router = APIRouter(prefix="/api/predict", tags=["Predictions"])


class PredictFailureRequest(BaseModel):
    sensor_id: str
    hours: int = 24


class PredictFailureResponse(BaseModel):
    sensor_id: str
    predicted_status: str
    confidence: float
    features: dict[str, float]
    timestamp: str


class SensorSummary(BaseModel):
    total_devices: int
    total_readings: int
    alerts_count: int
    uptime_percentage: float


def calculate_trend(values: list[float]) -> float:
    """Calculate linear trend slope from a numeric series."""
    if len(values) < 2:
        return 0.0

    n = len(values)
    x = list(range(n))
    sum_x = sum(x)
    sum_y = sum(values)
    sum_xy = sum(x[i] * values[i] for i in range(n))
    sum_x2 = sum(xi * xi for xi in x)

    numerator = n * sum_xy - sum_x * sum_y
    denominator = n * sum_x2 - sum_x * sum_x

    return numerator / denominator if denominator != 0 else 0.0


def analyze_sensor_data(sensor_id: str, db: Session, hours: int = 24) -> dict[str, float]:
    """Analyze recent sensor readings and return prediction features."""
    threshold = datetime.now(timezone.utc) - timedelta(hours=hours)

    readings = db.query(SensorReading).filter(
        SensorReading.sensor_id == sensor_id,
        SensorReading.timestamp >= threshold,
    ).order_by(SensorReading.timestamp.desc()).all()

    if not readings:
        return {}

    values = []
    for reading in readings:
        try:
            payload = reading.payload
            if isinstance(payload, dict) and "value" in payload:
                values.append(float(payload["value"]))
            elif isinstance(payload, (int, float)):
                values.append(float(payload))
        except (TypeError, ValueError, KeyError):
            continue

    if not values:
        return {}

    mean_val = sum(values) / len(values)
    std_val = (sum((x - mean_val) ** 2 for x in values) / len(values)) ** 0.5
    trend_val = calculate_trend(values[-10:]) if len(values) >= 10 else 0.0
    last_val = values[0]

    return {
        "rolling_mean": mean_val,
        "rolling_std": std_val,
        "trend": trend_val,
        "last_value": last_val,
    }


def predict_status(features: dict[str, float]) -> tuple[str, float]:
    """Return a rule-based status and confidence score."""
    if not features:
        return "nominal", 1.0

    status = "nominal"
    confidence = 0.85
    normalized_trend = abs(features.get("trend", 0))
    volatility = features.get("rolling_std", 0)

    if volatility > 15 or normalized_trend > 1.5:
        status = "critical"
        confidence = 0.95
    elif volatility > 10 or normalized_trend > 0.7:
        status = "warning"
        confidence = 0.88

    return status, confidence


def summarize_recent_alerts(db: Session, hours: int = 24) -> int:
    """Count sensors that currently look unstable in the recent time window."""
    sensor_ids = db.query(SensorReading.sensor_id).distinct().all()
    alert_count = 0
    for (sensor_id,) in sensor_ids:
        features = analyze_sensor_data(sensor_id, db, hours)
        if not features:
            continue
        status, _ = predict_status(features)
        if status in {"warning", "critical"}:
            alert_count += 1
    return alert_count


def calculate_uptime_percentage(db: Session, hours: int = 24) -> float:
    """Estimate dashboard uptime from recent sensor coverage."""
    threshold = datetime.now(timezone.utc) - timedelta(hours=hours)
    total_devices = db.query(func.count(func.distinct(SensorReading.device_id))).scalar() or 0
    if total_devices == 0:
        return 0.0

    expected_sensors = 4
    expected_readings = total_devices * expected_sensors
    if expected_readings == 0:
        return 0.0

    observed_readings = (
        db.query(func.count(SensorReading.id))
        .filter(SensorReading.timestamp >= threshold)
        .scalar()
        or 0
    )
    return round(min(100.0, (observed_readings / expected_readings) * 100.0), 1)


@prediction_router.post("/failure")
async def predict_failure(
    request: PredictFailureRequest,
    db: Session = Depends(get_db),
) -> PredictFailureResponse:
    """Predict potential failure for a sensor."""
    features = analyze_sensor_data(request.sensor_id, db, request.hours)

    if not features:
        raise HTTPException(status_code=404, detail="No data found for sensor")

    status, confidence = predict_status(features)

    return PredictFailureResponse(
        sensor_id=request.sensor_id,
        predicted_status=status,
        confidence=confidence,
        features=features,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@prediction_router.get("/summary")
async def get_sensor_summary(db: Session = Depends(get_db)) -> SensorSummary:
    """Get overall sensor system summary."""
    total_devices = db.query(func.count(func.distinct(SensorReading.device_id))).scalar() or 0
    total_readings = db.query(func.count(SensorReading.id)).scalar() or 0

    alerts_count = summarize_recent_alerts(db)
    uptime_percentage = calculate_uptime_percentage(db)

    return SensorSummary(
        total_devices=total_devices,
        total_readings=total_readings,
        alerts_count=alerts_count,
        uptime_percentage=uptime_percentage,
    )
