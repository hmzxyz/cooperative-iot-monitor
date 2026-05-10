# ESP32 Simulator

Node.js simulator that publishes machine-style sensor values to MQTT.

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
- `cooperative/device/{device_id}/sensor/vibration`
- `cooperative/device/{device_id}/sensor/current_amp`
- `cooperative/device/{device_id}/sensor/weight_kg`
- `cooperative/device/{device_id}/sensor/level_percent`
