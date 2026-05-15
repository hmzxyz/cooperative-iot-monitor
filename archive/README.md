# Archive

This directory contains historical prototypes and future-work material that are not part of the current Docker runtime.

The current runtime is defined by `docker-compose.yml` and consists of Mosquitto, PostgreSQL, Node-RED, the FastAPI backend, and the React frontend.

The canonical runtime flow is:

```text
Node-RED -> Mosquitto MQTT -> FastAPI -> PostgreSQL -> React
```

Node-RED is the active simulator for Hopper, Mixer, and Conveyor telemetry. FastAPI is the backend authority: it receives or subscribes to MQTT telemetry, validates it, persists it in PostgreSQL, and exposes it to React.

Anomaly detection in the current runtime is threshold/rule-based. It does not use the archived standalone ML prototype.

Archived material:

- `esp32-simulators/`: historical simulator implementation; Node-RED is the canonical simulator now.
- `esp32-firmware/`: future hardware/firmware work; ESP32 hardware is not part of the current implemented runtime.
- `iot-ai-system-ml-prototype/`: standalone ML prototype; not part of the threshold/rule-based anomaly workflow.
