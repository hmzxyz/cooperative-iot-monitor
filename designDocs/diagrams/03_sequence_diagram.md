# Sequence Diagrams

## Login flow

```mermaid
sequenceDiagram
  participant U as User (Browser)
  participant FE as Frontend
  participant API as Backend API
  participant DB as Database

  U->>FE: submit credentials
  FE->>API: POST /api/auth/login
  API->>DB: SELECT user
  DB-->>API: user row
  API-->>FE: JWT
  FE-->>FE: store token in localStorage
```

## Real-time data flow (MQTT)

```mermaid
sequenceDiagram
  participant ESP as ESP32 Device
  participant BROKER as MQTT Broker
  participant SUB as Backend Subscriber
  participant DB as Database
  participant FE as Frontend

  ESP->>BROKER: PUBLISH cooperative/device/{id}/sensor/{type}
  BROKER->>FE: deliver via WebSocket (frontend subscribed)
  BROKER->>SUB: deliver via TCP subscriber
  SUB->>DB: INSERT SensorReading
  DB-->>SUB: commit
  FE->>FE: update UI on message
```

What this shows
- Two important runtime flows: auth/login and sensor ingestion (both the UI path and the persistence path).

How to present to a jury
- Walk the login flow first to show authentication and protected API access.
- Then show the data flow: emphasize the separation of concerns — broker for real-time delivery and a backend subscriber for persistence.
