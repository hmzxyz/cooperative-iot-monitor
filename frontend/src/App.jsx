import { useEffect, useMemo, useRef, useState } from 'react';
import MqttManager from './MqttManager.js';
import SensorCard from './components/SensorCard.jsx';
import { DEFAULT_BROKER_URL, MQTT_TOPICS, SENSOR_CONFIGS } from './config.js';

const buildInitialSensors = () => ({
  temperature: { value: 24.0, unit: '°C' },
  humidity: { value: 55, unit: '%' },
  weight: { value: 120, unit: 'kg' },
  flow: { value: 12, unit: 'L/min' },
});

function App() {
  const [sensorData, setSensorData] = useState(buildInitialSensors());
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [mockMode, setMockMode] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [brokerUrl, setBrokerUrl] = useState(DEFAULT_BROKER_URL);
  const [brokerUrlInput, setBrokerUrlInput] = useState(DEFAULT_BROKER_URL);
  const mqttManagerRef = useRef(null);

  const sensorCards = useMemo(
    () =>
      Object.keys(MQTT_TOPICS).map((sensorKey) => ({
        key: sensorKey,
        label: SENSOR_CONFIGS[sensorKey].label,
        unit: SENSOR_CONFIGS[sensorKey].unit,
        value: sensorData[sensorKey]?.value ?? '--',
      })),
    [sensorData]
  );

  useEffect(() => {
    mqttManagerRef.current = new MqttManager({
      brokerUrl,
      onStatusChange: (status) => setConnectionStatus(status),
      onData: (sensorKey, value, isMock) => {
        setSensorData((prev) => ({
          ...prev,
          [sensorKey]: {
            value: Number(value.toFixed(1)),
            unit: SENSOR_CONFIGS[sensorKey]?.unit ?? '',
            source: isMock ? 'mock' : 'live',
          },
        }));
        setLastUpdated(new Date());
      },
      onMockModeChange: (active) => setMockMode(active),
    });

    mqttManagerRef.current.connect();

    return () => {
      mqttManagerRef.current.disconnect();
    };
  }, []);

  const toggleMode = () => {
    const nextMockMode = !mockMode;
    mqttManagerRef.current.setForceMock(nextMockMode);
    setMockMode(nextMockMode);
  };

  const handleBrokerConnect = () => {
    setBrokerUrl(brokerUrlInput);
    if (mqttManagerRef.current) {
      mqttManagerRef.current.updateBrokerUrl(brokerUrlInput);
    }
  };

  const statusLabel = useMemo(() => {
    if (mockMode) {
      return '📡 Mock Data (no ESP32)';
    }
    if (connectionStatus === 'Connected') {
      return '✅ Connected';
    }
    if (connectionStatus === 'Connecting' || connectionStatus === 'Reconnecting') {
      return '⏳ Connecting';
    }
    return '❌ Disconnected';
  }, [connectionStatus, mockMode]);

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Cooperative IoT Monitor</p>
          <h1>Live Sensor Dashboard</h1>
          <p className="hero-panel__intro">
            MQTT over WebSocket with fallback mock data. The dashboard updates automatically and switches to live values when real messages arrive.
          </p>
        </div>
        <div className="hero-panel__status-row">
          <div className="status-badge">{statusLabel}</div>
          <button className="primary-button" type="button" onClick={toggleMode}>
            {mockMode ? 'Switch to Live MQTT Mode' : 'Switch to Mock Mode'}
          </button>
        </div>
      </header>

      <section className="control-panel">
        <div className="control-panel__item">
          <label htmlFor="brokerUrl">MQTT Broker</label>
          <div className="broker-input-row">
            <input
              id="brokerUrl"
              type="text"
              value={brokerUrlInput}
              onChange={(event) => setBrokerUrlInput(event.target.value)}
              placeholder="ws://localhost:9001"
            />
            <button className="secondary-button" type="button" onClick={handleBrokerConnect}>
              Connect
            </button>
          </div>
          <p className="control-panel__meta">Current broker</p>
          <p>{brokerUrl}</p>
        </div>
        <div className="control-panel__item">
          <p className="control-panel__meta">Last update</p>
          <p>{lastUpdated.toLocaleTimeString()}</p>
        </div>
      </section>

      <main className="grid-panel">
        {sensorCards.map(({ key, label, value, unit }) => (
          <SensorCard key={key} label={label} value={value} unit={unit} />
        ))}
      </main>

      <footer className="footer-note">
        <p>
          The app automatically generates placeholder values when MQTT is unavailable. Real values will override placeholder readings when messages are received on configured topics.
        </p>
      </footer>
    </div>
  );
}

export default App;
