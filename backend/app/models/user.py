from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from app.models.sensor_reading import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {"id": self.id, "username": self.username, "created_at": self.created_at.isoformat()}
