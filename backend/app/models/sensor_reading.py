from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Column, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

from app.database import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True)
    # Node-RED simulator writes machine_id here (e.g. "Hopper_01").
    device_id = Column(String, nullable=False, index=True)
    # Node-RED simulator writes machine_type here (e.g. "Hopper").
    sensor_id = Column(String, nullable=False, index=True)
    tick = Column(Integer, nullable=True, index=True)
    status = Column(String, nullable=True, index=True)
    anomaly_score = Column(Float, nullable=True)
    decision_reason = Column(JSONB, nullable=True, default=list)
    sensors = Column(JSONB, nullable=True, default=dict)

    # Legacy column from early schema; keep for backwards compatibility.
    payload = Column(JSONB, nullable=True)
    timestamp = Column(DateTime, nullable=True)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "device_id": self.device_id,
            "sensor_id": self.sensor_id,
            "tick": self.tick,
            "status": self.status,
            "anomaly_score": self.anomaly_score,
            "decision_reason": self.decision_reason,
            "sensors": self.sensors,
            "payload": self.payload,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
