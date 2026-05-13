# Getting Started with Cooperative IoT Monitor

## Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL 13+
- Docker (optional, for containerized deployment)
- MQTT broker (Mosquitto recommended)

## Backend Setup
1. Navigate to the backend directory:
```bash
cd backend
```
2. Install Python dependencies:
```bash
pip install -r requirements.txt
```
3. Set up environment variables (copy `.env.example` to `.env` and fill in values):
```bash
cp .env.example .env
```
   - `JWT_SECRET_KEY`: Strong random string for JWT signing
   - `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://user:password@localhost/dbname`)
   - `MQTT_BROKER_HOST`: MQTT broker address (default: `localhost`)
   - `MQTT_BROKER_PORT`: MQTT broker port (default: `1883`)

4. Run database migrations:
```bash
alembic upgrade head
```
5. Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```
   The API will be available at `http://localhost:8000`.

## Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
```
2. Install npm dependencies:
```bash
npm install
```
3. Set up environment variables (create `.env` file in frontend root):
   - `VITE_API_BASE_URL`: Base URL for backend API (e.g., `http://localhost:8000/api`)
   - `VITE_WS_URL`: WebSocket URL for real-time updates (e.g., `ws://localhost:8000/ws`)
4. Start the development server:
```bash
npm run dev
```
   The app will be available at `http://localhost:5173`.

## ESP32 Firmware
1. Install Arduino IDE with ESP32 board support.
2. Install required libraries:
   - Adafruit BMP280 Library
   - HX711 Library
   - PubSubClient (MQTT)
3. Open `esp32-firmware/main.ino` and update WiFi and MQTT settings.
4. Compile and upload to your ESP32 device.

## Running Tests
### Backend
```bash
cd backend
pytest
```
### Frontend
```bash
cd frontend
npm test
```

## Common Issues
- **Port conflicts**: Ensure ports 8000 (API) and 5173 (frontend) are free.
- **Environment variables**: Missing variables will cause startup errors.
- **MQTT connection**: Verify broker is running and accessible.

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.