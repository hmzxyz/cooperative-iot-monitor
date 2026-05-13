# Cooperative IoT Monitor

Dockerized industrial IoT monitoring for cooperative production.

## Stack

- `frontend/` - React 18 + Vite dashboard.
- `backend/` - FastAPI + SQLAlchemy API with Alembic migrations.
- `esp32-simulators/` - Node.js sensor simulator.
- `simulation/` - Node-RED simulation flows for the machine bundle.
- `mosquitto/` - MQTT broker config with TCP `1883` and WebSocket `9001`.

## Quick Start

1. Start the full stack: `docker-compose up -d --build`
2. Open the dashboard: `http://localhost`
3. API health check: `http://localhost:8000/health`
4. MQTT broker ports: TCP `1883`, WebSocket `9001`

## Data Flow

`Node-RED or simulator -> Mosquitto -> FastAPI -> PostgreSQL -> React dashboard`

## Database Contract

The active Postgres table is `sensor_readings` with bundle-style rows:

- `device_id`
- `sensor_id` as the machine type
- `tick`
- `status`
- `anomaly_score`
- `decision_reason` JSONB
- `sensors` JSONB
- `timestamp`

## Important Endpoints

- `GET /api/sensors/devices`
- `GET /api/sensors/latest?device_id=...`
- `GET /api/sensors/?sensor_id=...&device_id=...&limit=40`

## Docs

- `backend/README.md`
- `designDocs/README.md`
- `docs/sprints.md`
