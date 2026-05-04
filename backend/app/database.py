import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sensors.db")

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models.sensor_reading import Base
    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_user_columns()


def _ensure_sqlite_user_columns():
    """Backfill auth columns for older local SQLite databases."""
    if not DATABASE_URL.startswith("sqlite"):
        return

    required_columns = {
        "role": "ALTER TABLE users ADD COLUMN role VARCHAR",
        "security_question": "ALTER TABLE users ADD COLUMN security_question VARCHAR",
        "security_answer_hash": "ALTER TABLE users ADD COLUMN security_answer_hash VARCHAR",
        "phone": "ALTER TABLE users ADD COLUMN phone VARCHAR",
        "last_login": "ALTER TABLE users ADD COLUMN last_login DATETIME",
    }

    with engine.begin() as connection:
        users_table = connection.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        ).first()
        if not users_table:
            return

        existing_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(users)")).fetchall()
        }
        for column_name, ddl in required_columns.items():
            if column_name not in existing_columns:
                connection.execute(text(ddl))

        connection.execute(text("UPDATE users SET role = 'technician' WHERE role IS NULL"))
