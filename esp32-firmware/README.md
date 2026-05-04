# ESP32 Firmware Profiles

Each sketch publishes sensor data to MQTT topics expected by the backend:

`cooperative/device/{device_id}/sensor/{sensor_id}`

## Available Sketches

- `esp32-firmware.ino`: full profile (temperature, humidity, weight, flow).
- `esp-32-firmware-humidity-temperature.ino`: temp/humidity profile.
- `exp-32-firmware-balance.ino`: weight/flow profile.
- `esp-32-kanban.ino`: production-cycle style profile that still publishes all 4 sensor keys.
- `esp32-firmware-random-data.ino`: legacy random-data profile.

## Before Upload

In each sketch, set:
- `WIFI_SSID`
- `WIFI_PASSWORD`
- `MQTT_HOST`
- `MQTT_PORT` (usually `1883`)
- `DEVICE_ID`

## Notes

- Use unique `DEVICE_ID` per board.
- Backend and frontend expect sensor keys: `temperature`, `humidity`, `weight`, `flow`.
