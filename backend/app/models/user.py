from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="technician")
    is_blocked = Column(Boolean, nullable=False, default=False)
    security_question = Column(String)
    security_answer_hash = Column(String)
    phone = Column(String)
    last_login = Column(DateTime, nullable=True)
    # Stored as TIMESTAMP WITHOUT TIME ZONE in Postgres migrations; keep values naive (UTC).
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "role": self.role,
            "is_blocked": self.is_blocked,
            "phone": self.phone,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
