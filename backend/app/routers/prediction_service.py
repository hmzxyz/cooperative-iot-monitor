from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sensor_reading import SensorReading

prediction_router = APIRouter(prefix="/api/predict", tags=["Predictions"])
SENSOR_IDS = ("temperature", "humidity", "weight", "flow")
SENSOR_LIMITS = {
    "temperature": {
        "label": "Temperature",
        "unit": "C",
        "target_min": 18.0,
        "target_max": 30.0,
        "warning_min": 16.0,
        "warning_max": 33.0,
        "critical_min": 12.0,
        "critical_max": 37.0,
    },
    "humidity": {
        "label": "Humidity",
        "unit": "%",
        "target_min": 45.0,
        "target_max": 78.0,
        "warning_min": 35.0,
        "warning_max": 86.0,
        "critical_min": 25.0,
        "critical_max": 94.0,
    },
    "weight": {
        "label": "Weight",
        "unit": "kg",
        "target_min": 2.0,
        "target_max": 44.0,
        "warning_min": 0.5,
        "warning_max": 48.0,
        "critical_min": 0.0,
        "critical_max": 50.0,
    },
    "flow": {
        "label": "Flow",
        "unit": "L/min",
        "target_min": 0.4,
        "target_max": 7.0,
        "warning_min": 0.1,
        "warning_max": 9.0,
        "critical_min": 0.0,
        "critical_max": 10.0,
    },
}


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


class SensorAnalytics(BaseModel):
    sensor_id: str
    label: str
    unit: str
    status: str
    risk_score: float
    confidence: float
    last_value: float | None
    rolling_mean: float | None
    volatility: float | None
    trend: float | None
    forecast_next: float | None
    sample_count: int
    action: str


class AiRecommendation(BaseModel):
    priority: str
    title: str
    message: str
    action: str
    sensor_id: str | None = None
    confidence: float


class AiAnalyticsResponse(BaseModel):
    model_name: str
    generated_at: str
    status: str
    risk_score: float
    primary_action: str
    data_quality: str
    recommendations: list[AiRecommendation]
    sensors: list[SensorAnalytics]


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


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


def extract_numeric_payload(payload) -> float | None:
    try:
        if isinstance(payload, dict) and "value" in payload:
            return float(payload["value"])
        if isinstance(payload, (int, float)):
            return float(payload)
    except (TypeError, ValueError):
        return None
    return None


def read_sensor_values(sensor_id: str, db: Session, hours: int = 24, limit: int = 80) -> list[float]:
    threshold = datetime.now(timezone.utc) - timedelta(hours=hours)
    readings = (
        db.query(SensorReading)
        .filter(
            SensorReading.sensor_id == sensor_id,
            SensorReading.timestamp >= threshold,
        )
        .order_by(SensorReading.timestamp.desc())
        .limit(limit)
        .all()
    )

    values = []
    for reading in reversed(readings):
        value = extract_numeric_payload(reading.payload)
        if value is not None:
            values.append(value)
    return values


def status_from_risk(risk_score: float) -> str:
    if risk_score >= 75:
        return "critical"
    if risk_score >= 45:
        return "warning"
    return "nominal"


def calculate_limit_risk(sensor_id: str, value: float) -> float:
    limits = SENSOR_LIMITS[sensor_id]
    if value < limits["critical_min"] or value > limits["critical_max"]:
        return 92.0
    if value < limits["warning_min"] or value > limits["warning_max"]:
        return 72.0
    if value < limits["target_min"] or value > limits["target_max"]:
        return 44.0
    return 12.0


def build_sensor_action(sensor_id: str, status: str, trend: float, forecast: float | None) -> str:
    label = SENSOR_LIMITS[sensor_id]["label"].lower()
    if status == "critical":
        return f"Inspect {label} immediately and pause the affected machine if the reading is confirmed."
    if status == "warning":
        direction = "rising" if trend > 0 else "falling"
        forecast_text = f" Forecast is {forecast:.1f} {SENSOR_LIMITS[sensor_id]['unit']}." if forecast is not None else ""
        return f"Monitor {label}; the model sees a {direction} trend.{forecast_text}"
    return f"Keep {label} under normal observation."


