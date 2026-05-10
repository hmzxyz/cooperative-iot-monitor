# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

Cooperative IoT Monitor is a Dockerized industrial monitoring system. Node-RED and simulator flows publish machine readings to MQTT, FastAPI persists bundle-style rows in PostgreSQL, and the React dashboard reads back machine histories and latest values.

Stack: React 18 + Vite, FastAPI + SQLAlchemy, Mosquitto, PostgreSQL, Node-RED flows, and ESP32 simulator/firmware sources.

## Commands

### Docker

```bash
docker-compose up -d --build
docker-compose logs -f backend
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
```

### Backend

```bash
cd backend
uv sync
uv run pytest
uv run alembic upgrade head
```

### Simulator and MQTT

```bash
cd esp32-simulators
npm install
npm start
```

Mosquitto serves TCP on `1883` and WebSocket on `9001`.

## Environment Variables

Frontend:
- `VITE_API_BASE_URL` defaults to `http://localhost:8000/api`
- `VITE_WS_URL` defaults to `ws://localhost:9001`

Backend:
- `JWT_SECRET_KEY` should be set for non-local use
- `DATABASE_URL` defaults to PostgreSQL in Docker
- `MQTT_BROKER_HOST` / `MQTT_BROKER_PORT` default to `mosquitto:1883` in Docker

## Architecture

### Data Flow

```text
Node-RED / ESP32 simulator -> MQTT broker -> backend -> PostgreSQL -> frontend
```

The frontend can still connect to Mosquitto over WebSocket for live values, but the canonical dashboard source is the persisted database rows.

### Frontend

- `frontend/src/App.jsx` owns dashboard sensor state, selected machine, and backend hydration.
- `frontend/src/MqttManager.js` manages MQTT.js connection lifecycle, topic subscription, stale-data detection, and mock fallback.
- `frontend/src/config.js` defines the MQTT topic contract and sensor display metadata.
- `frontend/src/components/HistoryChart.jsx` renders native SVG history charts from `GET /api/sensors/`.
- `frontend/src/context/AuthContext.jsx` stores JWT/session state and exposes login, registration, password reset, and logout helpers.

### Backend

- `backend/app/main.py` registers auth, sensor, prediction, and health routes.
- `backend/app/database.py` configures SQLAlchemy and database startup.
- `backend/app/models/sensor_reading.py` and `backend/app/models/user.py` define ORM models.
- `backend/app/routers/auth.py` exposes account, login, password reset, and technician administration routes.
- `backend/app/routers/sensors.py` exposes current and historical sensor readings from persisted bundle rows.
- `backend/app/routers/predict.py` exposes the dashboard analytics payload from the latest persisted row.
- Alembic migrations live in `backend/alembic/versions/`.

### MQTT Topic Contract

```text
cooperative/device/{device_id}/sensor/{sensor_id}
```

Current machine sensors are `temperature`, `vibration`, `current_amp`, `weight_kg`, and `level_percent`.

## Constraints

- Frontend styling uses vanilla CSS in `frontend/src/styles.css`.
- Keep the mock sensor fallback; it is a user feature for offline hardware.
- Do not add internal project-management tracking UI to the production dashboard.
- Local SQLite databases, generated build output, egg-info metadata, and backup files should stay untracked.
