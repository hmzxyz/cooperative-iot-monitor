# Sprint 03: Historical Charts

## Objective

Add a history section to the dashboard that polls the REST API and renders a time-series line chart for each sensor's last 40 readings.

---

## Status: DONE ✅

| Task | Status |
|------|--------|
| `recharts` dependency | ✅ |
| `api.js` — authenticated fetch utility | ✅ |
| `useSensorHistory` polling hook | ✅ |
| Auto-logout on expired token (401) | ✅ |
| `HistoryChart.jsx` — recharts `LineChart` | ✅ |
| Charts section wired into `App.jsx` | ✅ |
| Chart CSS (dark theme, 2-col grid) | ✅ |

---

## Architecture

### Data Flow — Live vs Historical

```mermaid
flowchart LR
    SIM["Simulator\n(Node.js)"]
    BROKER["Mosquitto\n:1883 / :9001"]
    BE["FastAPI\n:8000"]
    DB[("SQLite")]
    CARDS["Sensor Cards\n(live, via MQTT.js)"]
    CHARTS["History Charts\n(polled, via REST)"]

    SIM -->|MQTT publish| BROKER
    BROKER -->|paho subscribe| BE
    BE -->|write| DB
    BROKER -->|WebSocket| CARDS
    BE -->|GET /api/sensors/| CHARTS
```

### Frontend Component Tree

```mermaid
graph TD
    ROOT["main.jsx\nAuthProvider"]
    APP["App.jsx\nauth gate"]
    LOGIN["LoginPage.jsx"]
    DASH["Dashboard (was App)"]
    MQTTMGR["MqttManager.js"]
    CARDS["SensorCard ×4\n(live values)"]
    CHARTS["HistoryChart ×4"]
    HOOK["useSensorHistory\n(polls every 10 s)"]
    API["api.js\napiFetch()"]

    ROOT --> APP
    APP -->|not auth| LOGIN
    APP -->|auth| DASH
    DASH --> MQTTMGR
    DASH --> CARDS
    DASH --> CHARTS
    CHARTS --> HOOK
    HOOK --> API
```

### Polling Sequence

```mermaid
sequenceDiagram
    participant HOOK as useSensorHistory
    participant API as api.js
    participant BE as FastAPI
    participant DB as SQLite

    loop every 10 s
        HOOK->>API: apiFetch(/sensors/?sensor_id=X&limit=40)
        API->>BE: GET /api/sensors/ Authorization: Bearer <token>
        BE->>DB: SELECT ... WHERE sensor_id=X ORDER BY timestamp DESC LIMIT 40
        DB-->>BE: rows
        BE-->>API: JSON array (newest-first)
        API-->>HOOK: parsed JSON
        HOOK->>HOOK: .reverse() → oldest-first
        HOOK->>HOOK: map to {time, value}
    end

    alt 401 Unauthorized
        BE-->>API: 401
        API-->>HOOK: throws "unauthorized"
        HOOK->>HOOK: logout() → redirects to LoginPage
    end
```

### Chart Anatomy

```mermaid
graph LR
    LC["LineChart (recharts)"]
    LC --> XA["XAxis — time string\n(HH:MM:SS)"]
    LC --> YA["YAxis — sensor value\nautoscaled"]
    LC --> CG["CartesianGrid\nsubtle dark lines"]
    LC --> TT["Tooltip\ndark popover"]
    LC --> LN["Line\nno dots, no animation\n#3b82f6"]
```

---

## File Changes

```
frontend/
  package.json              + recharts ^2.12.7
  src/
    api.js                  NEW — apiFetch(path, token) — throws "unauthorized" on 401
    hooks/
      useSensorHistory.js   NEW — polls /api/sensors/, reverses array, auto-logout on 401
    components/
      HistoryChart.jsx       NEW — recharts LineChart per sensor
    App.jsx                 UPDATED — import HistoryChart, add charts-panel section
    styles.css              UPDATED — charts-panel, charts-grid, history-chart styles
```

---

## Design Decisions

- **Separate concerns**: live values come from MQTT (push), history comes from REST (pull). The two pipelines are independent — charts work even if the MQTT connection drops.
- **Poll interval: 10 s** — history is not real-time; new readings arrive every 2 s from the simulator but the chart showing last 40 points updates every 10 s to avoid spamming the API.
- **`isAnimationActive={false}`** on the recharts `Line` — prevents the chart from re-animating on every poll cycle, which would be visually noisy.
- **Auto-logout on 401** — `useSensorHistory` catches `"unauthorized"` errors and calls `logout()`, which clears the token and returns the user to the login page.
- **`limit=40`** default — enough for ~1.3 minutes of simulator history at 2 s intervals; adjustable via the hook's third argument.

---

## TODO — Next Sprints

- [x] **Sprint 01** — ESP32 Simulator
- [x] **Sprint 02** — Auth (JWT login, protected routes)
- [x] **Sprint 03** — Historical charts ← **current**
- [x] **Sprint 04** — Multi-device support: `device_id` on `SensorReading`, multiple simulator instances → `designDocs/04_MultiDeviceSimulator/sprint.md`
- [x] **Sprint 05** — Docker Compose: mosquitto + backend + frontend
- [x] **Sprint 06** — Alembic migrations, PostgreSQL for production
