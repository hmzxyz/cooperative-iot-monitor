# Codex Working Memory — Cooperative IoT Monitor

Last updated: 2026-04-25

## Project Snapshot

This repository currently has four runtime surfaces:

1. `backend/` — FastAPI + SQLAlchemy API, JWT auth, MQTT subscriber, SQLite storage.
2. `frontend/` — React + Vite dashboard, browser MQTT client, login flow, history charts.
3. `esp32-simulators/` — Node.js multi-device MQTT publisher using the same `cooperative/device/{id}/sensor/{sensor}` topic family as frontend/backend.
4. `esp32-firmware/` — Arduino firmware publishing per-sensor MQTT values to the same topic family as backend/frontend.

Main integration contract today (frontend + backend + simulator):
- Topic format: `cooperative/device/{device_id}/sensor/{sensor_id}`
- Payload format: plain numeric string (parsed as float)
- Sensor ids used in app: `temperature`, `humidity`, `weight`, `flow`

## Architecture Notes

- Backend entrypoint: `backend/app/main.py`
  - Initializes DB on startup.
  - Starts MQTT subscriber in lifespan startup with non-blocking connect.
  - Keeps API boot alive even if broker is unavailable.
  - Exposes `/api/auth/*`, `/api/sensors/*`, and `/health`.
- DB models:
  - `SensorReading` (JSON payload + timestamp) in `backend/app/models/sensor_reading.py`
  - `User` in `backend/app/models/user.py`
- Frontend entrypoint: `frontend/src/main.jsx`
  - Auth token in localStorage.
  - Username persisted in localStorage for session display.
  - Login page supports one-click test admin bootstrap (`admin/admin`) via `/api/auth/register` + `/api/auth/login`.
  - Dashboard toggles between live MQTT and mock fallback.
  - History charts poll backend every 10s and render with native SVG.
- Simulator publishes realistic sensor streams and status heartbeat.

## Resolved Issues (2026-04-25)

### P1 — Backend install compatibility regression (resolved)
- `backend/pyproject.toml` now uses `requires-python = ">=3.11"`.
- `backend/requirements.txt` restored as compatibility install path.
- Added missing runtime dependency `python-multipart` to both backend dependency entrypoints.
- Root README quickstart updated to valid backend commands.

### P1 — Frontend build break from `recharts` lock drift (resolved)
- Removed `recharts` dependency from runtime path.
- Replaced chart rendering with native SVG in `frontend/src/components/HistoryChart.jsx`.
- `frontend/package.json` now matches lockfile dependency set.
- `npm run build` passes.

### P1 — Firmware/app MQTT contract mismatch (resolved)
- Firmware now publishes:
  - `cooperative/device/{device_id}/sensor/temperature`
  - `cooperative/device/{device_id}/sensor/humidity`
  - `cooperative/device/{device_id}/sensor/weight`
  - `cooperative/device/{device_id}/sensor/flow`
- Payloads are numeric strings, matching backend/frontend expectations.

### P2 — Backend startup hard-fail risk when broker is down (resolved)
- MQTT subscriber now uses `connect_async + loop_start + reconnect_delay_set`.
- Lifespan startup catches subscriber init failures and continues API startup.

### P2 — README stale paths/setup (resolved)
- Root README now references existing paths (`frontend/`, `designDocs/`, `.env.example`) and valid setup commands.
- Added `backend/.env.example`.

## Current Open Risks

### P2 — Default JWT secret remains weak for production
- `backend/app/auth.py` still defaults to `change-me-in-production` when env var is unset.
- Acceptable for local dev; production should require explicit secret configuration.

## Verification Log (2026-04-25)

- `python3 -m compileall app` in `backend/`: pass.
- `npm run build` in `frontend/`: pass.
- Firmware was updated for topic contract, but no Arduino compile/upload was run in this session.

## Verification Log (2026-04-25, smoke run)

- Backend env setup:
  - created `backend/.venv-test`
  - installed backend deps from `backend/requirements.txt`
  - installed `python-multipart` and `httpx` for runtime/testability
- Backend startup:
  - command: `.venv-test/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`
  - result: API starts and shuts down cleanly under timeout
  - note: MQTT thread creation raises `PermissionError` in this sandbox (`socket` restricted), but app continues startup by design
- Frontend:
  - `npm run build`: pass
  - `npm run dev -- --host 127.0.0.1 --port 5174`: blocked in sandbox (`listen EPERM`)
- Simulator:
  - `npm install` in `esp32-simulators`: pass
  - `npm start`: process starts; repeated reconnect/disconnect logs expected without local MQTT broker

## Verification Log (2026-04-25, frontend auth UX update)

- Updated login UX while preserving theme:
  - explicit test-admin action button (`Use Admin Test User`)
  - helper text showing test credentials
  - dashboard now shows current signed-in username badge
- Added auto-provision flow in frontend auth context:
  - attempts `POST /api/auth/register` for `admin/admin` if needed
  - then signs in via `POST /api/auth/login`
- `npm run build` in `frontend/`: pass

## Ongoing Update Protocol (for future Codex sessions)

When we work on this repo again, update this file in-place:

1. Update `Last updated`.
2. Append/remove findings in severity order (P1 first).
3. Record what was verified (command + pass/fail).
4. Keep architecture notes aligned with actual code paths.
