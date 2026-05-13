import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Runtime uses asyncpg. Alembic still uses a sync driver via env.py.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://iot_user:iotpassword@postgres:5432/iot_monitor",
)


class Base(DeclarativeBase):
    pass


def _make_engine() -> AsyncEngine:
    echo = os.getenv("SQLALCHEMY_ECHO", "").strip().lower() in {"1", "true", "yes", "on"}
    return create_async_engine(DATABASE_URL, echo=echo, pool_pre_ping=True)


engine = _make_engine()
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
# Backwards-compatible import name used throughout the app.
SessionLocal = AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    # Schema is managed exclusively by Alembic (runs in entrypoint.sh before the server starts).
    pass
