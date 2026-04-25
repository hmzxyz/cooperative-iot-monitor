# Cooperative IoT Monitor

A simulated IoT monitoring system for cooperative production.

## Overview

This repository is a proof-of-concept for a cooperative production monitoring system using MQTT and an ESP32 device.

### Components

- `backend/` — FastAPI API with JWT auth, MQTT ingestion, and SQLite persistence.
- `frontend/` — React + Vite dashboard with login, live MQTT cards, and history charts.
- `esp32-simulators/` — Node.js simulator that publishes realistic multi-device sensor streams.
- `esp32-firmware/esp32-firmware.ino` — ESP32 firmware that publishes sensor streams over MQTT.
- `designDocs/` — sprint notes and implementation docs.

## Getting Started

1. Install an MQTT broker such as Mosquitto.
2. Configure the broker for local network access.
3. Start the backend API (`backend/`).
4. Start the frontend dashboard (`frontend/`).
5. Publish data using `esp32-simulators/` or `esp32-firmware/`.

## Quick Start

- Backend:
  - Create a Python virtual environment and install dependencies:
    - `pip install -r backend/requirements.txt` (compat path), or
    - `cd backend && uv sync`.
  - Copy `backend/.env.example` to `.env` if needed.
  - From `backend/`, run:
    - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Frontend:
  - From `frontend/`, install dependencies with `npm install` and start the dashboard with `npm run dev`.
- Simulator (optional):
  - From `esp32-simulators/`, run `npm install && npm start`.

## Notes

- MQTT broker setup guidance is in `designDocs/00_Inception/notes/MQTT.md`.
- Backend uses SQLite by default (`backend/sensors.db`).
- Active topic contract:
  - `cooperative/device/{device_id}/sensor/{sensor_id}`
  - numeric payloads for `temperature`, `humidity`, `weight`, `flow`

## Recommended Files

- `.gitignore` — Ignore IDE files, build artifacts, and temporary files.
