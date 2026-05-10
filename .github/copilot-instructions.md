# GitHub Copilot Instructions

This workspace uses a Dockerized IoT monitoring stack: React + Vite frontend, FastAPI + SQLAlchemy backend, MQTT/Mosquitto, Node-RED flows, and ESP32 simulator/firmware sources.

## Purpose

Help AI assistants work productively in this repo by pointing to the right commands, architecture, conventions, and docs.

## Key entry points

- `README.md` - high-level project overview and quick start.
- `CLAUDE.md` - detailed component notes and commands for frontend/backend/simulator.
- `designDocs/docs/CONTRIBUTING.md` - contribution expectations.
- `backend/` - FastAPI API, auth, database, MQTT routing.
- `frontend/` - React dashboard, MQTT UI, vanilla CSS.
- `esp32-simulators/` - Node.js simulator publishing MQTT sensor streams.
- `esp32-firmware/` - Arduino firmware sketches.
- `simulation/` - Node-RED workspace and flows.

## Recommended workflow

1. Read `README.md` and `CLAUDE.md` before making changes.
2. Use `docker-compose up -d --build` for the canonical end-to-end startup.
3. Use backend `uv` commands in `backend/` for local package work.
4. Use frontend `npm` commands in `frontend/` for UI work.
5. Prefer linking to docs rather than copying architecture text into new files.

## Run commands

- Backend: `cd backend && uv sync && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Frontend: `cd frontend && npm install && npm run dev`
- Simulator: `cd esp32-simulators && npm install && npm start`
- Mosquitto: `mosquitto -c mosquitto.conf`
- Full local stack: `docker-compose up -d --build`

## Important conventions

- Backend uses PostgreSQL in Docker; SQLite is only for local backend experiments.
- Frontend uses vanilla CSS (no CSS framework).
- MQTT topics are central: current active contract is `cooperative/device/{device_id}/sensor/{sensor_id}`.
- Changes that affect runtime behavior should also update doc references in `README.md` / `CLAUDE.md`.
- There is existing auth and migration history under `backend/alembic/`.

## When adding or fixing features

- Update `backend/README.md` or `frontend/README.md` if setup changes are required.
- Keep pull request changes minimal and update durable project documentation when behavior changes.
- For backend work, use `pyproject.toml` and `requirements.txt` as dependency sources.

## Notes for AI assistants

- The codebase already documents architecture and commands; avoid duplicating large sections of `CLAUDE.md` or `README.md`.
- Use `designDocs/` as the planning source when a feature request references architecture rationale.
- If tests are added, choose the framework consistent with the area: `pytest` for backend and `vitest`/`jest` for frontend.
