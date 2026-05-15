# IoT Cooperative Monitor - Implementation Gap Analysis

Date: 2026-05-15

This analysis is based on repository inspection only. It does not modify application code. Uncertain items are marked explicitly.

## 1. Current Repository Structure

Current top-level runtime areas:

- `backend/` - FastAPI service, SQLAlchemy models, Alembic migrations, Docker image, backend tests.
- `frontend/` - React 18 + Vite dashboard, MQTT.js browser client, Nginx Docker image.
- `mosquitto/` - Mosquitto broker configuration.
- `simulation/` - Node-RED project mounted into the Docker Compose `nodered` service.
- `esp32-simulators/` - standalone Node.js MQTT simulator, not included as a service in `docker-compose.yml`.
- `esp32-firmware/` - Arduino/ESP32 sketches for physical or prototype devices.
- `iot-ai-system/` - standalone AI prototype with a separate FastAPI app, training scripts, model artifact, and CSV data.
- `designDocs/` - planning documents, diagrams, sprint notes, Blender files, and animation assets.
- `docs/` - documentation output area; currently used for this gap analysis.

Important root files:

- `docker-compose.yml` - canonical Docker stack for Mosquitto, PostgreSQL, Node-RED, backend, and frontend.
- `README.md` - current project overview.
- `AGENTS.md` - durable agent instructions.
- `CLAUDE.md` - older agent guidance; some content appears stale.
- `.env.example`, `backend/env.example` - environment examples.
- `.gitignore` - ignores generated outputs, local env files, local databases, and `postgres-data/`.

## 2. Current Backend Architecture

Backend entrypoint:

- `backend/app/main.py` creates `FastAPI(title="Cooperative IoT Monitor API")`.
- `backend/app/main.py` registers routers from `backend/app/routers/auth.py`, `backend/app/routers/admin.py`, `backend/app/routers/analyze.py`, `backend/app/routers/sensors.py`, `backend/app/routers/predict.py`, and `backend/app/ws.py`.
- `backend/app/main.py` creates `app.state.realtime_manager` from `backend/app/realtime.py`.
- `backend/app/main.py` exposes `GET /health`.

Database layer:

- `backend/app/database.py` uses async SQLAlchemy with `create_async_engine`.
- Default `DATABASE_URL` is PostgreSQL: `postgresql+asyncpg://iot_user:iotpassword@postgres:5432/iot_monitor`.
- `backend/app/database.py` makes `init_db()` a no-op because schema management is delegated to Alembic.
- `backend/alembic/env.py` converts `postgresql+asyncpg://` to `postgresql+psycopg2://` for synchronous Alembic migrations.

Models:

- `backend/app/models/user.py` defines `User` with `email`, `username`, `hashed_password`, `role`, `is_blocked`, security question fields, phone, login time, and creation time.
- `backend/app/models/sensor_reading.py` defines `SensorReading` with `device_id`, `sensor_id`, `tick`, `status`, `anomaly_score`, `decision_reason`, `sensors`, legacy `payload`, and `timestamp`.

Authentication and actors:

- `backend/app/auth.py` uses JWT with `ALGORITHM = "HS256"` and `ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8`.
- `backend/app/auth.py` stores `sub` as email and includes the role in token data when called by the auth router.
- `backend/app/routers/auth.py` supports login, registration, OTP send/verify, and `/me`.
- `backend/app/routers/admin.py` provides admin-only user listing, technician creation, block, and unblock.
- Current registration schema in `backend/app/routers/auth.py` allows `Literal["technician", "admin", "viewer"]`; this conflicts with the report expectation of Administrator and Technician only.

Sensor and anomaly APIs:

- `backend/app/routers/sensors.py` exposes `GET /api/sensors/devices`, `GET /api/sensors/`, and `GET /api/sensors/latest`.
- `backend/app/routers/predict.py` exposes `GET /api/predict/analytics`, reading persisted `status`, `anomaly_score`, `decision_reason`, and `sensors`.
- `backend/app/routers/analyze.py` exposes `POST /v1/analyze`. It persists one row per sensor using legacy-style `payload`, broadcasts to WebSocket clients, and contains `_score_anomaly()`.
- `_score_anomaly()` in `backend/app/routers/analyze.py` appears unused because `analyze()` never calls it.

