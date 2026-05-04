import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, SessionLocal
from app.mqtt_subscriber import start_subscriber
from app.routers import auth, sensors, prediction_service

logger = logging.getLogger(__name__)

_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sensors.db")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # SQLite dev: create tables via create_all.
    # PostgreSQL (Docker): alembic upgrade head runs in Dockerfile CMD before uvicorn.
    if _DATABASE_URL.startswith("sqlite"):
        init_db()
    app.state.mqtt_client = None
    try:
        app.state.mqtt_client = start_subscriber(SessionLocal)
    except OSError as exc:
        logger.warning("MQTT subscriber unavailable (%s). API will continue without MQTT ingestion.", exc)
    except Exception:
        logger.exception("Failed to start MQTT subscriber; API will continue without MQTT ingestion.")
    try:
        yield
    finally:
        mqtt_client = getattr(app.state, "mqtt_client", None)
        if mqtt_client:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()


app = FastAPI(title="Cooperative IoT Monitor API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sensors.router)


@app.get("/health")
def health():
    return {"status": "ok"}
