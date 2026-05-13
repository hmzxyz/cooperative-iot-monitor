# Realistic IoT Simulation System for Broyeur Machine

## 1. System Overview

The **Cooperative IoT Monitor** is an industrial sensor monitoring system for grain processing equipment (broyeur). This simulation creates a complete digital twin before physical hardware deployment, enabling development of a full IoT pipeline:

- **Hardware Layer**: Simulated ESP32 node measuring weight, flow, temperature, and humidity
- **Communication Layer**: MQTT messaging between devices and backend
- **Backend Layer**: FastAPI service storing sensor data and providing REST/WebSockets
- **Frontend Layer**: React dashboard with live visualizations and machine status monitoring
- **MES Layer**: Virtual Manufacturing Execution System simulating production tracking

## 2. Architecture Diagram

```
[ESP32 Simulator / Wokwi] 
        ⇅ (MQTT over TCP/WS)
[FastAPI Backend] 
        ⇅ (WebSocket / REST API)
[React Dashboard]
        ⇅ (MES Layer)
[Node-RED MES Simulation]
```

## 3. Tool Selection Justification

| Component | Tool | Why Quantitative Micromanagement Makes Sense for Industrial IoT |
|----------|------|-------------------------------------------------------------------|
| **ESP32 Sim** | Wokwi | Browser-based, no hardware needed, supports DHT22/HX711/flow simulation |
| **MQTT Broker** | Mosquitto | Industry standard, supports retained messages, scalable for real deployments |
| **Backend** | FastAPI | Async Python, automatic OpenAPI docs, SQLAlchemy ORM for SQL/PG integration |
| **Frontend** | React + Vite | Modern hooks API, excellent SVG charting (victoryform), fast dev server |
| **MES** | Node-RED | Visual flow programming for non-developers, evaluates complete MES flow |
| **MQTT Protocol** | Cooperative Topic Structure | `cooperative/device/{device_id}/sensor/{sensor_id}` ensures industrial-grade organization |
| **Database** | SQLite (dev), PostgreSQL (prod) | Zero-setup dev, production-ready scaling support |

## 4. Wokwi Simulation Setup

### diagram.json

```json
{
  "version": "1.0.0",
  "raspberrypi": {
    "services": [
      {
        "name": "mqtt-broker",
        "image": "eclipse-mosquitto",
        "ports": ["1883:1883", "9001:9001"],
        "volumes": ["./mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf"]
      }
    ]
  },
  "diagramme": [
    {
      "id": "esp32",
      "template": "wokwi-esp32-devkit-v4",
      "label": "ESP32 DevKit v4",
      "neighbors": [
        {"input": 4, "output": "dht22_out", "label": "GPIO4"},
        {"input": 16, "output": "hx711_dt", "label": "GPIO16"},
        {"input": 17, "output": "hx711_sck", "label": "GPIO17"},
        {"input": 5,  "output": "flow_pulse", "label": "GPIO5"}
      ]
    },
    {
      "id": "dht22",
      "template": "wokwi-dht22@1",
      "top": 28,
      "left": 18
    },
    {
      "id": "hx711",
      "template": "wokwi-hx711@1",
      "top": 84,
      "left": 18
    },
    {
      "id": "mosq",
      "template": "wokwi-mosquitto@1",
      "top": 18,
      "left": 54
    }
  ]
}
```

### Pin Mapping

| Component | Wokwi Part | GPIO Pin | Purpose | Simulation Notes |
|-----------|------------|----------|---------|----------------|
| DHT22 | `wokwi-dht22` | 4 | Temperature/Humidity | Virtual sensor with realistic thermal behavior |
| HX711 | `wokwi-hx711` | 16,17 | Load Cell Interface | Software emulation of ADC readings |
| Flow Sensor | Pulse Input | 5 | Pulse-Based Flow Measurement | Triggered via mock pulses or manual intervention |
| MQTT Broker | Mosquitto | WS Port 9001 | WebSocket support for browser clients | Retained messages enabled |