Realtime backend:

- `backend/app/ws.py` exposes `/ws/live` and can require JWT via query parameter.
- `backend/app/realtime.py` broadcasts JSON to connected WebSocket clients.
- The React frontend does not appear to use `/ws/live` currently; it uses MQTT.js and REST polling.

Missing backend MQTT subscriber:

- Older docs mention `backend/app/mqtt_subscriber.py`, but that file does not exist in the current `backend/app/` tree.
- Therefore, backend MQTT sensor acquisition is not currently implemented in FastAPI code.

## 3. Current Frontend Architecture

Frontend entrypoint:

- `frontend/src/main.jsx` renders `App` inside `AuthProvider`.
- `frontend/src/App.jsx` switches between `LoginPage` and `Dashboard` based on `isAuthenticated`.

Authentication UI:

- `frontend/src/context/AuthContext.jsx` stores JWT, email, username, and role in `localStorage`.
- `frontend/src/pages/LoginPage.jsx` implements sign in, technician sign up, and forgot password screens.
- `frontend/src/components/Navbar.jsx` displays the user role and opens admin user management for admins.
- `frontend/src/components/UserManagementPanel.jsx` lists users and allows admin technician creation, suspension, and restoration.

Dashboard data flow:

- `frontend/src/MqttManager.js` connects to Mosquitto over WebSocket using `mqtt`.
- `frontend/src/config.js` subscribes to `cooperative/device/+/sensor/+`.
- `frontend/src/MqttManager.js` expects numeric sensor payloads on per-sensor topics.
- `frontend/src/App.jsx` hydrates latest readings from `GET /api/sensors/latest` and polls every 12 seconds when live MQTT is not connected or mock mode is active.
- `frontend/src/hooks/useSensorHistory.js` polls `GET /api/sensors/?sensor_id=...&limit=...&device_id=...` every 10 seconds.
- `frontend/src/components/HistoryChart.jsx` renders native SVG line charts.
- `frontend/src/components/SensorCard.jsx` renders current value cards.

Frontend sensor model:

- `frontend/src/config.js` uses `temperature`, `vibration`, `current_amp`, `weight_kg`, and `level_percent`.
- This aligns with the active Node-RED machine bundle in `simulation/flow.json`, but not with the older report/firmware sensor set of `temperature`, `humidity`, `weight`, and `flow`.

Missing React alert/anomaly visualization:

- The current React dashboard shows current readings and history charts.
- `frontend/src/App.jsx` does not call `GET /api/predict/analytics`.
- No current `frontend/src/components/AlertsSidebar.jsx` file exists, although older docs reference it.
- Alert/anomaly details exist in PostgreSQL and `backend/app/routers/predict.py`, but are not currently surfaced in the React dashboard.

## 4. Current Docker, Database, and MQTT Setup

Docker Compose:

- `docker-compose.yml` defines `mosquitto`, `postgres`, `nodered`, `backend`, and `frontend`.
- `docker-compose.yml` does not include the standalone `esp32-simulators/` service.
- `frontend` is served by Nginx on port `80`.
- `backend` is served on port `8000`.
- `nodered` is exposed on port `1880`.
- `postgres` is exposed on port `5432`.
- `mosquitto` exposes MQTT TCP `1883` and WebSocket `9001`.

PostgreSQL:

- `docker-compose.yml` uses `postgres:16-alpine`.
- The database defaults are `POSTGRES_DB=iot_monitor`, `POSTGRES_USER=iot_user`, `POSTGRES_PASSWORD=iotpassword`.
- `backend/entrypoint.sh` runs `alembic upgrade head`, then `python -m app.seed`, then starts Uvicorn.
- `backend/app/seed.py` creates one admin user from `SEED_SUPERUSER_*` environment variables if not already present.

Mosquitto:

