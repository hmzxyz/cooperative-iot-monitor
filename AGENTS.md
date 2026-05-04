# AGENTS.md

This file gives coding agents the durable project context for this repository.

## Project Overview

Cooperative IoT Monitor is a real-time sensor monitoring system for cooperative production environments. ESP32 boards and simulators publish MQTT readings; the FastAPI backend stores them and exposes authenticated APIs; the React dashboard shows live readings, history, operational alerts, and rule-based failure predictions.

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

Keep `backend/pyproject.toml` and `backend/requirements.txt` aligned when dependencies change.

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

Mosquitto needs TCP on `1883` for backend/simulator/firmware and WebSocket on `9001` for the browser client.

## Environment Variables

Frontend:
- `VITE_API_BASE_URL` defaults to `http://localhost:8000/api`
- `VITE_WS_URL` defaults to `ws://localhost:9001`

Backend:
- `JWT_SECRET_KEY` should be set outside local development
- `DATABASE_URL` can point to PostgreSQL; local default is `sqlite:///./sensors.db`
- `MQTT_BROKER_HOST` / `MQTT_BROKER_PORT` default to `localhost:1883`

## Runtime Architecture

```text
ESP32 or simulator -> MQTT broker -> backend subscriber -> database
                                  -> frontend MQTT.js client
```

The frontend connects directly to Mosquitto over WebSocket for live values. `MqttManager.js` keeps the mock fallback active when MQTT is unavailable or stale.

## Important Files

Frontend:
- `frontend/src/App.jsx` owns dashboard sensor state, connection status, mock mode, backend hydration, and broker switching.
- `frontend/src/MqttManager.js` manages MQTT.js connection lifecycle, topic subscriptions, stale-data detection, and mock fallback.
- `frontend/src/config.js` defines MQTT topics and sensor display metadata.
- `frontend/src/components/AlertsSidebar.jsx` renders the system report, alerts, and failure prediction panels.
- `frontend/src/components/HistoryChart.jsx` renders native SVG history charts.
- `frontend/src/context/AuthContext.jsx` stores JWT/session state and auth helpers.

Backend:
- `backend/app/main.py` registers auth, sensor, prediction, and health routes.
- `backend/app/database.py` configures SQLAlchemy and local SQLite initialization.
- `backend/app/mqtt_subscriber.py` subscribes to `cooperative/device/+/sensor/+` and persists readings.
- `backend/app/models/sensor_reading.py` and `backend/app/models/user.py` define ORM models.
- `backend/app/routers/auth.py`, `sensors.py`, and `prediction_service.py` expose the API.
- Alembic migrations live in `backend/alembic/versions/`.

Firmware and simulator:
- `esp32-simulators/` publishes realistic multi-device readings and retained device status.
- `esp32-firmware/` contains Arduino sketches that publish numeric MQTT readings.

## MQTT Topic Contract

```text
cooperative/device/{device_id}/sensor/{sensor_id}
```

Payloads are numeric strings for `temperature`, `humidity`, `weight`, and `flow`.

## Constraints

- Frontend styling uses vanilla CSS in `frontend/src/styles.css`.
- Keep the mock sensor fallback; it is a user feature for offline hardware.
- Do not add internal project-management tracking UI to the production dashboard.
- Local SQLite databases, generated build output, egg-info metadata, and backup files should stay untracked.