## 5. ESP32 Firmware

**File: `wokwi/esp32-firmware.ino`**

```cpp
// #include <WiFi.h>
// #include <PubSubClient.h>
#include <HX711.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <DHT.h>

// WiFi Configuration
const char* ssid = "your_ssid";
const char* password = "your_password";

// MQTT Configuration
const char* mqtt_server = "192.168.1.100";
const int mqtt_port = 1883;
const char* mqtt_user = "username";
const char* mqtt_password = "password";

WiFiClient espClient;
PubSubClient client(espClient);

// Sensor Definitions
DHT dht(4, DHT22);
HX711 scale;

// Sensor Readings
float temperature, humidity, weight, flow;

// Device Configuration
const char* device_id = "sim-esp32-001";

// Setup Function
void setup() {
  Serial.begin(115200);
  
  // WiFi Connection
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  
  // MQTT Setup
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  
  // Sensor Initialization
  dht.begin();
  scale.begin(16, 17); // DT, SCK pins
  
  // Connect to MQTT
  reconnectMQTT();
}

// Main Loop Function
void loop() {
  if (!client.connected()) reconnectMQTT();
  client.loop();
  
  // Read Sensors
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();
  weight = scale.get_units(5); // 5 sample averaged
  flow = calculateFlow();
  
  // Publish Sensors
  unsigned long now = millis();
  static unsigned long lastPublish = 0;
  
  if (now - lastPublish > 2000) {
    publishSensors();
    lastPublish = now;
  }
}

// MQTT Connection Function
void reconnectMQTT() {
  while (!client.connected()) {
    if (client.connect(device_id, mqtt_user, mqtt_password)) {
      Serial.println("MQTT Connected");
    } else {
      delay(2000);
    }
  }
}

// Sensor Publishing
void publishSensors() {
  // Publish Individual Sensors
  client.publish(("cooperative/device/" + String(device_id) + "/sensor/temperature").c_str(), stringToCharArray(String(temperature).c_str()));
  client.publish(("cooperative/device/" + String(device_id) + "/sensor/humidity").c_str(), stringToCharArray(String(humidity).c_str()));
  client.publish(("cooperative/device/" + String(device_id) + "/sensor/weight").c_str(), stringToCharArray(String(weight).c_str()));
  client.publish(("cooperative/device/" + String(device_id) + "/sensor/flow").c_str(), stringToCharArray(String(flow).c_str()));
  
  // Publish Status
  String statusMsg = "{\"online\": true, \"uptime\": " + String(millis()/1000) + "}";
  client.publish(("cooperative/device/" + String(device_id) + "/status").c_str(), statusMsg.c_str(), true, true);
}

// Helper Functions
char* stringToCharArray(const char* str) {
  static char buffer[50];
  strncpy(buffer, str, sizeof(buffer)-1);
  buffer[sizeof(buffer)-1] = '\0';
  return buffer;
}

float calculateFlow() {
  // Simulate flow based on weight changes
  static float lastWeight = 0;
  static unsigned long lastFlowTime = 0;
  float currentWeight = weight;
  
  if (currentWeight > lastWeight) {
    // Positive delta = inflow
    float delta = currentWeight - lastWeight;
    lastFlowTime = now();
    return delta * 5.0;  // Conversion factor
  } else {
    // No flow when weight not increasing
    if (now() - lastFlowTime > 10000) {
      return 0;
    }
    return 0.1 + random(0, 5)/10.0;
  }
}
byte[] toBytes(String str) {
  return str.getBytes();
}

// Required MQTT Functions
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Handle incoming messages
  String topicStr = String(topic);
  if (topicStr.startsWith("command")) {
    handleCommand(payload, length);
  }
}
```

## 6. MQTT Schema

### Topic Structure
```
cooperative/device/{device_id}/sensor/{sensor_type}
```

