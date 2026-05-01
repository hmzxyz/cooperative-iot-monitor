# Sprint 08_xx: EMS Feature Audit + Next Sprint Plan

## Date

2026-04-30

## Objective

Review implemented features across the codebase, reconcile sprint reports with reality, and lock the next sprint around 3 high-impact EMS features.

---

## Status: IN PROGRESS 🚧

## Implemented Feature Audit (Code-Verified)

| Area | Status | Evidence |
|------|--------|----------|
| Auth (register/login + JWT-protected API) | ✅ Implemented | `backend/app/routers/auth.py`, `backend/app/auth.py` |
| MQTT ingestion from topic contract `cooperative/device/{device_id}/sensor/{sensor_id}` | ✅ Implemented | `backend/app/mqtt_subscriber.py` |
| Historical readings API + latest API + device list | ✅ Implemented | `backend/app/routers/sensors.py` |
| Historical charts on frontend | ✅ Implemented | `frontend/src/components/HistoryChart.jsx`, `frontend/src/hooks/useSensorHistory.js` |
| Multi-device simulator and topic parser | ✅ Implemented | `esp32-simulators/src/Device.js`, `frontend/src/config.js` |
| Dockerized stack (mosquitto, postgres, backend, frontend, simulator) | ✅ Implemented | `docker-compose.yml` |
| Alembic migrations + PostgreSQL runtime path | ✅ Implemented | `backend/alembic/`, `backend/Dockerfile`, `backend/app/main.py` |
| n8n automation service bootstrap | ✅ Implemented | `docker-compose.yml` (`n8n`, `n8n_data`, port `5678`) |

---

## Gaps Blocking Scale

| Gap | Current State |
|-----|---------------|
| Automated tests | Backend smoke tests added; frontend tests still missing |
| CI/CD | Backend CI workflow added; no full lint/build/deploy pipeline yet |
| n8n workflows | Service exists, but no versioned workflows/runbooks yet |
| Observability | Basic logs only, no alert policy/SLO tracking |

---

## 3 Main EMS Features for Upcoming Sprint

### 1) Workflow Automation & Alerting (n8n)
- Trigger alerts from sensor thresholds (temperature/humidity/weight/flow).
- Add escalation path (Telegram/Email/Slack webhook).
- Store workflow metadata and runbook in repo docs.

### 2) Operational KPI API + Dashboard Widgets
- Add aggregated KPI endpoints (per device and global): min/max/avg, throughput trend, stale device detection.
- Add frontend KPI cards and trend indicators.

### 3) Incident Timeline & Operator Actions
- Add incident model/table (`open`, `acknowledged`, `resolved`) with timestamps and actor.
- Add API endpoints and a frontend timeline panel for auditability.

---

## Sprint 08 Definition of Done

- [ ] At least 2 production-useful n8n workflows active and documented.
- [ ] KPI endpoint(s) merged and consumed by frontend widgets.
- [ ] Incident lifecycle implemented end-to-end (DB + API + UI).
- [x] Smoke tests for auth + sensors core routes added to backend.
- [x] CI pipeline created with backend test stage.

---

## Notes

- This report updates the implementation baseline as of 2026-04-30.
- Sprint 01–04 reports were synchronized to mark Sprint 05 and Sprint 06 as completed.
