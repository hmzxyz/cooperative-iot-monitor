# Deployment Diagram (Docker topology)

```mermaid
graph TB
  NODERED[Node-RED Simulation] -->|MQTT TCP 1883| MOSQ[Mosquitto Broker - TCP:1883 WS:9001]
  ESP[ESP32 devices / Simulators] -->|MQTT TCP 1883| MOSQ
  FRONTEND[Frontend - Port 80] -->|API /api| BACKEND[Backend FastAPI - Port 8000]
  MOSQ -->|subscriber TCP| BACKEND
  BACKEND -->|DB| DB[(PostgreSQL iot_monitor)]
```

What this shows
- The Dockerized network and ports used in the current stack: Node-RED/ESP32 -> Mosquitto -> backend persistence and dashboard API.

Why present this
- Committees want to see how components are deployed and connected: where network boundaries are, which ports, and what runs in Docker.

How to present to a jury
- Use this to explain the Docker demo setup (`docker-compose up -d --build`), MQTT broker ports, and PostgreSQL persistence.
