# Sprint 1 – Real Sensor Integration

## Goal
Replace simulated sensor data with real hardware readings and expose configurable thresholds via the dashboard.

## Duration
~3 weeks (weeks 3‑5 of the project).

## Key Deliverables
- **ESP32 Firmware**
  - Add BMP280 driver (pressure & temperature).
  - Add HX711 driver (weight) with calibration routine.
  - Publish a unified JSON payload to MQTT, adding a `type` field (`bmp280` or `hx711`).
- **Backend**
  - New `Threshold` model (SQLAlchemy) with CRUD API (`/api/thresholds`).
  - Update the dashboard to fetch thresholds instead of hard‑coded values.
- **Frontend**
  - Extend `GaugeCard` to respect dynamic thresholds.
  - Add UI for threshold configuration (min/max alerts). 

## Important Files
- `esp32-firmware/main.ino` – sensor drivers & MQTT publishing.
- `backend/app/models/threshold.py` – SQLAlchemy model.
- `backend/app/api/thresholds.py` – FastAPI router.
- `frontend/src/components/GaugeCard.tsx` – UI threshold handling.

## Testing
- **Hardware** – Verify BMP280 vs. reference sensor, HX711 calibration (1 kg → ±0.02 kg).
- **Backend** – pytest for CRUD endpoints.
- **Frontend** – Manual UI test + Cypress for threshold update flow.

## Risks & Mitigations
- Sensor drift – auto‑zero routine every 10 readings.
- Power noise – moving‑average filter in firmware.

---
*This sprint builds directly on the stabilized auth system from Sprint 0.*