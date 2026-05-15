# Frontend Alignment Plan

Date: 2026-05-15

Scope: planning only. Do not modify frontend, backend, Node-RED, or Docker runtime code from this document alone.

Target runtime:

```text
Node-RED simulator -> Mosquitto MQTT -> FastAPI MQTT subscriber -> PostgreSQL -> React dashboard
```

React must display real values produced by Node-RED ticks through FastAPI APIs and/or FastAPI WebSocket. React must not invent fake, mock, or simulated sensor data for the production dashboard.

## 1. Current Frontend Data Flow

Current authenticated entrypoint:

- `frontend/src/main.jsx` renders `App` inside `AuthProvider`.
- `frontend/src/App.jsx` renders `LoginPage` until `AuthContext` has a token, then renders `Dashboard`.
- `frontend/src/context/AuthContext.jsx` stores `auth_token`, `auth_email`, `auth_username`, and `auth_role` in `localStorage`.

Current dashboard current-value flow:

- `frontend/src/App.jsx` initializes `sensorData` from `buildInitialSensors()`.
- `buildInitialSensors()` uses hardcoded initial values from `SENSOR_RANGES` in `frontend/src/App.jsx`.
- `frontend/src/App.jsx` constructs `MqttManager` from `frontend/src/MqttManager.js`.
- `MqttManager` connects to Mosquitto WebSocket using `DEFAULT_BROKER_URL` from `frontend/src/config.js`.
- `MqttManager` subscribes to `DEVICE_TOPIC_WILDCARD`, currently `cooperative/device/+/sensor/+`.
- `MqttManager.handleMessage()` parses numeric per-sensor MQTT payloads and calls `App.jsx` `applySensorUpdate()`.
- `App.jsx` also calls `GET /api/sensors/latest` through `apiFetch()` and applies returned persisted readings.
- `App.jsx` intentionally skips backend latest hydration when browser MQTT is connected and not in mock mode.

Current dashboard history flow:

- `frontend/src/components/HistoryChart.jsx` uses `frontend/src/hooks/useSensorHistory.js`.
- `useSensorHistory()` polls `GET /api/sensors/?sensor_id={sensorId}&limit=40&device_id={selectedDevice}` every 10 seconds.
- The hook reverses newest-first API results to oldest-first chart points.

Current device list flow:

- `frontend/src/App.jsx` calls `GET /api/sensors/devices`.
- The first returned device becomes `selectedDevice`.

Current anomaly/alert flow:

- No frontend component currently calls `GET /api/predict/analytics`.
- No frontend component currently displays `status`, `anomaly_score`, or `decision_reason` from persisted canonical readings.

## 2. Mock, Fallback, and Simulated Frontend Data

Mock/fallback data exists in these places and should be removed from the production dashboard path:

- `frontend/src/App.jsx`
  - `SENSOR_RANGES` defines hardcoded min/max/initial values.
  - `buildInitialSensors()` seeds dashboard cards with non-database bootstrap values.
  - `smoothSensorValue()` blends incoming values and can hide exact backend values.
  - `sourceLabel()` returns `Live MQTT`, `Backend persisted`, `Simulated fallback`, and `Waiting for data`.
  - `mockMode` state defaults to `true`.
  - `onData()` maps `isMock` updates to source `mock`.
  - `hydrateLatestReadings()` prefers browser MQTT over backend data when MQTT is connected.

- `frontend/src/MqttManager.js`
  - `MOCK_SENSOR_PROFILES` defines fake sensor ranges.
  - `randomInitial()`, `startMockLoop()`, `emitMockValues()`, `publishMockValue()`, `nextTemperature()`, `nextVibration()`, `nextCurrent()`, `nextWeight()`, and `nextLevel()` generate synthetic dashboard readings.
  - `startFallbackTimer()` and `updateFallbackState()` switch to mock mode when MQTT is stale or disconnected.
  - `setForceMock()` keeps an explicit mock-control path.

- `frontend/src/config.js`
  - `MOCK_INTERVAL_MS` and `MQTT_STALE_TIMEOUT_MS` support the mock fallback loop.
  - Comment says known sensor types are used for mock data keys.

Recommended production alignment:

