# Sprint 05: Docker Compose

## Objective

One-command boot of the full stack: `docker compose up --build` starts Mosquitto, PostgreSQL, backend (FastAPI), frontend (Nginx), and the ESP32 simulator together.

---

## Status: DONE ✅

| Task | Status |
|------|--------|
| `backend/Dockerfile` — Python 3.12-slim, pip install, alembic + uvicorn CMD | ✅ |
| `frontend/Dockerfile` — multi-stage: Node 20 build → Nginx 1.27 serve | ✅ |
| `frontend/nginx.conf` — SPA fallback + `/api/` reverse-proxy to backend | ✅ |
| `esp32-simulators/Dockerfile` — Node 20-alpine | ✅ |
| `mosquitto/mosquitto.conf` — TCP :1883 + WebSocket :9001 | ✅ |
| `docker-compose.yml` — all 5 services, healthchecks, named volume | ✅ |
| `.env.example` — all env vars documented | ✅ |
| `.dockerignore` — backend, frontend, simulator | ✅ |
| `frontend/src/config.js` — `VITE_WS_URL` read from env var | ✅ |

---

## Architecture

### Service Map

```
┌──────────────────────────────────────────────────┐
│  docker compose up                               │
│                                                  │
│  mosquitto  ──── :1883 (TCP)   ─── backend       │
│             ──── :9001 (WS)    ─── browser       │
│                                                  │
│  postgres   ──── :5432         ─── backend       │
│                                                  │
│  backend    ──── :8000         ─── frontend(Nginx)│
│                                                  │
│  frontend   ──── :80           ─── browser       │
│             /api/ ──proxy──► backend:8000        │
│                                                  │
│  simulator  ──── mqtt://mosquitto:1883           │
└──────────────────────────────────────────────────┘
```

### Port Map

| Service | Host port | Purpose |
|---------|-----------|---------|
| frontend (Nginx) | 80 | React SPA + API proxy |
| backend (FastAPI) | 8000 | REST API (also reachable direct) |
| mosquitto TCP | 1883 | backend + simulator MQTT |
| mosquitto WS | 9001 | browser MQTT.js direct connection |
| postgres | 5432 | DB (local access for admin tools) |

### Nginx Proxy

The frontend container serves the Vite build at `/` and proxies `/api/` to `http://backend:8000`. This means:
- Browser only needs port 80 for the web UI + API.
- `VITE_API_BASE_URL=/api` (relative URL, no CORS issues).
- Port 8000 is still exposed directly for dev convenience / health checks.

### MQTT WebSocket

The browser connects directly to Mosquitto at `ws://localhost:9001` (Docker exposes the port on the host). This cannot be proxied through Nginx because the MQTT WS protocol is not HTTP. In production, expose port 9001 on the server or configure a dedicated reverse proxy for MQTT WS.

---

## Quick Start

```bash
cp .env.example .env
# edit .env — at minimum set JWT_SECRET_KEY for production
docker compose up --build
```

- Dashboard: http://localhost
- API docs: http://localhost:8000/docs
- Stop: `docker compose down`
- Wipe DB: `docker compose down -v`

To skip the simulator (real hardware):
```bash
docker compose up --build mosquitto postgres backend frontend
```

---

## File Changes

```
backend/
  Dockerfile                   NEW
  .dockerignore                NEW
mosquitto/
  mosquitto.conf               NEW
frontend/
  Dockerfile                   NEW
  nginx.conf                   NEW
  .dockerignore                NEW
  src/config.js                UPDATED — DEFAULT_BROKER_URL reads VITE_WS_URL
esp32-simulators/
  Dockerfile                   NEW
  .dockerignore                NEW
docker-compose.yml             NEW
.env.example                   NEW
```

---

## TODO — Next Sprints

- [x] **Sprint 01** — ESP32 Simulator (basic)
- [x] **Sprint 02** — Auth (JWT login, protected routes)
- [x] **Sprint 03** — Historical charts
- [x] **Sprint 04** — Multi-device simulator
- [x] **Sprint 05** — Docker Compose ← **current**
- [x] **Sprint 06** — Alembic migrations, PostgreSQL
