# Cooperative IoT Monitor

A simulated IoT monitoring system for cooperative production.

## Overview

This repository is a proof-of-concept for a cooperative production monitoring system using MQTT and an ESP32 device.

### Components

- `esp32-firmware/esp32-firmware.ino` — ESP32 firmware that publishes sensor data to an MQTT broker.
- `frontend/webpage/main.html` — Browser dashboard interface for monitoring values.
- `backend/` — Placeholder for backend services and data processing logic.
- `docs/` — Project documentation and setup notes.
- `sql/` — Database scripts or schema files.

## Getting Started

1. Install an MQTT broker such as Mosquitto.
2. Configure the broker for local network access.
3. Deploy the ESP32 firmware to your ESP32 board.
4. Open `frontend/webpage/main.html` in a web browser or serve it from a local web server.
5. The repository now includes a FastAPI backend scaffolding under `backend/` and a React + Vite dashboard under `frontend/`.

## Quick Start

- Backend:
  - Create a Python virtual environment, install `backend/requirements.txt`, and run `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` from the `backend/` directory.
  - Configure environment values in `backend/.env.example` and use a local PostgreSQL instance.
- Frontend:
  - From `frontend/`, install dependencies with `npm install` and start the dashboard with `npm run dev`.

## Notes

- `docs/notes/MQTT.md` contains MQTT broker setup guidance.
- `frontend/webpage/main.html` is a simple static dashboard example.
- `frontend/` also contains a React starter app with router, Tailwind, and TanStack Query.
- `backend/` is now scaffolded with FastAPI, SQLAlchemy, Alembic, JWT auth, and MQTT ingestion.

## Recommended Files

- `.gitignore` — Ignore IDE files, build artifacts, and temporary files.