- Remove frontend-generated sensor values from the dashboard.
- Replace initial values with empty/null UI state such as `--`, `Waiting for backend data`, or the latest persisted API value.
- Do not smooth or clamp backend values. Display values as persisted or received from backend WebSocket.
- Do not label any production state as mock or simulated.

## 3. Browser MQTT Usage

Browser MQTT is currently used in:

- `frontend/src/MqttManager.js`
  - imports `mqtt` from the `mqtt` package.
  - connects directly to `VITE_WS_URL` / `DEFAULT_BROKER_URL`.
  - subscribes to `cooperative/device/+/sensor/+`.
  - parses numeric per-sensor MQTT messages.

- `frontend/src/config.js`
  - exports `DEFAULT_BROKER_URL`.
  - exports `DEVICE_TOPIC_WILDCARD`.
  - exports `MQTT_TOPICS`.
  - exports `parseSensorTopic()`.

- `frontend/src/App.jsx`
  - imports and instantiates `MqttManager`.
  - imports `DEFAULT_BROKER_URL` and `MQTT_TOPICS`.
  - treats MQTT as the preferred live source.

- `frontend/package.json` and `frontend/package-lock.json`
  - include dependency `mqtt`.

Mismatch with `docs/mqtt_contract.md`:

- Frontend subscribes to `cooperative/device/+/sensor/+`.
- Canonical topic is `cooperative/device/{device_id}/telemetry`.
- Browser MQTT is not the persistence authority and should not be the main dashboard live path.

Recommended production alignment:

- Remove `MqttManager` from `App.jsx`.
- Remove `frontend/src/MqttManager.js` if no development-only MQTT inspector is retained.
- Remove `mqtt` from `frontend/package.json` and regenerate `frontend/package-lock.json` if browser MQTT is fully removed.
- Keep MQTT WebSocket `9001` available only for browser/dev inspection outside the main dashboard path.

## 4. Components Reading Backend REST APIs

Backend REST is already used in:

- `frontend/src/App.jsx`
  - `apiFetch('/sensors/devices', token)`
  - `apiFetch('/sensors/latest...', token)`

- `frontend/src/hooks/useSensorHistory.js`
  - `apiFetch('/sensors/?sensor_id=...&limit=...&device_id=...', token)`

- `frontend/src/components/UserManagementPanel.jsx`
  - `adminFetch('/admin/users', token)`
  - `adminFetch('/admin/users', token, { method: 'POST', ... })`
  - `adminFetch('/admin/users/{id}/block', token, { method: 'PATCH' })`
  - `adminFetch('/admin/users/{id}/unblock', token, { method: 'PATCH' })`

- `frontend/src/context/AuthContext.jsx`
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `GET /api/auth/password-reset/question`
  - `POST /api/auth/password-reset`

REST API issues:

- `GET /api/predict/analytics` exists in `backend/app/routers/predict.py` but is not used by the frontend.
- Password reset routes used by `AuthContext.jsx` are documented as mismatched in `docs/implementation_gap_analysis.md` and `docs/deletion_plan.md`.
- Self-registration through `/api/auth/register` conflicts with the desired flow where technicians are admin-created.

## 5. Components To Keep

Keep and align:

- `frontend/src/main.jsx`
  - Keep as app entrypoint.

- `frontend/src/App.jsx`
  - Keep as dashboard composition root, but remove browser MQTT and mock fallback paths.
  - Add backend WebSocket current-value handling.
  - Add anomaly/status display state.

- `frontend/src/api.js`
  - Keep for authenticated REST calls.
  - Consider adding helpers for backend WebSocket URL construction in a new file instead of mixing it into REST fetch.

- `frontend/src/context/AuthContext.jsx`
  - Keep login/session state.
  - Remove self-registration and password reset methods unless backend routes are intentionally restored.

- `frontend/src/pages/LoginPage.jsx`
  - Keep sign-in page.
  - Remove sign-up and forgot-password views for the current report-aligned runtime.

- `frontend/src/components/Navbar.jsx`
  - Keep user menu and admin management entry.
  - Rename connection labels away from MQTT to backend live status.
  - Remove mock-mode styling logic.

