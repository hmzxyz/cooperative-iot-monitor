# Deletion and Archival Plan

Date: 2026-05-15

Scope: documentation-only plan. No files are deleted, moved, or edited by this plan.

This plan uses `docs/implementation_gap_analysis.md` as the current repository diagnosis. No separate conception file is assumed. The target architecture is: Node-RED is the active simulator; Node-RED publishes telemetry through Mosquitto; FastAPI is the backend authority that validates, persists to PostgreSQL, and exposes data to React; React consumes backend APIs and/or backend WebSocket; anomaly detection is threshold/rule-based; only `admin` and `technician` roles are current runtime roles; ESP32 hardware is future work.

## 1. Keep in Main Runtime

These items remain in the primary runtime, although some need small alignment work listed later.

| Path | Recommendation | Evidence |
|---|---|---|
| `docker-compose.yml` | Keep as the runtime orchestrator. | It defines the active services: `mosquitto`, `postgres`, `nodered`, `backend`, and `frontend`. It does not define `esp32-simulators`, which supports treating Node-RED as the canonical simulator. |
| `mosquitto/mosquitto.conf` | Keep. | `docker-compose.yml` mounts it into the Mosquitto service, and it exposes MQTT `1883` plus WebSocket `9001`. |
| `backend/app/main.py` | Keep. | It is the FastAPI app entrypoint and registers `auth`, `admin`, `analyze`, `sensors`, `predict`, and `ws` routers. |
| `backend/app/database.py` | Keep. | It configures async SQLAlchemy against PostgreSQL by default. This matches PostgreSQL as the runtime store. |
| `backend/app/models/user.py` | Keep. | It stores users, roles, block state, and login metadata. |
| `backend/app/models/sensor_reading.py` | Keep. | It models `status`, `anomaly_score`, `decision_reason`, `sensors` JSONB, and `payload` JSONB, matching the target storage contract. |
| `backend/alembic/` | Keep. | `backend/entrypoint.sh` runs `alembic upgrade head` before starting FastAPI. |
| `backend/app/routers/auth.py` | Keep, but align roles. | `backend/app/main.py` registers it. It currently implements login/register/OTP, but allows `viewer`, which conflicts with the target role set. |
| `backend/app/routers/admin.py` | Keep. | `backend/app/main.py` registers it, and it enforces `role == "admin"` for user management. |
| `backend/app/routers/sensors.py` | Keep. | React calls `/api/sensors/devices`, `/api/sensors/latest`, and `/api/sensors/` through `frontend/src/App.jsx` and `frontend/src/hooks/useSensorHistory.js`. |
| `backend/app/routers/predict.py` | Keep as the rule/alert API surface. | `backend/app/main.py` registers it, and it exposes persisted `status`, `anomaly_score`, and `decision_reason`. It should remain threshold/rule-based, not ML-backed. |
| `backend/app/ws.py` and `backend/app/realtime.py` | Keep. | They provide the backend WebSocket path `/ws/live`, which fits the target React-through-backend realtime direction, even though React does not use it yet. |
| `backend/app/seed.py` | Keep. | `backend/entrypoint.sh` runs it to create the initial admin user. |
| `backend/entrypoint.sh` and `backend/Dockerfile` | Keep. | `docker-compose.yml` builds the backend from `./backend`, and the entrypoint runs migrations, seed, and Uvicorn. |
| `frontend/src/main.jsx`, `frontend/src/App.jsx`, `frontend/src/api.js`, `frontend/src/context/AuthContext.jsx` | Keep. | These are the active React app entrypoint, dashboard/auth switch, backend API client, and session state. |
| `frontend/src/components/HistoryChart.jsx`, `frontend/src/components/SensorCard.jsx`, `frontend/src/components/Navbar.jsx`, `frontend/src/components/UserManagementPanel.jsx` | Keep. | These are referenced by `frontend/src/App.jsx` and implement the current dashboard, history, navigation, and admin management. |
| `frontend/src/hooks/useSensorHistory.js` | Keep. | It polls backend history through `apiFetch`, which fits React consuming FastAPI. |
| `frontend/src/styles.css`, `frontend/index.html`, `frontend/vite.config.js`, `frontend/package.json`, `frontend/package-lock.json` | Keep. | They are required for the React/Vite app. |
| `frontend/Dockerfile` and `frontend/nginx.conf` | Keep. | `docker-compose.yml` builds `frontend` and Nginx proxies `/api` to `backend:8000`. |
| `simulation/flow.json` | Keep as the Node-RED simulator source, but rewrite its output path. | `docker-compose.yml` mounts `./simulation:/data` and sets `FLOWS=flow.json`; the flow simulates `Hopper_01`, `Mixer_01`, and `Conveyor_01`. |
| `simulation/settings.js` | Keep. | It is part of the Node-RED workspace mounted into `/data`. |
| `simulation/README.md` | Keep and update after alignment. | It documents the active Node-RED flow. |
| `README.md`, `backend/README.md`, `AGENTS.md`, `docs/implementation_gap_analysis.md` | Keep. | These are project or agent-facing docs. Update stale runtime wording after code alignment. |

