# Cooperative IoT Monitor Documentation

## Project Overview
A full-stack IoT monitoring system for cooperative management, featuring:
- ✨ Real-time sensor data collection (weight, temperature, pressure)
- ✨ Event-driven analytics and alerts
- ✨ Mobile-first interface with offline capabilities
- ✨ Tunisian accounting compliance

## Key Components
### Frontend
- React/Vite/Tailwind stack with context API
- TanStack Query v5 for data fetching
- Offline-first React Native (in development)

### Backend
- FastAPI with JWT security
- SQLAlchemy ORM with JSON payloads
- MQTT broker (Mosquitto) for device communication

### Tech stack
- Python 3.11, Node.js 18, ESP32
- PostgreSQL database
- Docker (optional)

## Setup Instructions
1. Clone repository
```bash
 git clone https://github.com/your/repo.git
```
2. Install dependencies
```bash
 npm install
 pip install -r requirements.txt
```
3. Configure environment variables (.env file required)
4. Start services
```bash
 npm run dev
# or
python backend/app/main.py
```

## Current Status
- ✅ Sprint 0: Auth system stabilized
- • Sprint 1: Real sensor integration (in progress)
- ❗ Sprint 2-4: Mobile & accounting features (planned)

## Contact
[aaron@cooperative.io](mailto:aaron@cooperative.io)

## Roadmap

[Sprint Plan](designDocs/00_Inception/CONTRIBUTING.md)
designDocs/00_Inception/getting-started.md


**Technical Learning Guide**: designDocs/learning.md
