import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MqttManager from './MqttManager.js';
import SensorCard from './components/SensorCard.jsx';
import HistoryChart from './components/HistoryChart.jsx';
import AlertsSidebar from './components/AlertsSidebar.jsx';
import { DEFAULT_BROKER_URL, MQTT_TOPICS, SENSOR_CONFIGS } from './config.js';
import { apiFetch } from './api.js';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage.jsx';

const SENSOR_RANGES = {
  temperature: { min: 18, max: 35, initial: 24, alpha: 0.3, maxDelta: 0.6 },
  humidity: { min: 40, max: 90, initial: 60, alpha: 0.28, maxDelta: 1.4 },
  weight: { min: 0, max: 50, initial: 10, alpha: 0.25, maxDelta: 1.8 },
  flow: { min: 0, max: 10, initial: 2, alpha: 0.3, maxDelta: 0.5 },
};

const SENSOR_KEYS = Object.keys(SENSOR_CONFIGS);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const smoothSensorValue = (sensorKey, previousValue, incomingValue) => {
  const profile = SENSOR_RANGES[sensorKey];
  if (!profile) {
    return Number(incomingValue.toFixed(1));
  }

  const boundedIncoming = clamp(incomingValue, profile.min, profile.max);
  if (!Number.isFinite(previousValue)) {
    return Number(boundedIncoming.toFixed(1));
  }

  const blended = previousValue + (boundedIncoming - previousValue) * profile.alpha;
  const delta = clamp(blended - previousValue, -profile.maxDelta, profile.maxDelta);
  return Number(clamp(previousValue + delta, profile.min, profile.max).toFixed(1));
};

const buildInitialSensors = () =>
  SENSOR_KEYS.reduce((acc, sensorKey) => {
    acc[sensorKey] = {
      value: SENSOR_RANGES[sensorKey].initial,
      unit: SENSOR_CONFIGS[sensorKey].unit,
      source: 'bootstrap',
    };
    return acc;
  }, {});

const sourceLabel = (source) => {
  if (source === 'live') return 'Live MQTT';
  if (source === 'api') return 'Backend persisted';
  if (source === 'mock') return 'Simulated fallback';
  return 'Waiting for data';
};

function Dashboard() {
  const { logout, username, token } = useAuth();
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
        description: sourceLabel(sensorData[sensorKey]?.source),
      })),
    [sensorData]
  );

  const applySensorUpdate = useCallback((sensorKey, rawValue, source) => {
    if (!Number.isFinite(rawValue)) {
      return;
    }
    setSensorData((prev) => {
      const previousValue = prev[sensorKey]?.value;
      const nextValue = smoothSensorValue(sensorKey, previousValue, rawValue);
      return {
        ...prev,
        [sensorKey]: {
          value: nextValue,
          unit: SENSOR_CONFIGS[sensorKey]?.unit ?? '',
          source,
        },
      };
    });
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    mqttManagerRef.current = new MqttManager({
      brokerUrl,
      onStatusChange: (status) => setConnectionStatus(status),
      onData: (sensorKey, value, isMock) => {
        applySensorUpdate(sensorKey, value, isMock ? 'mock' : 'live');
      },
      onMockModeChange: (active) => setMockMode(active),
    });

    mqttManagerRef.current.connect();

    return () => {
      mqttManagerRef.current.disconnect();
    };
  }, [applySensorUpdate]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const hydrateLatestReadings = async () => {
      // Prefer live MQTT when connected; otherwise hydrate from persisted backend data.
      if (!mockMode && connectionStatus === 'Connected') {
        return;
      }
      try {
        const latest = await apiFetch('/sensors/latest', token);
        SENSOR_KEYS.forEach((sensorKey) => {
          const value = Number(latest?.[sensorKey]?.payload?.value);
          if (Number.isFinite(value)) {
            applySensorUpdate(sensorKey, value, 'api');
          }
        });
      } catch (err) {
        if (err.message === 'unauthorized') {
          logout();
        }
      }
    };

    hydrateLatestReadings();
    const intervalId = setInterval(hydrateLatestReadings, 12_000);
    return () => clearInterval(intervalId);
  }, [token, mockMode, connectionStatus, logout, applySensorUpdate]);

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
      return 'Mock Data (no ESP32)';
    }
    if (connectionStatus === 'Connected') {
      return 'Connected';
    }
    if (connectionStatus === 'Connecting' || connectionStatus === 'Reconnecting') {
      return 'Connecting';
    }
    return 'Disconnected';
  }, [connectionStatus, mockMode]);

  return (
    <div className="app-shell">
      <div className="dashboard-wrapper">
        <AlertsSidebar
          connectionStatus={connectionStatus}
          mockMode={mockMode}
          lastUpdated={lastUpdated}
          sensorData={sensorData}
        />
        <div className="main-content">
          <header className="hero-panel">
        <div>
          <p className="eyebrow">Cooperative IoT Monitor</p>
          <h1>AI-Assisted Sensor Dashboard</h1>
          <p className="hero-panel__intro">
            Live production readings with AI recommendations for what technicians should check next.
          </p>
        </div>
        <div className="hero-panel__status-row">
          <div className="hero-panel__status-group">
            <div className="status-badge">{statusLabel}</div>
            <p className="user-badge">User: {username || 'unknown'}</p>
          </div>
          <button className="primary-button" type="button" onClick={toggleMode}>
            {mockMode ? 'Switch to Live MQTT Mode' : 'Switch to Mock Mode'}
          </button>
          <button className="secondary-button" type="button" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      <section className="control-panel">
        <div className="control-panel__item">
          <label htmlFor="brokerUrl">Data Source</label>
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
          <p className="control-panel__meta">Current connection endpoint</p>
          <p>{brokerUrl}</p>
        </div>
        <div className="control-panel__item">
          <p className="control-panel__meta">Last update</p>
          <p>{lastUpdated.toLocaleTimeString()}</p>
        </div>
      </section>

      <main className="grid-panel">
        {sensorCards.map(({ key, label, value, unit, description }) => (
          <SensorCard key={key} label={label} value={value} unit={unit} description={description} />
        ))}
      </main>

      <section className="charts-panel">
        <h2 className="charts-panel__heading">History (last 40 readings)</h2>
        <div className="charts-grid">
          {Object.entries(SENSOR_CONFIGS).map(([key, { label, unit }]) => (
            <HistoryChart key={key} sensorId={key} label={label} unit={unit} />
          ))}
        </div>
      </section>

      <footer className="footer-note">
        <p>
          When hardware is offline, the dashboard keeps a safe simulated view active until live sensor data returns.
        </p>
      </footer>
    </div>
    </div>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <LoginPage />;
}

export default App;