## 2. Rewrite or Align

These items belong in the project, but their current behavior conflicts with the canonical target.

| Path | Action | Evidence |
|---|---|---|
| `simulation/flow.json` | Rewrite Node-RED output so telemetry is published to Mosquitto MQTT per machine/sensor or bundle topic, and stop direct PostgreSQL insertion. | `simulation/flow.json` contains a PostgreSQL node and an `INSERT INTO sensor_readings` query. This conflicts with the target pipeline: Node-RED -> Mosquitto -> FastAPI -> PostgreSQL. |
| `simulation/package.json` and `simulation/package-lock.json` | Regenerate after removing dependencies that are no longer needed by the target flow. | `simulation/package.json` depends on `node-red-contrib-postgresql`, `node-red-dashboard`, and `node-red-node-arduino`; the target uses React as dashboard, FastAPI as persistence authority, and ESP32 as future work. |
| `backend/app/routers/analyze.py` | Align as an ingest endpoint or retire after adding an MQTT subscriber. If kept, it should validate bundle telemetry, compute threshold/rule anomaly fields if needed, persist canonical rows, and broadcast via backend WebSocket. | `backend/app/main.py` registers it. Its comment says Node-RED posts to `/v1/analyze`, but `simulation/flow.json` currently inserts directly into PostgreSQL. It also defines `_score_anomaly()` but `analyze()` does not call it. |
| New backend MQTT ingest module, likely `backend/app/mqtt_subscriber.py` or equivalent | Add as current-runtime code, not archive. | The target requires FastAPI to receive or subscribe to telemetry. `docker-compose.yml` already gives backend `MQTT_BROKER_HOST=mosquitto`, but no MQTT subscriber file exists in `backend/app/`. |
| `backend/app/routers/auth.py` | Restrict roles to `admin` and `technician`; remove `viewer` from runtime schema. | `RegisterRequest.role` currently allows `Literal["technician", "admin", "viewer"]`, conflicting with the target actors. |
| `backend/app/models/user.py` and Alembic migrations under `backend/alembic/versions/` | Add role enforcement if desired at database level. | `User.role` is a free string; target role set is fixed. |
| `frontend/src/MqttManager.js` | Demote or rewrite. It should not be the main persistence or authority path. Prefer backend API/WebSocket for current values. | `frontend/src/MqttManager.js` imports `mqtt`, connects directly to Mosquitto, and subscribes in the browser. Target says React consumes backend APIs and/or backend WebSocket. |
| `frontend/src/App.jsx` | Align current-value flow to backend authority. Keep REST history; add backend WebSocket or API polling for alert/current state. | `frontend/src/App.jsx` instantiates `MqttManager` and uses MQTT for live updates, while also polling backend `/sensors/latest`. |
| `frontend/src/config.js` | Align topic and sensor metadata to the final Node-RED/FastAPI contract. | It defines `DEVICE_TOPIC_WILDCARD = cooperative/device/+/sensor/+` and sensor keys used by `MqttManager`; this must match whatever Node-RED publishes and FastAPI persists. |
| `frontend/src/pages/LoginPage.jsx` and `frontend/src/context/AuthContext.jsx` | Fix or remove password reset UI/API mismatch. | The frontend calls `/api/auth/password-reset/question` and `/api/auth/password-reset`; these routes are not present in `backend/app/routers/auth.py`. |
| `frontend/src/App.jsx` plus a new or existing alert component | Add alert/anomaly visualization from FastAPI. | `backend/app/routers/predict.py` exposes `/api/predict/analytics`, but `frontend/src/App.jsx` does not call `/predict`. |
| `backend/tests/` | Rewrite tests from scratch against current async FastAPI, PostgreSQL/Alembic schema, and the canonical MQTT/ingest path. | `backend/tests/test_api_smoke.py` imports `app.routers.prediction_service`, `latest_readings`, and `list_readings`, none of which exist in current code. `backend/tests/conftest.py` uses sync SQLite assumptions against an async PostgreSQL-first app. |
| `CLAUDE.md` | Rewrite or replace with current project guidance. | It references missing `backend/app/mqtt_subscriber.py`, missing `frontend/src/components/AlertsSidebar.jsx`, and role `viewer`. |
| `README.md` | Align wording after pipeline rewrite. | It currently says `Node-RED or simulator -> Mosquitto -> FastAPI -> PostgreSQL -> React dashboard`, but current `simulation/flow.json` inserts directly into PostgreSQL. |
| `backend/README.md` | Align after ingest decision. | It says backend expects rows populated by Node-RED, which conflicts with FastAPI as persistence authority. |
| `simulation/README.md` | Align after removing direct PostgreSQL flow. | It says React reads persisted data from PostgreSQL and the flow must align with `sensor_readings`; target wants FastAPI to own persistence. |

