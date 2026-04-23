from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, SessionLocal
from app.mqtt_subscriber import start_subscriber
from app.routers import auth, sensors


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_subscriber(SessionLocal)
    yield


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
