from fastapi import FastAPI
from sqlalchemy.exc import SQLAlchemyError

from app.api.api_v1.endpoints import router as api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.services.mqtt import start_mqtt_listener


def create_database_structures() -> None:
    """Create database tables if they do not yet exist."""
    try:
        Base.metadata.create_all(bind=engine)
    except SQLAlchemyError as error:
        print(f"Failed to create database structure: {error}")


# Create the FastAPI application instance and mount the API router.
app = FastAPI(title=settings.PROJECT_NAME)
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
def startup_event() -> None:
    """Run startup logic when the application launches."""
    create_database_structures()
    start_mqtt_listener()


@app.get("/")
def root() -> dict[str, str]:
    """Health-check endpoint for the backend service."""
    return {"message": "Cooperative IoT Monitor backend is running."}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