### Payload Format
- Individual sensor: `"42.7"` (raw string value)
- Status heartbeat: JSON string:
```json
{
  "online": true,
  "uptime": 1245,
  "location": "Barn A – Station 1",
  "location_verbatim": "Barn A – Station 1",
  "alerts": [],
  "ts": 1717834567890
}
```

### Sensor Types and Units
| Sensor Key | JSON Key | Unit | Range | Application |
|------------|----------|------|-------|-------------|
| `temperature` | Temperature | °C | 18-35 | Environment monitoring |
| `humidity` | Humidity | % | 40-90 | Condensation prevention |
| `weight` | Mass | kg | 0-50 | Material quantity tracking |
| `flow` | Flow Rate | L/min | 0-10 | Liquid throughput monitoring |

## 7. Backend Architecture

### FastAPI Structure
```
backend/
├── app/
│   ├── main.py          # Application entrypoint
│   ├── database.py      # SQLAlchemy integration
│   ├── mqtt_subscriber.py # MQTT consumer with MES logic
│   ├── routers/
│   │   ├── auth.py      # Authentication endpoints
│   │   ├── sensors.py   # Sensor history API
│   │   └── mes.py       # MES layer (new)
│   └── schemas/
│       └── sensor_reading.py
```

### Key Enhancements from Plan
1. **WebSocket Endpoint** (`/ws`):
   - Tracks WebSocket connections
   - Pushes real-time updates to frontend
   - Subscribes to MQTT topic changes

2. **MES Router** (`/api/mes/*`):
   - `GET /status` - Machine state (RUNNING/IDLE/ERROR)
   - `GET /production` - Production metrics (batch counts, total processed)
   - `GET /alerts` - Active threshold violations
   - `POST /command` - Simulated control commands

3. **MES Logic in Subscriber**:
   ```python
   # Pseudo-code in mqtt_subscriber.py
   def on_message(client, userdata, msg):
     if parse_sensor_topic(msg.topic)[1] == "weight" and is_draining_event:
       track_batch_completion()
       update_production_metrics()
     if sensor_value > threshold:
       trigger_alert(sensor_type, level)
   ```

## 8. Frontend Architecture

### Component Structure
```
frontend/src/
├── App.jsx              # Main application
├── components/
│   ├── AlertsSidebar.jsx
│   ├── HistoryChart.jsx
│   ├── MesPanel.jsx     # New MES dashboard
│   └── MachineStatus.jsx
├── context/
│   └── AuthContext.jsx
├── MqttManager.js       # MQTT.js manager with MES integration
└── config.js            # Configuration constants
```

### Real-time Connection
1. Default: Connects directly to MQTT WebSocket (port 9001)
2. Alternative: Fallback to HTTP/WebSocket fallback from backend

### MES Integration
```jsx
// In MesPanel.jsx
const [mesData, setMesData] = useState({
  status: "IDLE",
  production: 0,
  batchCount: 0,
  efficiency: "100%",
  alerts: []
});

useEffect(() => {
  // Alternative: Call /api/mes/status every 30s
  const fetchMESUpdates = async () => {
    const response = await fetch("/api/mes/status", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setMesData(data);
  };
  const interval = setInterval(fetchMESUpdates, 30000);
  return () => clearInterval(interval);
}, []);
```

## 9. MES Simulation Logic

### Production Tracking
- **Batch Detection**: Weight sensor transitions from "filling" to "draining" state
- **Batch Size**: Calculated as weight difference + tolerance
- **Production Count**: Incremented for each completed batch
- **Total Processed**: Cumulative weight measurement

### Machine State Logic
```javascript
function determineMachineState(sensorReadings) {
  const { weight, flow, temperature } = sensorReadings;
  
  // State Transitions
  if (weight > 30 && flow > 1.5 && temperature < 35) {
    return "RUNNING";
  } else if (weight === 0) {
    return "IDLE";
  } else if (temperature > 38) {
    return "ERROR (OVERHEAT)";
  } else {
    return "MAINTENANCE";
  }
}
```

