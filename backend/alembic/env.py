import os
from logging.config import fileConfig
from sqlalchemy import create_engine, pool
from alembic import context

# 1. Centralized Base and Model imports
from app.database import Base
from app.models.sensor_reading import SensorReading
from app.models.user import User

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use the centralized metadata
target_metadata = Base.metadata

# Use the same default logic as database.py
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://iot_user:iotpassword@postgres:5432/iot_monitor"
)

def _to_sync_database_url(url: str) -> str:
    # The app uses an async SQLAlchemy URL (e.g. postgresql+asyncpg://...).
    # Alembic runs in sync mode here, so convert to a sync driver.
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    return url

def _make_engine():
    # SQLite check kept for local dev flexibility, but defaults to Postgres
    sync_url = _to_sync_database_url(DATABASE_URL)
    connect_args = {"check_same_thread": False} if sync_url.startswith("sqlite") else {}
    return create_engine(
        sync_url,
        connect_args=connect_args, 
        poolclass=pool.NullPool
    )

def run_migrations_offline() -> None:
    sync_url = _to_sync_database_url(DATABASE_URL)
    context.configure(
        url=sync_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = _make_engine()
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
