from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class SensorReading(Base):
    __tablename__ = 'sensor_readings'

    id = Column(Integer, primary_key=True)
    sensor_id = Column(String, nullable=False)
    payload = Column(JSON, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"SensorReading(sensor_id={self.sensor_id}, timestamp={self.timestamp})"

    def to_dict(self):
        return {
            'id': self.id,
            'sensor_id': self.sensor_id,
            'payload': self.payload,
            'timestamp': self.timestamp.isoformat()
        }