# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cooperative IoT Monitor — a real-time sensor monitoring system for cooperative production environments. It collects data from ESP32 microcontrollers over MQTT and displays it on a React dashboard backed by a FastAPI API.

**Stack**: React 18 + Vite (frontend), FastAPI + SQLAlchemy (backend), Mosquitto (MQTT broker), PostgreSQL, ESP32 firmware (Arduino C++)

## Commands

### Frontend

```bash
cd frontend
npm install        # install dependencies
npm run dev        # dev server at http://localhost:5173
npm run build      # production build to frontend/dist/
npm run preview    # preview production build
```

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# SQLite DB is auto-created as backend/sensors.db on first run
pytest                 # run tests (not yet configured)
```

### ESP32 Simulator (replaces physical hardware during dev)

```bash
cd esp32-simulators
npm install
npm start              # publishes to mqtt://localhost:1883 every 2 s
# env overrides: MQTT_BROKER_URL, PUBLISH_INTERVAL_MS
```

### MQTT Broker (Mosquitto)

```bash
mosquitto -c mosquitto.conf   # start broker on port 1883
```

## Environment Variables

**Frontend** (create `frontend/.env`):
- `VITE_API_BASE_URL` — backend URL (default: `http://localhost:8000/api`)
- `VITE_WS_URL` — WebSocket URL (default: `ws://localhost:8000/ws`)

**Backend** (create `backend/.env`):
- `JWT_SECRET_KEY` — required for auth
- `DATABASE_URL` — PostgreSQL connection string
- `MQTT_BROKER_HOST` / `MQTT_BROKER_PORT` — broker address (default: `localhost:1883`)

## Architecture

### Data Flow

```
ESP32 → MQTT broker (port 1883) → Backend subscriber → PostgreSQL
                                → Frontend MQTT.js (WebSocket port 9001)
```

The frontend connects directly to the MQTT broker over WebSocket (`ws://localhost:9001`) using **MQTT.js**, bypassing the backend for real-time display. If the broker is unreachable after 5 seconds, `MqttManager.js` automatically switches to mock data mode.

### Frontend (`frontend/src/`)

- **`App.jsx`** — root component; owns sensor state, connection status, and mock-mode flag
- **`MqttManager.js`** — MQTT client lifecycle, topic subscriptions, mock data fallback; connects to `ws://localhost:9001` by default with `wss://test.mosquitto.org:8081` as fallback
- **`config.js`** — MQTT broker URLs and topic definitions (`cooperative/sensor/{temperature,humidity,weight,flow}`)
- **`SensorCard.jsx`** — reusable display card for a single sensor reading
- **`AuthContext.jsx`** — `AuthProvider` + `useAuth()` hook; stores JWT in `localStorage`; exposes `login()`, `logout()`, `isAuthenticated`
- **`pages/LoginPage.jsx`** — login form; calls `POST /api/auth/login`
- **`api.js`** — `apiFetch(path, token)` — adds `Authorization: Bearer` header, throws `"unauthorized"` on 401
- **`hooks/useSensorHistory.js`** — polls `GET /api/sensors/` every 10 s; auto-calls `logout()` on 401
- **`components/HistoryChart.jsx`** — recharts `LineChart` for a single sensor's history (last 40 readings)

### Backend (`backend/app/`)

- **`main.py`** — FastAPI app; `lifespan` calls `init_db()` then `start_subscriber()`
- **`database.py`** — SQLite engine (`sensors.db`), `SessionLocal`, `init_db()`
- **`mqtt_subscriber.py`** — paho-mqtt daemon thread; subscribes to `cooperative/sensor/*`, persists each message as a `SensorReading`
- **`models/sensor_reading.py`** — SQLAlchemy ORM model (`id`, `sensor_id`, `payload` JSON, `timestamp`)
- **`routers/sensors.py`** — `GET /api/sensors/` (list, filterable) and `GET /api/sensors/latest`
- **`auth.py`** — `hash_password`, `verify_password`, `create_access_token`, `get_current_user` FastAPI dependency (Bearer token via `OAuth2PasswordBearer`)
- **`models/user.py`** — `User` ORM model (`id`, `username`, `hashed_password`, `created_at`)
- **`routers/auth.py`** — `POST /api/auth/register` and `POST /api/auth/login` (form-encoded, returns JWT)
- **`config.py`** — reads env vars including `JWT_SECRET_KEY`

### ESP32 Simulator (`esp32-simulators/`)

- **`index.js`** — loads `config/devices.json`, spawns one `Device` per entry
- **`config/devices.json`** — declarative list of simulated devices (`deviceId`, `location`, `publishIntervalMs`)
- **`src/Device.js`** — one Device = one ESP32: manages MQTT client, ticks sensors, checks thresholds, publishes data + retained status heartbeat
- **`src/sensors/`** — `BaseSensor` (random walk), `TemperatureSensor`, `HumiditySensor` (inversely correlated with temp), `WeightSensor` (fill/drain production cycle), `FlowSensor` (derived from weight state)
- Topics published: `cooperative/device/{deviceId}/sensor/{type}` and `cooperative/device/{deviceId}/status`
- Alert thresholds defined in `Device.js`: warning/critical per sensor type; logged to console with `ALERT` prefix

### ESP32 Firmware (`esp32-firmware/`)

Single `.ino` file. Publishes JSON every 5 s to topic `esp32/sensors`:
```json
{"temperature": X, "pressure": Y, "milk_weight": Z, "alert": "nominal|warning|critical", "timestamp": T}
```
Note: the firmware topic (`esp32/sensors`) differs from the frontend-subscribed topics (`cooperative/sensor/*`) — bridging or topic remapping is needed.

## Key Constraints

- The frontend uses **vanilla CSS** (no CSS framework). The dark-theme dashboard lives in `styles.css` with a CSS grid layout that collapses to single-column below 840 px.
- No test framework is configured yet (neither `vitest`/Jest for frontend nor `pytest` setup for backend). When adding tests, pick the appropriate tool and configure it.
- **No Alembic yet** — `init_db()` uses `Base.metadata.create_all` directly. Alembic deferred to the auth sprint.
- **SQLite** is used for local dev (`backend/sensors.db`). Swap `DATABASE_URL` in `database.py` to use PostgreSQL in production.
- Docker/docker-compose files were removed; planned for a later sprint.
- Mosquitto must have **both** a TCP listener on 1883 (for backend + simulator) and a WebSocket listener on 9001 (for the browser MQTT client).
