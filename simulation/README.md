# Node-RED Simulation

This folder contains the Node-RED flows that feed the Dockerized dashboard.

## Current Flow

The active flow publishes bundle-style payloads with:

- `machine_id`
- `machine_type`
- `tick`
- `sensors`
- `status`
- `anomaly_score`
- `decision_reason`

## Runtime

Use the `simulation/` directory as the persisted Node-RED workspace volume in the Docker stack.

## Notes

- The React dashboard reads the persisted data from PostgreSQL, not directly from this folder.
- Keep the flow aligned with the current `sensor_readings` schema and the MQTT topic contract.