### Alert System
- **Temperature Alert**: > 30°C (warning), > 33°C (critical)
- **Humidity Alert**: > 80% (warning), > 87% (critical)  
- **Weight Alert**: > 44kg (warning), > 48kg (critical)
- **Flow Alert**: > 7L/min (warning), > 9L/min (critical)

### Node-RED MES Flows
```json
{
  "flows": [
    {
      "id": "mes-production",
      "type": "function",
      "func": "if (msg.payload.sensor === 'weight' && msg.payload.action === 'drain_begin') {\\n  msg.batch_start = Date.now();\\n  return msg;\\n}\\nif (msg.payload.sensor === 'weight' && msg.payload.action === 'drain_end') {\\n  const duration = Date.now() - msg.batch_start;\\n  msg.production_event = {\\n    batch_size: msg.weight_delta,\\n    duration: duration,\\n    timestamp: Date.now()\\n  };\\n  production_batch.push(msg.production_event);\\n  return msg;\\n}",
      "wsflow_url": "ws://localhost:1880"
    },
    {
      "id": "machine-status",
      "type": "function",
      "func": "const state = determineMachineState(msg.payload);\\nmsg.payload = {status: state};\\nreturn msg;",
      "wsflow_url": "ws://localhost:1880"
    }
  ]
}
```

## 10. Step-by-Step Run Instructions

### Prerequisites
1. Node.js (v18+)
2. Python (v3.10+)
3. Mosquitto MQTT Broker
4. Git

### Setup Steps

#### 1. Start MQTT Broker
```bash
mosquitto -c mosquitto/mosquitto.conf
```

#### 2. Run Backend
```bash
cd backend
.venv-test/bin/uvicorn app.main:app --reload --port 8000
```

#### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```

#### 4. Run Wokwi Simulation (or Node.js Alternative)
```bash
# Option A: Wokwi Cloud (https://wokwi.com)
# Upload diagram.json and esp32-firmware.ino

# Option B: Local Simulation
cd esp32-simulators
node index.js
```

#### 5. Verify Full Pipeline
1. Open browser at `http://localhost:5173`
2. Check sensor readings on dashboard
3. Verify Machine Status panel shows "IDLE" or "RUNNING"
4. Check Production metrics update when draining occurs
5. Observe alerts panel for threshold violations

### Troubleshooting
- **No MQTT Data**: Check Mosquitto console for connection errors
- **Stale Data**: Restart frontend or toggle "Switch to Mock Mode"
- **Connection Issues**: Verify broker URL in frontend config
- **MES Not Updating**: Check WebSocket connection to backend

## Appendix: Hardware Specifications

### ESP32 Implementation Details
- **Microcontroller**: ESP32 DevKit v4
- **Clock**: 240MHz
- **WiFi**: 2.4GHz b/g/n
- **Flash**: 4MB
- **Voltage**: 3.3V

### Sensor Specifications
| Sensor | Type | Measurement | Range |
|--------|------|-------------|-------|
| Temperature | Digital | °C | 0-100 |
| Humidity | Digital | %RH | 0-100 |
| Weight | Strain Gauge | kg | 0-50 (Loaded) |
| Flow | Pulse Counter | L/min | 0-10 |

### MQTT Configuration
- **Broker**: Mosquitto v2.0+
- **Port**: 1883 (TCP), 9001 (WebSocket)
- **Security**: TLS/SSL optional for production
- **QoS**: 0 (at most once) for sensor data
- **Retained**: true for status messages only

<system-reminder>
## Exited Work Mode

The simulation documentation is now complete and stored at `/home/hamza/Documents/github/cooperative-iot-monitor/sim.md`. 

Use this file with other AI agents or project stakeholders to understand the complete architecture, implementation details, and run instructions for the realistic IoT simulation system.
</system-reminder>