## 3. Move to `archive/`

These items should be removed from the main runtime tree after the canonical Node-RED -> MQTT -> FastAPI pipeline works. Moving preserves report/history value without presenting them as current implementation.

| Path | Target | Evidence |
|---|---|---|
| `esp32-simulators/` | `archive/esp32-simulators/` | `docker-compose.yml` does not run this service. The target says Node-RED is the active simulator. `esp32-simulators/src/Device.js` publishes MQTT directly and `esp32-simulators/config/devices.json` uses `esp32-barn-*`, not Hopper/Mixer/Conveyor. |
| `esp32-firmware/` | `archive/esp32-firmware/` or `archive/future-hardware/esp32-firmware/` | The target says ESP32 hardware/firmware is future work. Current runtime services in `docker-compose.yml` do not use these sketches. |
| `iot-ai-system/` | `archive/iot-ai-system-ml-prototype/` | It is a standalone ML prototype: `iot-ai-system/backend/api.py` creates a separate FastAPI app, loads `models/xgb_base.pkl`, and exposes `/predict`; `iot-ai-system/ai/train.py` trains XGBoost. The target says anomaly detection is threshold/rule-based, not a separate ML system. |
| `designDocs/07_DIY_Factory_Prototype/` | `archive/design-assets/07_DIY_Factory_Prototype/` after report extraction. | These are hardware/modeling assets, not runtime code. Uncertain which files are final, so archive rather than delete. |
| `designDocs/3D_Models_Of_The_Factory/` | `archive/design-assets/3D_Models_Of_The_Factory/` after report extraction. | Blender files are not referenced by `docker-compose.yml`, backend imports, frontend imports, or Node-RED startup. Uncertain report value remains. |
| `designDocs/animation/` | `archive/design-assets/animation/` after report extraction. | Animation files are not part of runtime. Keep for presentation history if needed. |
| Older sprint notes under `designDocs/00_Inception/`, `designDocs/01_SimulatorImplementation/`, `designDocs/02_Auth/`, `designDocs/03_HistoricalCharts/`, `designDocs/04_MultiDeviceSimulator/`, `designDocs/05_DockerCompose/`, `designDocs/06_AlembicPostgreSQL/`, `designDocs/08_Plan_For_the_3_Main_Features_of_EMS/`, `designDocs/09_01_05_Technician_Auth/`, `designDocs/09_xx_Technician_Auth/`, `designDocs/10_xx_Technician_Auth/`, `designDocs/notes/` | `archive/designDocs/` after extracting final diagrams/report material. | These are planning/history docs. They may conflict with the canonical target and should not be treated as runtime truth. Mark uncertain until report citations are extracted. |

Do not archive `designDocs/diagrams/` or `designDocs/PFE_BOOK/` until the report is finalized; they may still be direct report inputs.

## 4. Delete if Generated or Local Runtime Artifact

These should be deleted from the working tree when cleanup is authorized. If tracked, remove them from Git first in the category below.

