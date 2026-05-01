# Sprint 08_xx Execution Checklist

## Goal

Start Sprint 08 immediately with a clear sequence, owners, and verification points.

## Day 1 Setup

- [ ] Confirm production-like `.env` values for `backend`, `postgres`, and `n8n`.
- [ ] Start stack: `docker compose up --build`.
- [ ] Verify health:
  - frontend: `http://localhost`
  - backend: `http://localhost:8000/health`
  - n8n: `http://localhost:5678`

## Workstream A: n8n Automations

- [ ] Create workflow: sensor threshold breach -> alert notification.
- [ ] Create workflow: stale device (no readings for X minutes) -> incident creation.
- [ ] Export and document workflows in `designDocs/08_Plan_For_the_3_Main_Features_of_EMS/`.

## Workstream B: KPI Backend + Frontend

- [ ] Add backend KPI endpoint(s) under `/api/sensors/` or `/api/kpi/`.
- [ ] Add frontend KPI widgets with polling and error states.
- [ ] Validate against multi-device simulator data.

## Workstream C: Incident Lifecycle

- [ ] Add DB schema migration for incidents.
- [ ] Add incident API routes (`create`, `list`, `ack`, `resolve`).
- [ ] Add frontend incident list/timeline with action buttons.

## Quality Gate

- [x] Add minimal backend tests for auth + sensor core routes.
- [x] Add CI workflow for backend tests.
- [ ] Update sprint report with final endpoint list and screenshots.

## Exit Criteria

- [ ] All three EMS features demonstrable in one local run.
- [ ] Deployment steps documented with exact commands.
- [ ] Risk list and next sprint backlog prepared.