- `frontend/src/components/UserManagementPanel.jsx`
  - Keep as the canonical admin-created technician account path.
  - It already creates technician accounts via admin endpoints.

- `frontend/src/components/SensorCard.jsx`
  - Keep for current sensor values.
  - Consider adding optional status styling if the card should reflect machine status.

- `frontend/src/components/HistoryChart.jsx`
  - Keep for REST-backed history.

- `frontend/src/hooks/useSensorHistory.js`
  - Keep as history polling, not current-value authority.

- `frontend/src/config.js`
  - Keep only sensor display metadata and allowed machine metadata.
  - Remove browser MQTT topic constants if MQTT dashboard use is removed.

## 6. Components and Functions To Remove

Remove from production dashboard flow:

- `frontend/src/MqttManager.js`
  - Remove entirely if there is no dev-only MQTT inspector.
  - If retained, move to a clearly development-only path and do not import it from `App.jsx`.

- `frontend/src/App.jsx`
  - Remove import of `MqttManager`.
  - Remove import of `DEFAULT_BROKER_URL` and `MQTT_TOPICS`.
  - Remove `SENSOR_RANGES`.
  - Remove `clamp()`.
  - Remove `smoothSensorValue()`.
  - Remove `buildInitialSensors()` as a source of fake values.
  - Remove `sourceLabel()` entries for `Live MQTT` and `Simulated fallback`.
  - Remove `mockMode`, `brokerUrl`, and `mqttManagerRef` state/refs.
  - Remove the `useEffect()` that constructs/connects/disconnects `MqttManager`.
  - Remove the condition that skips backend hydration when browser MQTT is connected.

- `frontend/src/config.js`
  - Remove `DEFAULT_BROKER_URL`.
  - Remove `DEVICE_TOPIC_WILDCARD`.
  - Remove `MQTT_TOPICS`.
  - Remove `parseSensorTopic()`.
  - Remove `MOCK_INTERVAL_MS`.
  - Remove `MQTT_STALE_TIMEOUT_MS`.
  - Keep `SENSOR_CONFIGS`.

- `frontend/src/context/AuthContext.jsx`
  - Remove `registerTechnician()` from public auth context after admin-created technician flow is confirmed.
  - Remove `getPasswordResetQuestion()` and `resetPassword()` unless backend password reset routes are implemented.

- `frontend/src/pages/LoginPage.jsx`
  - Remove `signup` view.
  - Remove reset-password view.
  - Remove `EMPTY_SIGNUP`, `EMPTY_RESET`, `handleSignupSubmit()`, `handleLoadSecurityQuestion()`, and `handlePasswordResetSubmit()`.
  - Remove Sign Up and Forgot Password buttons.

- `frontend/package.json` and `frontend/package-lock.json`
  - Remove `mqtt` dependency if browser MQTT is not retained anywhere.

## 7. Backend WebSocket `/ws/live` Real-Time Plan

Backend behavior now broadcasts accepted readings through `backend/app/realtime.py` as:

```json
{
  "type": "reading_batch",
  "data": [
    {
      "id": 1,
      "device_id": "Hopper_01",
      "sensor_id": "Hopper",
      "tick": 123,
      "status": "RUNNING",
      "anomaly_score": 0,
      "decision_reason": [],
      "sensors": {
        "temperature": 28.4,
        "vibration": 0.8,
        "current_amp": 4.2,
        "weight_kg": 18.0,
        "level_percent": 72.0
      },
      "payload": {},
      "timestamp": "2026-05-15T12:00:00"
    }
  ]
}
```

Recommended frontend implementation:

- Add a new hook, likely `frontend/src/hooks/useLiveReadings.js`.
- The hook should open a browser `WebSocket` to backend `/ws/live?token={JWT}`.
- It should parse messages with `type === "reading_batch"`.
- It should ignore rows for other devices when a `selectedDevice` filter is active.
- It should map the newest accepted row into dashboard state:
  - `device_id`
  - `sensor_id` as machine display fallback
  - `tick`
  - `timestamp`
  - `sensors`
  - `status`
  - `anomaly_score`
  - `decision_reason`
- It should expose connection states such as `connecting`, `live`, `disconnected`, and `error`.
- It should reconnect with backoff after close/error, but should not generate replacement sensor data.

