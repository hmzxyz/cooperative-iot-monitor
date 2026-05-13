import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.realtime import ConnectionManager
from app.routers import auth, analyze, predict, sensors
from app.routers import admin
from app import ws as ws_routes

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Node-RED gateway posts to /v1/analyze; backend owns streaming.
    app.state.realtime_manager = ConnectionManager()
    await init_db()
    try:
        yield
    finally:
        pass


app = FastAPI(title="Cooperative IoT Monitor API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(analyze.router)
app.include_router(sensors.router)
app.include_router(predict.router)
app.include_router(ws_routes.router)


@app.get("/health")
def health():
    return {"status": "ok"}
