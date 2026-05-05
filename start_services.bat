@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo Starting Cooperative IoT Monitor services...
echo.

echo [1/4] Checking for Mosquitto on port 1883...
netstat -ano | findstr :1883 >nul 2>&1
if %errorlevel% == 0 (
    echo Mosquitto already running
) else (
    echo Mosquitto not running (optional - using mock data)
)
echo.

echo [2/4] Starting Backend (FastAPI on port 8000)...
cd backend
start /B "Backend" python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
timeout /t 2 /nobreak
cd ..
echo.

echo [3/4] Starting Frontend (Vite on port 5173)...
cd frontend
start /B "Frontend" cmd /c npm run dev
timeout /t 3 /nobreak
cd ..
echo.

echo [4/4] Starting Simulator...
cd esp32-simulators
start /B "Simulator" cmd /c npm start
cd ..
echo.

echo.
echo ========================================
echo Stack is starting!
echo ========================================
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000/health
echo ========================================
echo.
echo Press any key to continue monitoring, or close this window when done.
pause