Nginx/WebSocket routing requirement:

- `frontend/nginx.conf` currently proxies `/api/` and `/health`, but not `/ws/live`.
- If Docker-served React uses relative backend WebSocket URLs, add an Nginx `location /ws/` WebSocket proxy to `backend:8000`.
- Alternative: add a separate frontend env var such as `VITE_BACKEND_WS_URL=ws://localhost:8000/ws/live` for local/browser direct backend access.
- Do not reuse `VITE_WS_URL` for backend WebSocket unless it is renamed, because it currently means Mosquitto WebSocket.

Recommended URL construction:

- In Docker/Nginx: `ws://{window.location.host}/ws/live?token={encodedToken}` after adding the Nginx proxy.
- In local Vite: `VITE_BACKEND_WS_URL` can default to `ws://localhost:8000/ws/live`.

## 8. REST Polling and History Backup Plan

Keep REST polling for:

- Initial page hydration after login.
- Recovery after WebSocket reconnect.
- Device list loading.
- Historical charts.
- Optional periodic reconciliation at a slower cadence.

Recommended behavior:

- On dashboard mount, call `GET /api/sensors/devices`.
- When a device is selected, call:
  - `GET /api/sensors/latest?device_id={selectedDevice}`
  - `GET /api/predict/analytics?device_id={selectedDevice}`
- Use `/ws/live` as the primary source for current values after initial hydration.
- Keep `useSensorHistory()` polling every 10 seconds for charts, because Node-RED currently ticks every 10 seconds and history is naturally database-backed.
- Optionally reduce `/api/sensors/latest` polling to a recovery/reconciliation interval such as 30-60 seconds, or only run it on WebSocket disconnect/reconnect.

Do not:

- Poll REST every 10-12 seconds as the main current-value source if the WebSocket is healthy.
- Invent values during disconnect.
- Prefer browser MQTT over persisted backend data.

## 9. Status, Anomaly Score, and Decision Reason Display

Current backend sources:

- Canonical MQTT ingestion persists `status`, `anomaly_score`, `decision_reason`, `sensors`, `payload`, `tick`, and `timestamp` in `SensorReading`.
- `/ws/live` broadcasts `reading.to_dict()`, including those fields.
- `GET /api/predict/analytics` returns:
  - `status`
  - `risk_score`
  - `recommendations`
  - `decision_reason`
  - `device_id`
  - `tick`
  - `timestamp`
  - `sensors`

Recommended UI additions:

- Add a machine status panel in `frontend/src/App.jsx` or a new component such as `frontend/src/components/MachineStatusPanel.jsx`.
- Display:
  - selected machine/device id
  - current `status`
  - `anomaly_score`
  - `tick`
  - last backend timestamp
  - top `decision_reason` entries
- Add status styling for allowed statuses:
  - `RUNNING`
  - `WATCH`
  - `WARNING`
  - `CRITICAL`
- Keep `SensorCard.jsx` focused on sensor values, or pass status only as a visual modifier if needed.
- Add an alerts/history section using `GET /api/predict/analytics`, initially showing the latest decision reasons and recommendations. If full alert history is required later, add a backend endpoint for historical status rows instead of deriving history entirely in React.

Mapping note:

- `backend/app/routers/predict.py` currently maps `WATCH` to frontend `warning` in `_to_frontend_status()`.
- For report alignment, consider displaying the canonical raw status from WebSocket/latest rows (`RUNNING`, `WATCH`, `WARNING`, `CRITICAL`) and only using lower-case mapped values for CSS classes.

## 10. Remove Sign-Up and Self-Registration

Current self-registration path:

- `frontend/src/pages/LoginPage.jsx` exposes a Sign Up view.
- `frontend/src/context/AuthContext.jsx` exposes `registerTechnician()`.
- `registerTechnician()` calls `POST /api/auth/register` with role `technician`.

Canonical account flow:

- Admin account is seeded by backend.
- Administrator creates technician accounts in `frontend/src/components/UserManagementPanel.jsx`.
- Technicians sign in with admin-provided credentials.
- Public/self sign-up should be removed from the production UI.

Recommended changes:

