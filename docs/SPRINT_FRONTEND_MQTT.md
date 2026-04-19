# Sprint: Frontend MQTT Dashboard

Date: April 19, 2026

## Goal
Build a complete frontend-only React dashboard for the `cooperative-iot-monitor` project that works with mock sensor values and automatically switches to live MQTT data when available.

## How the frontend works
- The app is a Vite + React single-page dashboard.
- It connects to Mosquitto over WebSocket using `mqtt.js`.
- It subscribes to the sensor topics:
  - `cooperative/sensor/temperature`
  - `cooperative/sensor/humidity`
  - `cooperative/sensor/weight`
  - `cooperative/sensor/flow`
- When MQTT is unavailable or no message arrives for more than 5 seconds, the dashboard uses mock data generated every 2 seconds.
- Mock values are generated in a realistic range and automatically update the dashboard until live MQTT readings arrive.
- When a real MQTT message arrives, it overrides the mock value for that sensor and updates the last refreshed timestamp.

## Files created
- `frontend/index.html`
- `frontend/package.json`
- `frontend/vite.config.js`
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/MqttManager.js`
- `frontend/src/components/SensorCard.jsx`
- `frontend/src/config.js`
- `frontend/src/styles.css`
- `docs/SPRINT_FRONTEND_MQTT.md`

## How to run the frontend
1. Open a terminal in `frontend/`.
2. Run `npm install`.
3. Start the app with `npm run dev`.
4. Open the displayed Vite URL in your browser.

## MQTT broker WebSocket configuration
- Default local broker URL: `ws://localhost:9001`
- Public fallback test broker: `wss://test.mosquitto.org:8081`

To enable WebSockets in Mosquitto:
1. Add a listener in `mosquitto.conf` such as:
   ```
   listener 9001
   protocol websockets
   ```
2. Restart Mosquitto.
3. Make sure the frontend broker URL matches your listener.

## Assumptions and placeholders
- MQTT broker URL is configurable in `frontend/src/config.js` and through the UI input.
- The dashboard uses mock data immediately when the broker is disconnected or stale.
- The app does not depend on any backend API.
- Real ESP32 data is expected later on the configured MQTT topics.

## Next steps to integrate real ESP32
1. Connect the ESP32 to the same MQTT broker and publish to the configured topics.
2. Enable MQTT over WebSockets on Mosquitto if using browser-based MQTT.
3. Confirm the frontend changes from mock values to live sensor values on message arrival.
4. Optionally add analytics, device status, or a history chart layer.