def analyze_sensor_model(sensor_id: str, db: Session, hours: int = 24) -> SensorAnalytics:
    limits = SENSOR_LIMITS[sensor_id]
    values = read_sensor_values(sensor_id, db, hours=hours)
    if not values:
        return SensorAnalytics(
            sensor_id=sensor_id,
            label=limits["label"],
            unit=limits["unit"],
            status="learning",
            risk_score=0.0,
            confidence=0.0,
            last_value=None,
            rolling_mean=None,
            volatility=None,
            trend=None,
            forecast_next=None,
            sample_count=0,
            action="Waiting for sensor history before scoring this signal.",
        )

    last_value = values[-1]
    rolling_mean = sum(values) / len(values)
    volatility = (sum((value - rolling_mean) ** 2 for value in values) / len(values)) ** 0.5
    recent_values = values[-12:]
    trend = calculate_trend(recent_values) if len(recent_values) >= 3 else 0.0
    forecast_next = last_value + trend * 6
    operating_span = max(limits["critical_max"] - limits["critical_min"], 1.0)
    limit_risk = calculate_limit_risk(sensor_id, last_value)
    trend_risk = clamp(abs(trend) / operating_span * 450.0, 0.0, 40.0)
    volatility_risk = clamp(volatility / operating_span * 180.0, 0.0, 35.0)
    forecast_risk = calculate_limit_risk(sensor_id, forecast_next) * 0.75
    risk_score = round(clamp(max(limit_risk, forecast_risk, limit_risk * 0.55 + trend_risk + volatility_risk), 0, 100), 1)
    status = status_from_risk(risk_score)
    confidence = round(clamp(0.52 + len(values) * 0.012, 0.55, 0.94), 2)

    return SensorAnalytics(
        sensor_id=sensor_id,
        label=limits["label"],
        unit=limits["unit"],
        status=status,
        risk_score=risk_score,
        confidence=confidence,
        last_value=round(last_value, 2),
        rolling_mean=round(rolling_mean, 2),
        volatility=round(volatility, 2),
        trend=round(trend, 3),
        forecast_next=round(forecast_next, 2),
        sample_count=len(values),
        action=build_sensor_action(sensor_id, status, trend, forecast_next),
    )


def build_recommendations(sensors: list[SensorAnalytics]) -> list[AiRecommendation]:
    scored_sensors = sorted(
        [sensor for sensor in sensors if sensor.status != "learning"],
        key=lambda sensor: sensor.risk_score,
        reverse=True,
    )
    if not scored_sensors:
        return [
            AiRecommendation(
                priority="learning",
                title="Connect live data",
                message="The AI model needs persisted sensor readings before it can rank production risk.",
                action="Run the MQTT broker and simulator or connect an ESP32, then let readings accumulate.",
                confidence=0.0,
            )
        ]

    recommendations = []
    for sensor in scored_sensors[:3]:
        if sensor.status == "nominal":
            continue
        recommendations.append(
            AiRecommendation(
                priority=sensor.status,
                title=f"{sensor.label} needs attention",
                message=(
                    f"Risk score {sensor.risk_score:.0f}/100 based on latest value, trend, "
                    f"volatility, and short-term forecast."
                ),
                action=sensor.action,
                sensor_id=sensor.sensor_id,
                confidence=sensor.confidence,
            )
        )

    if recommendations:
        return recommendations

    best = scored_sensors[0]
    return [
        AiRecommendation(
            priority="nominal",
            title="Production line looks stable",
            message=f"Highest sensor risk is {best.label} at {best.risk_score:.0f}/100.",
            action="Continue normal monitoring and keep the MQTT feed running.",
            sensor_id=best.sensor_id,
            confidence=best.confidence,
        )
    ]


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


@prediction_router.get("/analytics")
async def get_ai_analytics(db: Session = Depends(get_db)) -> AiAnalyticsResponse:
    """Return technician-focused AI analytics for the dashboard."""
    sensors = [analyze_sensor_model(sensor_id, db) for sensor_id in SENSOR_IDS]
    recommendations = build_recommendations(sensors)
    scored_sensors = [sensor for sensor in sensors if sensor.status != "learning"]

    if not scored_sensors:
        risk_score = 0.0
        status = "learning"
        primary_action = recommendations[0].action
        data_quality = "waiting_for_history"
    else:
        risk_score = round(max(sensor.risk_score for sensor in scored_sensors), 1)
        status = status_from_risk(risk_score)
        primary_action = recommendations[0].action
        sample_floor = min(sensor.sample_count for sensor in scored_sensors)
        data_quality = "strong" if sample_floor >= 24 else "warming_up"

    return AiAnalyticsResponse(
        model_name="LinearTrendAnomalyModel v1",
        generated_at=datetime.now(timezone.utc).isoformat(),
        status=status,
        risk_score=risk_score,
        primary_action=primary_action,
        data_quality=data_quality,
        recommendations=recommendations,
        sensors=sensors,
    )
