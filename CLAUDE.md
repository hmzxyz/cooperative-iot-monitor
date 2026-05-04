# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

Cooperative IoT Monitor is a real-time sensor monitoring system for cooperative production environments. ESP32 devices and simulators publish readings over MQTT; the FastAPI backend persists readings and exposes authenticated APIs; the React dashboard displays live, historical, and predictive sensor views.

Stack: React 18 + Vite, FastAPI + SQLAlchemy, Mosquitto, SQLite for local development, PostgreSQL for Docker/production, and ESP32 firmware using Arduino C++.

## Commands

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
uv run pytest
```

Dependencies are declared in `backend/pyproject.toml`. Keep `backend/requirements.txt` aligned for pip-based installs.

### ESP32 Simulator

```bash
cd esp32-simulators
npm install
npm start
```

Environment overrides: `MQTT_BROKER_URL`, `PUBLISH_INTERVAL_MS`.

### MQTT Broker

```bash
mosquitto -c mosquitto/mosquitto.conf
```

The broker needs TCP on `1883` for backend/simulator/firmware and WebSocket on `9001` for the browser MQTT client.

## Environment Variables

Frontend:
- `VITE_API_BASE_URL` defaults to `http://localhost:8000/api`
- `VITE_WS_URL` defaults to `ws://localhost:9001`

Backend:
- `JWT_SECRET_KEY` should be set for non-local use
- `DATABASE_URL` can point to PostgreSQL; local default is `sqlite:///./sensors.db`
- `MQTT_BROKER_HOST` / `MQTT_BROKER_PORT` default to `localhost:1883`

## Architecture

### Data Flow

```text
ESP32 or simulator -> MQTT broker -> backend subscriber -> database
                                  -> frontend MQTT.js client
```

The frontend connects directly to Mosquitto over WebSocket for live readings. If the broker is unreachable or stale, `MqttManager.js` switches to the mock data fallback.

### Frontend

- `frontend/src/App.jsx` owns dashboard sensor state, connection status, mock mode, backend hydration, and broker switching.
- `frontend/src/MqttManager.js` manages MQTT.js connection lifecycle, topic subscription, stale-data detection, and mock fallback.
- `frontend/src/config.js` defines the MQTT topic contract and sensor display metadata.
- `frontend/src/components/AlertsSidebar.jsx` renders the system report, alerts, and failure prediction panels.
- `frontend/src/components/HistoryChart.jsx` renders native SVG history charts from `GET /api/sensors/`.
- `frontend/src/context/AuthContext.jsx` stores JWT/session state and exposes login, registration, password reset, and logout helpers.

### Backend

- `backend/app/main.py` registers auth, sensor, prediction, and health routes.
- `backend/app/database.py` configures SQLAlchemy and local SQLite initialization.
- `backend/app/mqtt_subscriber.py` subscribes to `cooperative/device/+/sensor/+` and persists readings.
- `backend/app/models/sensor_reading.py` and `backend/app/models/user.py` define ORM models.
- `backend/app/routers/auth.py` exposes account, login, password reset, and technician administration routes.
- `backend/app/routers/sensors.py` exposes current and historical sensor readings.
- `backend/app/routers/prediction_service.py` exposes rule-based failure prediction and system summary routes.
- Alembic migrations live in `backend/alembic/versions/`.

### MQTT Topic Contract

Firmware, simulator, backend, and frontend share this topic format:

```text
cooperative/device/{device_id}/sensor/{sensor_id}
```

Payloads are numeric strings for `temperature`, `humidity`, `weight`, and `flow`.

## Constraints

- Frontend styling uses vanilla CSS in `frontend/src/styles.css`.
- Keep the mock sensor fallback; it is part of the user experience when hardware is offline.
- Do not add internal project-management tracking UI to the production dashboard.
- Local SQLite databases, generated build output, egg-info metadata, and backup files should stay untracked.
