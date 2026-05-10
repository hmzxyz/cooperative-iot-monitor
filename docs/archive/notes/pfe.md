# PFE PROJECT: AGRO-INDUSTRIAL IoT SIMULATION FOR BROYEUR MACHINE

## 1. Introduction
This project documents a complete Computer engineering Engineering Project (PFE) delivering a realistic digital twin simulation system for an agro-industrial grain processing machine (broyeur). The simulation replicates the full IoT pipeline from hardware sensor data through to production execution systems.

## 2. Project Objectives
- Create simulation before physical implementation
- Enable complete functional testing and optimization
- Develop machine learning capabilities for predictive maintenance
- Implement system monitoring for technician alerts
- Demonstrate production metrics extraction and analysis

## 3. Technical Overview
### 3.1 Hardware Layer
- **ESP32 Simulator**: Virtual Davis Sensors suite including:
  - DHT22 (temperature/humidity)
  - HX711 (load cell for weight)
  - Flow sensor (pulse counter)

### 3.2 Communication Layer
- MQTT Protocol (v3.1.1)
- Topic Structure:
  ```bash
  cooperative/device/{device_id}/sensor/{sensor_type}
  cooperative/device/{device_id}/status
  cooperative/device/{device_id}/alerts
  ```

### 3.3 Backend Architecture
**FastAPI Service**:
```bash
/app
  ├── main.py          # Entry point
  ├── database.py      # SQLAlchemy models
  ├── mqtt_subscriber.py # Real-time message consumer
  ├── routers/
  │   ├── auth.py      # JWT Authentication
  │   ├── sensors.py   # Sensor data API
  │   └── mes.py       # MES Layer Endpoints
  └── schemas/
      └── sensor_reading.py
```

## 4. Frontend components
```bash
/src
  ├── App.jsx          # Main application
  ├── components/
  │   └── MesPanel.jsx # New MES dashboard component
  ├── context/
  │   └── AuthContext.jsx
  ├── pages/           # Authentication flow
  └── mqtt.js          # WebSocket connection manager
```

## 5. MES Simulation Logic
### Production Tracking Algorithm:
```javascript
function determineMachineState(sensorData) {
  const { weight, flow, temperature } = sensorData;
  if (weight > 30 && flow > 1.5 && temperature < 35) {
    return "RUNNING";
  } else if (weight === 0) {
    return "IDLE";
  } else if (temperature > 38) {
    return "ERROR (OVERHEAT)";
  }
  return "MAINTENANCE";
}
```

## 6. Simulation Protocol
1. **Hardware Layer**: Start Wokwi ESP32 simulation
2. **Communication Layer**: Connect to MQTT broker
3. **Backend**: Start FastAPI service
4. **Frontend**: Launch React dashboard
5. **MES Layer**: Monitor
 production metrics

## 7. Project Outcomes
- Functional simulation with 4 sensor types
- Real-time monitoring dashboard
- Implement error detection system
- Production metrics extraction
- MQTT/WebSocket integration
- Authentication system for technicians

## 8. Future Enhancements
- Machine learning integration for anomaly detection
- Production analysis ML models
- Full implementation documentation

## 9. Academic References
1. [Kay004.servicerendezvous.org Machine Maintenance PDF](https://www.kay004.servicerendezvous.org/paper-writing-service/research-paper-services/)
2. [Overview of Machine Monitoring Systems](https://www.researchgate.net/publication/336043062_Machine_health_monitoring_by_wearing_sensors_Security_energy_consumption_artifacts)
3. [MES Implementation Strategies](https://www.sciencedirect.com/science/article/pii/S0925273611001815")

## 10. Appendix
### Deployment Diagram
```
[ESP32 Simulator / Wokwi] 
        ⇅ (MQTT over TCP/WS)
[FastAPI Backend] 
        ⇅ (WebSocket / REST API)
[React Dashboard]
        ⇅ (MES Layer)
[Node-RED MES Simulation]
```