- `mosquitto/mosquitto.conf` enables MQTT on `1883` and WebSockets on `9001`.
- `mosquitto/mosquitto.conf` allows anonymous connections.
- `mosquitto/mosquitto.conf` enables persistence in `/mosquitto/data/`.

Node-RED simulation:

- `docker-compose.yml` mounts `./simulation:/data`.
- `docker-compose.yml` sets `FLOWS=flow.json`.
- `simulation/flow.json` defines machines `Hopper_01`, `Conveyor_01`, and `Mixer_01`.
- `simulation/flow.json` computes `status`, `anomaly_score`, and `decision_reason`.
- `simulation/flow.json` inserts directly into PostgreSQL table `sensor_readings`.
- `simulation/flow.json` publishes a JSON status payload to `cooperative/device/simulator/status`.
- `simulation/flow.json` does not appear to publish per-sensor numeric readings to `cooperative/device/{machine}/sensor/{sensor}`.

Important MQTT mismatch:

- React MQTT expects per-sensor numeric topics in `frontend/src/config.js`.
- Node-RED publishes a simulator status JSON topic in `simulation/flow.json`.
- The standalone `esp32-simulators/src/Device.js` publishes per-sensor numeric MQTT topics, but Docker Compose does not run it and the backend does not persist those MQTT messages.

## 5. Implemented Features

Implemented and reasonably aligned:

- FastAPI backend in `backend/app/main.py`.
- PostgreSQL-first database configuration in `backend/app/database.py` and `docker-compose.yml`.
- Alembic migrations in `backend/alembic/versions/`.
- React dashboard in `frontend/src/App.jsx`.
- Mosquitto broker in `docker-compose.yml` and `mosquitto/mosquitto.conf`.
- Docker Compose stack in `docker-compose.yml`.
- JWT authentication using HS256 and 8-hour expiration in `backend/app/auth.py`.
- Admin seed in `backend/app/seed.py`.
- Admin-only user management in `backend/app/routers/admin.py` and `frontend/src/components/UserManagementPanel.jsx`.
- Technician login and registration path in `backend/app/routers/auth.py` and `frontend/src/pages/LoginPage.jsx`.
- Machine simulation for Hopper, Mixer, and Conveyor in `simulation/flow.json`.
- Persisted sensor history in `backend/app/routers/sensors.py`.
- Latest-reading hydration in `frontend/src/App.jsx`.
- History visualization in `frontend/src/components/HistoryChart.jsx`.
- Rule-based anomaly fields persisted by Node-RED in `simulation/flow.json`.
- Analytics endpoint over persisted anomaly fields in `backend/app/routers/predict.py`.
- Browser MQTT client and mock fallback in `frontend/src/MqttManager.js`.

Partially implemented:

- Real-time dashboard: direct MQTT can update the dashboard when a compatible per-sensor publisher is running, but the active Docker Node-RED flow does not publish compatible per-sensor topics.
- Near-real-time dashboard: REST polling from PostgreSQL works through `frontend/src/App.jsx` and `frontend/src/hooks/useSensorHistory.js`.
- Anomaly detection workflow: Node-RED computes and persists anomaly data, and the backend exposes an analytics endpoint, but the React dashboard does not display it yet.
- Alerts/history visualization: history exists; alert/anomaly visualization is incomplete in React.

## 6. Missing Features Compared to Report Conception

Project naming:

- Report expects `IoT Cooperative Monitor`.
- Code and docs mostly use `Cooperative IoT Monitor` or `CoopIoT Monitor`, including `README.md`, `backend/app/main.py`, `frontend/src/pages/LoginPage.jsx`, and `frontend/src/components/Navbar.jsx`.

Actors:

- Report expects only Administrator and Technician.
- `backend/app/routers/auth.py` still allows `viewer`.
- `frontend/src/context/AuthContext.jsx` defaults unknown users to `technician`, but the codebase still has role display logic that can show arbitrary roles.
- There is no formal role enum or database constraint enforcing only admin/technician.

MQTT acquisition:

