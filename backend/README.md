# Backend Service

FastAPI API for authentication, bundle-style sensor history, and persisted dashboard hydration.

## Docker First

```bash
docker-compose up -d --build backend
```

The backend container runs Alembic on startup and then serves Uvicorn on port `8000`.

## Data Contract

The backend expects `sensor_readings` rows populated by Node-RED:

- `device_id`
- `sensor_id` as the machine type
- `tick`
- `status`
- `anomaly_score`
- `decision_reason` JSONB
- `sensors` JSONB
- `timestamp`

## Useful Commands

```bash
cd backend
uv sync
uv run pytest
uv run alembic upgrade head
```

## Runtime Endpoints

- `GET /health`
- `GET /api/sensors/devices`
- `GET /api/sensors/latest`
- `GET /api/predict/analytics`
