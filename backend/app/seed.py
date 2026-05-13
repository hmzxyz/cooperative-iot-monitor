"""
Idempotent superuser seed — runs once per deploy via entrypoint.sh.
Reads credentials from env vars; safe to re-run (skips if user exists).
"""
import asyncio
import logging
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.auth import hash_password
from app.models.user import User  # noqa: registers User with Base.metadata

logger = logging.getLogger(__name__)


async def _seed(url: str) -> None:
    engine = create_async_engine(url)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    email = os.getenv("SEED_SUPERUSER_EMAIL", "admin@coop.local").strip().lower()
    username = os.getenv("SEED_SUPERUSER_USERNAME", "admin").strip()
    password = os.getenv("SEED_SUPERUSER_PASSWORD", "Admin1234!")

    async with Session() as session:
        existing = (
            await session.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()

        if existing:
            logger.info("Superuser already exists (%s) — skipping.", email)
            await engine.dispose()
            return

        session.add(
            User(
                email=email,
                username=username,
                hashed_password=hash_password(password),
                role="admin",
            )
        )
        await session.commit()
        logger.info("Superuser created: %s (role=admin)", email)

    await engine.dispose()


def run() -> None:
    url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://iot_user:iotpassword@postgres:5432/iot_monitor",
    )
    asyncio.run(_seed(url))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    run()
