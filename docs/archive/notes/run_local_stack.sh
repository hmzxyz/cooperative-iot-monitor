#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"
mkdir -p "$RUN_DIR"

PIDS=()
RUN_SIMULATOR="${RUN_SIMULATOR:-1}"
RUN_MOSQUITTO="${RUN_MOSQUITTO:-auto}" # auto | 1 | 0

MOSQUITTO_PID=""
BACKEND_PID=""
FRONTEND_PID=""
SIMULATOR_PID=""

is_port_open() {
  local host="$1"
  local port="$2"
  (echo >"/dev/tcp/$host/$port") >/dev/null 2>&1
}

assert_running() {
  local name="$1"
  local pid="$2"
  local logfile="$3"
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "[error] $name failed to start. Check: $logfile"
    tail -n 40 "$logfile" || true
    exit 1
  fi
}

cleanup() {
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}

trap cleanup EXIT INT TERM

case "$RUN_MOSQUITTO" in
  0)
    echo "[1/4] Skipping Mosquitto broker (RUN_MOSQUITTO=0)"
    ;;
  1)
    if is_port_open "127.0.0.1" 1883; then
      echo "[error] RUN_MOSQUITTO=1 but port 1883 is already in use."
      echo "        Stop the existing broker, or rerun with RUN_MOSQUITTO=0."
      exit 1
    fi
    echo "[1/4] Starting Mosquitto broker..."
    mosquitto -c "$ROOT_DIR/mosquitto/mosquitto.conf" >"$RUN_DIR/mosquitto.log" 2>&1 &
    MOSQUITTO_PID="$!"
    PIDS+=("$MOSQUITTO_PID")
    ;;
  auto)
    if is_port_open "127.0.0.1" 1883; then
      echo "[1/4] Reusing existing MQTT broker on :1883 (RUN_MOSQUITTO=auto)"
    else
      echo "[1/4] Starting Mosquitto broker..."
      mosquitto -c "$ROOT_DIR/mosquitto/mosquitto.conf" >"$RUN_DIR/mosquitto.log" 2>&1 &
      MOSQUITTO_PID="$!"
      PIDS+=("$MOSQUITTO_PID")
    fi
    ;;
  *)
    echo "[error] Invalid RUN_MOSQUITTO value: $RUN_MOSQUITTO (expected: auto, 1, or 0)"
    exit 1
    ;;
esac

echo "[2/4] Starting backend..."
(
  cd "$ROOT_DIR/backend"
  python3 -m pip install -r requirements.txt 2>/dev/null || python -m pip install -r requirements.txt
  python3 -m alembic upgrade head
  python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
) >"$RUN_DIR/backend.log" 2>&1 &
BACKEND_PID="$!"
PIDS+=("$BACKEND_PID")

echo "[3/4] Starting frontend..."
(
  cd "$ROOT_DIR/frontend"
  if [ ! -d node_modules ]; then
    npm install
  fi
  npm run dev -- --host 127.0.0.1 --port 5173
) >"$RUN_DIR/frontend.log" 2>&1 &
FRONTEND_PID="$!"
PIDS+=("$FRONTEND_PID")

if [ "$RUN_SIMULATOR" = "1" ]; then
  echo "[4/4] Starting sensor simulator..."
  (
    cd "$ROOT_DIR/esp32-simulators"
    if [ ! -d node_modules ]; then
      npm install
    fi
    npm start
  ) >"$RUN_DIR/simulator.log" 2>&1 &
  SIMULATOR_PID="$!"
  PIDS+=("$SIMULATOR_PID")
else
  echo "[4/4] Skipping simulator (RUN_SIMULATOR=$RUN_SIMULATOR)"
fi

sleep 2
if [ -n "$MOSQUITTO_PID" ]; then
  assert_running "mosquitto" "$MOSQUITTO_PID" "$RUN_DIR/mosquitto.log"
fi
assert_running "backend" "$BACKEND_PID" "$RUN_DIR/backend.log"
assert_running "frontend" "$FRONTEND_PID" "$RUN_DIR/frontend.log"
if [ "$RUN_SIMULATOR" = "1" ] && [ -n "$SIMULATOR_PID" ]; then
  assert_running "simulator" "$SIMULATOR_PID" "$RUN_DIR/simulator.log"
fi

echo
echo "Stack started."
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8000/health"
echo "Logs:     $RUN_DIR/{mosquitto,backend,frontend,simulator}.log"
echo
echo "Press Ctrl+C to stop everything."

wait
