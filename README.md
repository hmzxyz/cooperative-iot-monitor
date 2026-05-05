# Cooperative IoT Monitor

A simulated IoT monitoring system for cooperative production.

## Overview

This repository is a proof-of-concept for cooperative production monitoring using MQTT, FastAPI, React, and ESP32 profiles.

### Components

- `backend/` — FastAPI API with JWT auth, MQTT ingestion, SQLite local storage, and PostgreSQL support.
- `frontend/` — React + Vite dashboard with login, live MQTT cards, AI technician recommendations, and history charts.
- `esp32-simulators/` — Node.js simulator that publishes realistic multi-device sensor streams.
- `esp32-firmware/` — ESP32 firmware profiles and upload notes.
- `designDocs/` — architecture notes, implementation history, and PFE reference material.

## Getting Started

1. Install an MQTT broker such as Mosquitto.
2. Configure the broker for local network access.
3. Start the backend API (`backend/`).
4. Start the frontend dashboard (`frontend/`).
5. Publish data using `esp32-simulators/` or `esp32-firmware/`.

## Quick Start

- One-command local stack:
  - `./run_local_stack.sh`
  - Optional (real ESP32 only): `RUN_SIMULATOR=0 ./run_local_stack.sh`
  - Optional (reuse existing MQTT broker on `localhost:1883`): `RUN_MOSQUITTO=0 ./run_local_stack.sh`
- Backend:
  - Create/install dependencies:
    - `pip install -r backend/requirements.txt`, or
    - `cd backend && uv sync`
  - Run:
    - `cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Frontend:
  - `cd frontend && npm install && npm run dev`
- Simulator (optional):
  - `cd esp32-simulators && npm install && npm start`

## Notes

- MQTT broker setup guidance is in `designDocs/00_Inception/notes/MQTT.md`.
- Backend uses SQLite by default (`backend/sensors.db`).
- Backend migrations include account role and recovery columns (`backend/alembic/versions/002_add_user_account_columns.py`).
- AI analytics are served by `GET /api/predict/analytics` using a simple trend and anomaly model.
- Active topic contract:
  - `cooperative/device/{device_id}/sensor/{sensor_id}`
  - numeric payloads for `temperature`, `humidity`, `weight`, `flow`
## Key Docs

- `backend/README.md`
- `esp32-firmware/README.md`
- `designDocs/README.md`
