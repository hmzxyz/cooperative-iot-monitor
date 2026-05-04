# ESP32 Simulator

Node.js simulator that publishes realistic multi-device sensor values to MQTT.

## Run

```bash
cd esp32-simulators
npm install
npm start
```

Environment variables:
- `MQTT_BROKER_URL` (default: `mqtt://localhost:1883`)

Topics published:
- `cooperative/device/{device_id}/sensor/temperature`
- `cooperative/device/{device_id}/sensor/humidity`
- `cooperative/device/{device_id}/sensor/weight`
- `cooperative/device/{device_id}/sensor/flow`
