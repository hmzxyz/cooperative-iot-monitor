# MQTT Contract

This project's canonical runtime is:

```text
Node-RED simulator -> Mosquitto MQTT -> FastAPI backend -> PostgreSQL -> React dashboard
```

Node-RED publishes telemetry to Mosquitto. FastAPI is responsible for subscribing to or receiving that telemetry, validating it, applying the canonical data contract, persisting it in PostgreSQL, and exposing it to React. React consumes backend APIs and/or a backend WebSocket for current values, history, and alerts.

Browser MQTT may exist only as a development/live enhancement. It is not the persistence authority. MQTT TCP `1883` is used for service-to-service communication. MQTT WebSocket `9001` may remain available for browser or development inspection.

## Canonical Topic

```text
cooperative/device/{device_id}/telemetry
```

Allowed `device_id` values:

- `Hopper_01`
- `Mixer_01`
- `Conveyor_01`

Allowed `machine` values:

- `Hopper`
- `Mixer`
- `Conveyor`

Allowed `status` values:

- `RUNNING`
- `WATCH`
- `WARNING`
- `CRITICAL`

## Canonical Payload

```json
{
  "device_id": "Hopper_01",
  "machine": "Hopper",
  "tick": 123,
  "timestamp": "2026-05-15T12:00:00Z",
  "sensors": {
    "temperature": 28.4,
    "vibration": 0.8,
    "current_amp": 4.2,
    "weight_kg": 18.0,
    "level_percent": 72.0
  },
  "status": "RUNNING",
  "anomaly_score": 0,
  "decision_reason": []
}
```

## Field Notes

- `device_id` identifies the simulated machine instance.
- `machine` is the machine family and must match one of the allowed machine names.
- `tick` is the simulator sequence counter for the emitted telemetry message.
- `timestamp` should be an ISO 8601 UTC timestamp.
- `sensors` contains the current telemetry readings for the device.
- `status` is the rule-based runtime status.
- `anomaly_score` is a threshold/rule-based score, not an ML model output.
- `decision_reason` records the rule explanations that produced the status and score.

## Current Node-RED Mismatch

The current Node-RED flow does not yet match this canonical contract:

- Current MQTT topic is `cooperative/device/simulator/status`.
- Current `FORMAT MQTT` omits `tick`, `machine`/`machine_type`, `anomaly_score`, and `decision_reason`.
- Current flow still inserts directly into PostgreSQL through `FORMAT SQL` and a `postgresql` node.
- Target behavior is to keep MQTT as the canonical Node-RED output and move PostgreSQL persistence to FastAPI.

## Authority Boundary

Node-RED should only simulate and publish telemetry. FastAPI is the backend authority for validation, persistence, current-state APIs, history APIs, alerts, and any backend WebSocket stream. PostgreSQL should be written by FastAPI, not directly by Node-RED or React.