- Report expects MQTT sensor data acquisition.
- The active Docker ingestion path is Node-RED direct insertion into PostgreSQL in `simulation/flow.json`.
- Backend does not currently subscribe to MQTT because `backend/app/mqtt_subscriber.py` is absent.
- If ESP32 hardware or `esp32-simulators/` publish MQTT, frontend can consume compatible topics directly, but backend persistence is missing.

Machine model:

- Report expects Hopper, Mixer, Conveyor.
- Node-RED has `Hopper_01`, `Mixer_01`, and `Conveyor_01` in `simulation/flow.json`.
- `esp32-simulators/config/devices.json` uses generic `esp32-barn-01` and `esp32-barn-02`, which does not align with the report machine names.
- Frontend machine display is database-driven and does not enforce only Hopper/Mixer/Conveyor.

Sensor naming:

- Report and older firmware mention `temperature`, `humidity`, `weight`, and `flow`.
- Current React and Node-RED use `temperature`, `vibration`, `current_amp`, `weight_kg`, and `level_percent`.
- `backend/app/routers/analyze.py` still contains threshold logic for `humidity`, `weight`, and `flow`, but the active dashboard and Node-RED flow use different keys.

Alerts/anomaly dashboard:

- `backend/app/routers/predict.py` exposes anomaly analytics.
- `frontend/src/App.jsx` does not call that endpoint.
- No current React component displays `status`, `anomaly_score`, `decision_reason`, recommendations, or alert history.

Password recovery:

- `frontend/src/context/AuthContext.jsx` and `frontend/src/pages/LoginPage.jsx` call `/api/auth/password-reset/question` and `/api/auth/password-reset`.
- `backend/app/routers/auth.py` currently does not define those routes.
- This looks like a broken frontend feature or an unfinished backend migration.

Tests:

- `backend/tests/test_api_smoke.py` imports `app.routers.prediction_service`, `latest_readings`, and `list_readings`, which do not exist in the current router files.
- `backend/tests/conftest.py` expects a synchronous SQLite setup, while `backend/app/database.py` is async PostgreSQL-first.
- Backend tests appear stale and likely do not run successfully in the current architecture.

Security/config hardening:

- `mosquitto/mosquitto.conf` uses `allow_anonymous true`.
- `docker-compose.yml` contains development defaults for database and admin credentials.
- `.env.example` includes a real-looking Gmail address; this may be acceptable as an example, but should be reviewed before publication.

## 7. Obsolete, Duplicate, or Unused-Looking Files

Conservative candidates for review, not immediate deletion:

- `backend/tests/test_api_smoke.py` - appears stale against current async router names and schemas.
- `backend/tests/conftest.py` - appears stale against current async PostgreSQL-first database layer.
- `CLAUDE.md` - references `backend/app/mqtt_subscriber.py`, `frontend/src/components/AlertsSidebar.jsx`, `viewer`, and test tooling that do not match the current implementation.
- `iot-ai-system/backend/api.py` - separate FastAPI app for ML prediction, not integrated into `docker-compose.yml`.
- `iot-ai-system/ai/*.py`, `iot-ai-system/models/xgb_base.pkl`, `iot-ai-system/data/sensor_readings_202605111214.csv`, `iot-ai-system/reports/visuals/*.png` - AI prototype assets; possibly useful, but not wired into the production FastAPI app.
- `simulation/flow_cred.json`, `simulation/.flow_cred.json.backup`, and `simulation/.config*.json*` - Node-RED generated state/credential files; review for secrets before publishing.
- `simulation/package-lock.json` and `simulation/node_modules/` - Node-RED project artifacts; `node_modules/` should stay untracked/generated.
- `backend/sensors.db` - local SQLite database file; should stay untracked and can be removed locally if not needed.
- `frontend/dist/` - generated Vite output; should stay untracked/generated.
- `.run/*` - local runtime logs and PID files; should stay untracked/generated.
- `mosquitto/data/` and `mosquitto/log/` - broker runtime state; should stay untracked/generated.
- `postgres-data/` - local PostgreSQL data directory; inaccessible during inspection and should stay untracked/generated.
- `designDocs/07_DIY_Factory_Prototype/*.blend*` and `designDocs/3D_Models_Of_The_Factory/*.blend*` - duplicate-looking Blender assets; uncertain which are final.

