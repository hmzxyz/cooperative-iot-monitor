#!/usr/bin/env bash
# Startup script for Cooperative IoT Monitor on Manjaro Linux
# Starts MQTT broker, backend FastAPI server, and frontend Vite dev server.
# Run the script from the repository root: ./start.sh

# Exit on any error
set -e

# Stop any existing Mosquitto broker and start a fresh one in background
pkill -f mosquitto || true
mosquitto -c "$(pwd)/mosquitto/mosquitto.conf" &
MOSQUITTO_PID=$!

echo "MQTT broker started (PID $MOSQUITTO_PID)"

# Activate backend virtual environment and start FastAPI server
source "$(pwd)/backend/.venv/bin/activate"
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Backend server started (PID $BACKEND_PID)"

# Start frontend dev server
cd "$(pwd)/frontend"
npm run dev &
FRONTEND_PID=$!

echo "Frontend dev server started (PID $FRONTEND_PID)"

# Wait for any of the processes to exit
wait -n

# Cleanup background processes if one exits
kill $MOSQUITTO_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
