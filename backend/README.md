# Backend Service

FastAPI API for authentication, sensor history, MQTT ingestion, and AI analytics.

## Run Locally (SQLite)

```bash
cd backend
.venv-test/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Default DB: `backend/sensors.db`
- On startup, local SQLite schema is auto-created and missing auth columns are backfilled.
- `GET /api/predict/analytics` returns technician-focused risk scoring and recommendations.

## Run with Docker (PostgreSQL)

```bash
docker compose up --build backend postgres mosquitto
```

- Container startup runs: `alembic upgrade head && uvicorn ...`
- Account role and recovery columns are added by Alembic revision `002`.

## Useful Commands

```bash
cd backend
.venv-test/bin/pytest -q
alembic upgrade head
```
