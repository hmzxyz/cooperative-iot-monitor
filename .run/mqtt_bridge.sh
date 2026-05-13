#!/usr/bin/env bash
set -eu

# Simple bridge: mosquitto_sub -> Node-RED HTTP endpoint
TOPIC='cooperative/device/+/sensor/+'
NR_URL='http://127.0.0.1:1880/sim-mqtt'
LOG_DIR='/home/hamza/Documents/github/cooperative-iot-monitor/.run'
LOG="$LOG_DIR/mqtt_bridge.log"
PIDFILE="$LOG_DIR/mqtt_bridge.pid"

mkdir -p "$LOG_DIR"

# Run mosquitto_sub in background and forward each message as JSON to Node-RED
(
	mosquitto_sub -v -t "$TOPIC" | while IFS= read -r line; do
		topic="${line%% *}"
		payload="${line#* }"
		_ESCAPED_TOPIC="$topic"
		_ESCAPED_PAYLOAD="$payload"
		json=$(python3 -c 'import json,sys; print(json.dumps({"topic":sys.argv[1],"payload":sys.argv[2]}))' "$_ESCAPED_TOPIC" "$_ESCAPED_PAYLOAD")
		curl -s -X POST -H 'Content-Type: application/json' -d "$json" "$NR_URL" >/dev/null 2>&1
	done
) > "$LOG" 2>&1 &
echo $! > "$PIDFILE"
echo "started mqtt bridge, pid: $(cat "$PIDFILE")"