## 8. Files That Look Unused But Should NOT Be Deleted Yet

- `simulation/flow.json` - active Docker Node-RED flow, even if it duplicates some backend logic.
- `simulation/settings.js` - Node-RED runtime settings; needed by the mounted Node-RED workspace.
- `esp32-firmware/*.ino` - may be needed for report demonstration or hardware validation, despite inconsistent sensor names.
- `esp32-simulators/` - not in Docker Compose, but useful for MQTT topic-contract testing and browser MQTT validation.
- `iot-ai-system/` - not integrated, but may contain the ML/anomaly direction for the report conception.
- `designDocs/diagrams/*.md` - useful for report diagrams and conception alignment.
- `designDocs/PFE_BOOK/` - likely report source material.
- `designDocs/notes/` - historical context; clean only after report extraction.
- `backend/alembic/versions/*.py` - all migrations must remain until a deliberate migration squash is planned.
- `backend/app/routers/analyze.py` - may be useful as a future gateway path even if Node-RED currently writes directly to PostgreSQL.
- `backend/app/ws.py` and `backend/app/realtime.py` - unused by React currently, but useful if realtime is moved from browser MQTT to backend WebSocket.

## 9. Recommended Safe Cleanup Order

1. Create a cleanup inventory issue or document before deleting anything; include file path, reason, and replacement if any.
2. Confirm the intended canonical ingestion path: either backend MQTT subscriber, Node-RED direct PostgreSQL insert, or Node-RED HTTP to FastAPI.
3. Fix or quarantine stale tests in `backend/tests/` only after choosing the canonical backend architecture.
4. Update docs that are clearly stale, starting with `CLAUDE.md` and any report-facing references to `mqtt_subscriber.py` or `AlertsSidebar.jsx`.
5. Review generated/local files for tracking status: `backend/sensors.db`, `frontend/dist/`, `.run/`, `mosquitto/data/`, `mosquitto/log/`, `postgres-data/`, and `simulation/node_modules/`.
6. Review Node-RED credential/config files in `simulation/` for secrets before any publication.
7. Align simulator and firmware topic contracts before deleting older ESP32 sketches.
8. Decide whether `iot-ai-system/` should be integrated, archived, or kept as research material.
9. Deduplicate large design assets only after confirming which Blender and animation files are referenced by the report.
10. Only after the above, remove confirmed generated artifacts and obsolete prototypes in small commits.

## 10. Recommended Feature Implementation Order

1. Normalize project naming to `IoT Cooperative Monitor` in user-facing text and report-facing docs.
2. Enforce actors as Administrator and Technician only: remove or block `viewer` in `backend/app/routers/auth.py`, add validation/constraints, and update frontend role assumptions.
3. Choose and implement one canonical ingestion path:
   - Preferred for the report: add a backend MQTT subscriber that subscribes to `cooperative/device/+/sensor/+` and persists readings.
   - Alternative: make Node-RED post bundles to `POST /v1/analyze` and make FastAPI own persistence.
   - Avoid keeping Node-RED direct PostgreSQL insert as the only path if the report states FastAPI owns MQTT acquisition.
4. Align MQTT topics and sensor keys across `simulation/flow.json`, `frontend/src/config.js`, `esp32-simulators/src/Device.js`, and `esp32-firmware/*.ino`.
5. Align machine identity around Hopper, Mixer, and Conveyor across simulation, dashboard labels, and any seed/reference data.
6. Fix password recovery mismatch: either implement the backend routes used by `frontend/src/context/AuthContext.jsx` or remove the frontend UI.
7. Surface anomaly/alert data in React by consuming `GET /api/predict/analytics` and displaying `status`, `risk_score`, `decision_reason`, and recommendations.
8. Add alert/history persistence if the report needs alert history separate from raw sensor readings; currently alert state is stored inside `sensor_readings`.
9. Update backend tests to match async FastAPI, PostgreSQL/Alembic schema, current router names, and current auth schema.
10. Add frontend smoke/build validation and, if needed for the PFE demo, a simple end-to-end Docker flow test.