- In `frontend/src/pages/LoginPage.jsx`, leave only sign-in.
- Remove Sign Up tab/button and associated form state/handlers.
- In `frontend/src/context/AuthContext.jsx`, remove `registerTechnician()` from the context value.
- Keep `UserManagementPanel.jsx` as the technician creation path.
- Backend `/api/auth/register` can be disabled or restricted separately in a backend alignment task; this frontend plan only removes the UI path.

Password recovery note:

- `LoginPage.jsx` and `AuthContext.jsx` also expose password reset UI/API calls.
- Existing docs mark those endpoints as mismatched with the backend.
- Remove the Forgot Password UI unless backend password reset is intentionally restored.

## 11. Exact Files To Modify

Primary frontend code:

- `frontend/src/App.jsx`
  - Remove browser MQTT and mock fallback.
  - Add backend WebSocket hook integration.
  - Keep REST hydration/history.
  - Add machine status/anomaly display state.

- `frontend/src/config.js`
  - Keep sensor display config.
  - Remove MQTT topic/mock constants.
  - Add allowed machines/status display metadata if useful.

- `frontend/src/hooks/useSensorHistory.js`
  - Keep mostly as-is for history polling.
  - Ensure it remains history-only and handles empty persisted data cleanly.

- `frontend/src/hooks/useLiveReadings.js`
  - New hook for `/ws/live`.

- `frontend/src/components/SensorCard.jsx`
  - Keep; optionally add status-aware visual props.

- `frontend/src/components/HistoryChart.jsx`
  - Keep; no major change expected.

- `frontend/src/components/Navbar.jsx`
  - Replace MQTT/mock connection badge logic with backend live connection state.

- `frontend/src/components/UserManagementPanel.jsx`
  - Keep; no major change expected.

- `frontend/src/context/AuthContext.jsx`
  - Remove public self-registration and stale password reset methods from current UI contract.

- `frontend/src/pages/LoginPage.jsx`
  - Remove sign-up and forgot-password views.

- `frontend/src/components/MachineStatusPanel.jsx`
  - New component for `status`, `anomaly_score`, `decision_reason`, `tick`, and timestamp.

Files to remove if no dev MQTT inspector remains:

- `frontend/src/MqttManager.js`
- `mqtt` entry from `frontend/package.json`
- `mqtt` dependency lock entries by regenerating `frontend/package-lock.json` with `npm install`

Infrastructure file likely needed for backend WebSocket from Docker-served frontend:

- `frontend/nginx.conf`
  - Add `/ws/` proxy with WebSocket upgrade headers, or document/use a direct backend WebSocket URL.

Style files:

- `frontend/src/styles.css`
  - Remove mock-specific classes if unused.
  - Add status/anomaly panel styles.
  - Remove `viewer` role badge styling if role cleanup removes `viewer` from the UI.

## 12. Validation Commands

After implementation, run:

```bash
git branch --show-current
```

Expected:

```text
cleanup/report-alignment
```

Frontend dependency/build validation:

```bash
cd frontend
npm install
npm run build
```

Docker config validation:

```bash
docker compose config
```

Runtime validation:

```bash
docker compose up --build
```

Manual browser validation:

- Log in as seeded admin.
- Confirm no Sign Up or Forgot Password path is visible.
- Confirm admin can open User Management and create a technician.
- Confirm technician can log in with admin-created credentials.
- Start/keep Node-RED ticking.
- Confirm dashboard values update only after backend receives/persists telemetry.
- Stop Node-RED and confirm the dashboard stops updating instead of generating fake values.
- Confirm connection badge reports backend WebSocket state, not Mosquitto browser MQTT state.
- Confirm current values, history charts, status, anomaly score, and decision reasons match backend persisted rows.

Optional backend/API checks while the stack is running:

```bash
curl http://localhost:8000/health
```

Authenticated checks:

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/sensors/devices
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8000/api/sensors/latest?device_id=Hopper_01"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8000/api/predict/analytics?device_id=Hopper_01"
```

WebSocket check:

```bash
npx wscat -c "ws://localhost:8000/ws/live?token=$TOKEN"
```

If the frontend is served through Nginx with a `/ws/` proxy, also check:

```bash
npx wscat -c "ws://localhost/ws/live?token=$TOKEN"
```
