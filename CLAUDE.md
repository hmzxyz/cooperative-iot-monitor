# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Full stack (canonical)
```bash
docker-compose up -d --build
# Dashboard: http://localhost  |  API: http://localhost:8000  |  Node-RED: http://localhost:1880
```

### Frontend
```bash
cd frontend && npm install
npm run dev      # Vite dev server → http://localhost:5173
npm run build    # Production bundle → dist/
```

### Backend
```bash
cd backend && uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
uv run pytest                        # Run tests
uv run alembic upgrade head          # Apply pending migrations
uv run alembic revision --autogenerate -m "description"   # New migration
python -m app.seed                   # Re-run superuser seed manually (idempotent)
```
Keep `backend/pyproject.toml` and `backend/requirements.txt` synchronized when dependencies change.

### ESP32 Simulator
```bash
cd esp32-simulators && npm install && npm start
# Env overrides: MQTT_BROKER_URL, PUBLISH_INTERVAL_MS
```

### Mosquitto (standalone)
```bash
mosquitto -c mosquitto/mosquitto.conf   # TCP 1883, WebSocket 9001
```

## Architecture

### Data Flow
```
ESP32 firmware or esp32-simulators (Node.js)
  └─→ Mosquitto MQTT broker (1883 / WS 9001)
        ├─→ backend/app/mqtt_subscriber.py  →  PostgreSQL
        └─→ frontend MqttManager.js         →  React dashboard (live)

Node-RED (simulation/)  →  POST /v1/analyze  →  backend
FastAPI routes          →  frontend api.js   →  React pages
```

### Frontend (`frontend/src/`)
- `App.jsx` — dashboard root: sensor state, broker switching, mock mode activation, backend hydration on load
- `MqttManager.js` — MQTT.js lifecycle, stale-data detection (12 s), fallback mock simulation; mock is a **user feature**, keep it
- `config.js` — sensor display metadata, MQTT topic definitions, mock profiles with EMA smoothing params
- `context/AuthContext.jsx` — JWT storage, session helpers, role ("admin" / "technician" / "viewer")
- `api.js` — fetch wrapper that injects the JWT Authorization header

### Backend (`backend/app/`)
- `main.py` — FastAPI app, CORS, lifespan startup, route registration
- `seed.py` — idempotent superuser creation; runs via `entrypoint.sh` before the server starts; driven by `SEED_SUPERUSER_*` env vars
- `database.py` — `AsyncEngine` + `AsyncSession` factory; schema is owned by Alembic, `init_db()` is a no-op
- `mqtt_subscriber.py` — subscribes to `cooperative/device/+/sensor/+`, parses numeric payloads, persists `SensorReading`
- `auth.py` — bcrypt password hashing, JWT creation/validation (8 h expiry), OTP generation
- `routers/auth.py` — OTP email login (auto-provisions user on first verify), password login, register, `/me`; blocks suspended users (403)
- `routers/admin.py` — admin-only user management: list, create technician + send welcome email, block/unblock; protected by `_require_admin` dep (403 if not admin)
- `routers/sensors.py` — `/devices`, `/latest`, `/` (paginated history)
- `routers/predict.py` — rule-based anomaly scoring → `analytics` endpoint (Phase 2 will add ML)
- `routers/analyze.py` — `POST /v1/analyze` gateway for Node-RED bundle payloads

### Database
Two ORM models: `SensorReading` and `User`.  
`SensorReading` key columns: `device_id`, `sensor_id`, `tick`, `status`, `anomaly_score`, `decision_reason` (JSONB), `sensors` (JSONB), `payload` (legacy JSONB), `timestamp`.  
Migrations live in `backend/alembic/versions/` (005 migrations applied in order).  
**Driver split:** app runtime uses `asyncpg` (async); Alembic migrations use `psycopg2-binary` (sync) — do not mix them.

## MQTT Topic Contract
```
cooperative/device/{device_id}/sensor/{sensor_id}
```
Payloads are numeric strings. Known sensor IDs: `temperature`, `vibration`, `current_amp`, `weight_kg`, `level_percent`.  
Bundle payloads (Node-RED → `/v1/analyze`) carry `status`, `anomaly_score`, `decision_reason`, and a `sensors` dict.

## Key Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://…@postgres/iot_monitor` | Use `sqlite:///./sensors.db` for local dev without Docker |
| `JWT_SECRET_KEY` | `dev-secret-change-in-production` | Must be changed for any non-local deploy |
| `MQTT_BROKER_HOST` / `_PORT` | `mosquitto` / `1883` | Change to `localhost` for local dev |
| `SEED_SUPERUSER_EMAIL` | `admin@coop.local` | Initial admin account (skip if user exists) |
| `SEED_SUPERUSER_USERNAME` | `admin` | |
| `SEED_SUPERUSER_PASSWORD` | `Admin1234!` | Must be changed for production |
| `SMTP_HOST` / `SMTP_PORT` | `localhost` / `1025` | Set real values for OTP email delivery |
| `SMTP_TLS` | `false` | Set `true` for Gmail/TLS providers |
| `VITE_API_BASE_URL` | `/api` | Proxied to `http://backend:8000` by Nginx in Docker |
| `VITE_WS_URL` | `ws://localhost:9001` | Browser WebSocket to Mosquitto — use server IP for remote deploys |

See `.env.example` for all variables and `backend/env.example` for local dev overrides.

## Conventions
- Frontend styling lives entirely in `frontend/src/styles.css` — no CSS frameworks.
- Anomaly scoring thresholds: 0–44 nominal, 45–74 warning, 75+ critical.
- Timestamps stored as naive UTC (no timezone info) — be consistent.
- Tests: `pytest` for backend, `vitest` / `jest` for frontend.
- Do not add project-management or sprint-tracking UI to the production dashboard.