| Path | Action | Evidence |
|---|---|---|
| `frontend/dist/` | Delete locally; generated by `npm run build`. | `.gitignore` already ignores `frontend/dist/`. |
| `esp32-simulators/node_modules/` | Delete locally. | Generated by `npm install`; `.gitignore` ignores `node_modules/`; `git ls-files` did not show it as tracked. |
| `mosquitto/data/` and `mosquitto/log/` | Delete locally when broker state is not needed. | `docker-compose.yml` uses named volumes for Mosquitto in canonical Docker runtime; local folders are runtime state. |
| `postgres-data/` | Delete locally only if the local database can be discarded. | `.gitignore` ignores it; inspection hit permission denial, indicating local runtime DB state. |
| Backup files such as `simulation/.config.nodes.json.backup`, `simulation/.config.runtime.json.backup`, `simulation/.config.users.json.backup`, `simulation/.flow.json.backup`, `simulation/.flow_cred.json.backup` | Delete after confirming no unrecovered Node-RED changes. | They are backup/generated Node-RED files and `.gitignore` ignores `*.backup`. |
| Python caches and test caches such as `backend/.pytest_cache/`, `__pycache__/`, `*.pyc` | Delete locally. | `.gitignore` ignores Python cache artifacts. |
| Local environment files such as `.env`, `backend/.env`, `frontend/.env` | Keep locally if needed; never publish. Delete local copies only if credentials are rotated or no longer needed. | `.gitignore` ignores env files. |

## 5. Remove from Git but Keep Locally Ignored

These are currently tracked according to `git ls-files`, but they are generated/local runtime artifacts or credentials/state. Remove them from the repository index in a cleanup commit, add or confirm ignore rules, and keep local copies only if needed.

| Path | Recommendation | Evidence |
|---|---|---|
| `backend/sensors.db` | Remove from Git; keep local ignored only if needed for old local experiments. | `git ls-files` shows it is tracked. `.gitignore` already ignores `*.db`. Current backend defaults to PostgreSQL in `backend/app/database.py`. |
| `.run/mosquitto.pid`, `.run/mqtt_bridge.pid`, `.run/node-red.pid`, `.run/run_local_stack.pid` | Remove from Git and ignore `.run/` or `*.pid`. | `git ls-files` shows these PID files are tracked. They are local process runtime artifacts. |
| `.run/mqtt_bridge.sh` | Remove from Git or archive only if still needed for manual local experiments. | It is tracked, but the canonical runtime is `docker-compose.yml`. Uncertain whether it contains useful local workflow logic because this plan did not inspect its content deeply. |
| `simulation/.npm/` | Remove from Git and ignore `simulation/.npm/`. | `git ls-files 'simulation/**'` shows many tracked npm cache entries under `simulation/.npm/_cacache`. This is generated package-manager cache, not source. |
| `simulation/node_modules/` | Remove from Git and ignore. | `git ls-files 'simulation/**'` shows tracked files under `simulation/node_modules/`. Dependencies should be restored from `simulation/package-lock.json`. |
| `simulation/.config.nodes.json`, `simulation/.config.runtime.json`, `simulation/.config.users.json` | Remove from Git unless intentionally sanitized and required for Node-RED reproducibility. | `git ls-files` shows these are tracked. They are Node-RED runtime config/state files; review for secrets or user-specific state first. |
| `simulation/flow_cred.json` | Remove from Git immediately after confirming no required secret-free content. Keep local ignored if Node-RED needs it. | `git ls-files` shows it is tracked. Credential files should not be committed. |
| `simulation/data/simulation_data.json` | Remove from Git if it is generated output; keep only if it is an intentional fixture. | `git ls-files` shows it is tracked. Path and name suggest generated simulation data; uncertain until content is reviewed. |
| `iot-ai-system/venv/` | Remove from Git if any files are tracked; keep local ignored only. | The implementation diagnosis identified `iot-ai-system` as a standalone prototype. Virtual environments are generated and `.gitignore` ignores `.venv*` but not necessarily `venv/`. |

Add or tighten ignore rules in `.gitignore` during cleanup:

- `.run/`
- `*.pid`
- `simulation/.npm/`
- `simulation/node_modules/`
- `simulation/flow_cred.json`
- `simulation/.config*.json`
- `iot-ai-system/venv/`

## Stricter Runtime Boundary

The main branch should tell one story:

1. Node-RED generates Hopper/Mixer/Conveyor telemetry.
2. Node-RED publishes telemetry to Mosquitto.
3. FastAPI receives/subscribes, validates, applies threshold/rule status, persists to PostgreSQL, and broadcasts or exposes APIs.
4. React reads current values, history, and alerts from FastAPI APIs or FastAPI WebSocket.

Anything outside that story should be archived, regenerated locally, or removed from Git. The strongest cleanup candidates are `iot-ai-system/`, `esp32-simulators/`, tracked `simulation/.npm/`, tracked `simulation/node_modules/`, tracked Node-RED credential/state files, stale `backend/tests/`, and stale `CLAUDE.md`.

