from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone

Base = declarative_base()

class SensorReading(Base):
    __tablename__ = 'sensor_readings'

    id        = Column(Integer, primary_key=True)
    device_id = Column(String, nullable=False, index=True)
    sensor_id = Column(String, nullable=False, index=True)
    payload   = Column(JSON, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"SensorReading(device={self.device_id}, sensor={self.sensor_id}, ts={self.timestamp})"

    def to_dict(self):
        return {
            'id':        self.id,
            'device_id': self.device_id,
            'sensor_id': self.sensor_id,
            'payload':   self.payload,
            'timestamp': self.timestamp.isoformat(),
        }