# Sprint 08_xx: EMS Feature Audit + Carry-Over Summary

## Dates

- Start: 2026-04-30
- Updated: 2026-05-01

## Objective

Validate implemented features against code, close Sprint 08 as an audit/planning sprint, and carry unfinished EMS delivery items to a future sprint.

---

## Status: CLOSED (Audit Completed) ✅

## Code-Verified Baseline

| Area | Status | Evidence |
|------|--------|----------|
| Auth (register/login + JWT-protected API) | ✅ Implemented | `backend/app/routers/auth.py`, `backend/app/auth.py` |
| MQTT ingestion from `cooperative/device/{device_id}/sensor/{sensor_id}` | ✅ Implemented | `backend/app/mqtt_subscriber.py` |
| Historical readings API + latest API + device list | ✅ Implemented | `backend/app/routers/sensors.py` |
| Historical charts on frontend | ✅ Implemented | `frontend/src/components/HistoryChart.jsx`, `frontend/src/hooks/useSensorHistory.js` |
| Multi-device simulator and topic parser | ✅ Implemented | `esp32-simulators/src/Device.js`, `frontend/src/config.js` |
| Dockerized stack (mosquitto, postgres, backend, frontend, simulator, n8n) | ✅ Implemented | `docker-compose.yml` |
| Alembic migrations + PostgreSQL runtime path | ✅ Implemented | `backend/alembic/`, `backend/app/main.py`, `backend/Dockerfile` |
| Backend smoke tests for auth/sensors | ✅ Implemented | `backend/tests/test_api_smoke.py` |
| Backend CI workflow | ✅ Implemented | `.github/workflows/backend-ci.yml` |

---

## Sprint 08 Outcome

| Item | Result |
|------|--------|
| Audit and reconciliation of implemented features | ✅ Completed |
| CI/smoke-test baseline | ✅ Completed |
| n8n workflow implementation | ❌ Not delivered |
| KPI API + dashboard widgets | ❌ Not delivered |
| Incident lifecycle (DB + API + UI) | ❌ Not delivered |

---

## Carry-Over Backlog

1. n8n workflow automation and documented runbooks.
2. KPI aggregation endpoints and frontend KPI cards.
3. Incident lifecycle model, routes, and timeline UI.
4. Full CI/CD (lint/build/deploy stages).
5. Frontend automated tests.

---

## Notes

- Sprint 08 closed as a planning/alignment sprint, not a feature delivery sprint.
- Next sprint focus has been reprioritized to Sprint 09: Technician Sign-In + Account Recovery in `designDocs/09_xx_Technician_Auth/`.
