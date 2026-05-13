import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MqttManager from './MqttManager.js';
import SensorCard from './components/SensorCard.jsx';
import HistoryChart from './components/HistoryChart.jsx';
import Navbar from './components/Navbar.jsx';
import UserManagementPanel from './components/UserManagementPanel.jsx';
import { DEFAULT_BROKER_URL, MQTT_TOPICS, SENSOR_CONFIGS } from './config.js';
import { apiFetch } from './api.js';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage.jsx';

const SENSOR_RANGES = {
  temperature: { min: 18, max: 100, initial: 26, alpha: 0.28, maxDelta: 0.9 },
  vibration: { min: 0, max: 10, initial: 1.2, alpha: 0.32, maxDelta: 0.45 },
  current_amp: { min: 0, max: 25, initial: 6.5, alpha: 0.25, maxDelta: 0.8 },
  weight_kg: { min: 0, max: 600, initial: 220, alpha: 0.22, maxDelta: 6 },
  level_percent: { min: 0, max: 100, initial: 40, alpha: 0.22, maxDelta: 4 },
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
  const { logout, username, role, token } = useAuth();
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);
  const [sensorData, setSensorData] = useState(buildInitialSensors());
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [mockMode, setMockMode] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [brokerUrl] = useState(DEFAULT_BROKER_URL);
  const mqttManagerRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [devicesError, setDevicesError] = useState('');

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

    const loadDevices = async () => {
      try {
        const list = await apiFetch('/sensors/devices', token);
        const cleaned = Array.isArray(list) ? list.filter((id) => typeof id === 'string' && id.trim()) : [];
        setDevices(cleaned);
        setDevicesError('');
        if (!selectedDevice && cleaned.length > 0) {
          setSelectedDevice(cleaned[0]);
        }
      } catch (err) {
        if (err.message === 'unauthorized') {
          logout();
          return;
        }
        setDevicesError('Could not load machine list yet.');
      }
    };

    const hydrateLatestReadings = async () => {
      // Prefer live MQTT when connected; otherwise hydrate from persisted backend data.
      if (!mockMode && connectionStatus === 'Connected') {
        return;
      }
      try {
        const deviceQuery = selectedDevice ? `?device_id=${encodeURIComponent(selectedDevice)}` : '';
        const latest = await apiFetch(`/sensors/latest${deviceQuery}`, token);
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

    loadDevices();
    hydrateLatestReadings();
    const intervalId = setInterval(hydrateLatestReadings, 12_000);
    return () => clearInterval(intervalId);
  }, [token, mockMode, connectionStatus, logout, applySensorUpdate, selectedDevice]);

  const connectionLabel = useMemo(() => {
    if (connectionStatus === 'Connected') return 'Live MQTT connected';
    if (connectionStatus === 'Connecting' || connectionStatus === 'Reconnecting') return 'Connecting';
    return 'Disconnected';
  }, [connectionStatus, mockMode]);

  return (
    <>
      <Navbar
        connectionLabel={connectionLabel}
        mockMode={mockMode}
        onOpenUserMgmt={() => setUserMgmtOpen(true)}
      />

      {role === 'admin' && userMgmtOpen && (
        <UserManagementPanel onClose={() => setUserMgmtOpen(false)} />
      )}

      <div className="app-shell">
        <div className="dashboard-wrapper">
          <div className="main-content">

      <section className="dashboard-layout">
        <aside className="machine-section">
          <div className="machine-section__header">
            <div>
              <p className="section-kicker">Machines</p>
              <h2 className="machine-section__title">Select a machine</h2>
            </div>
            <p className="machine-section__meta">Updated {lastUpdated.toLocaleTimeString()}</p>
          </div>

          <div className="machine-grid" role="list">
            {devicesError && <div className="machine-empty">{devicesError}</div>}
            {!devicesError && devices.length === 0 && (
              <div className="machine-empty">No machines yet — start Node-RED simulation to populate the database.</div>
            )}
            {devices.map((id) => (
              <button
                key={id}
                type="button"
                role="listitem"
                className={`machine-card${selectedDevice === id ? ' machine-card--active' : ''}`}
                onClick={() => setSelectedDevice(id)}
              >
                <p className="machine-card__name">{id}</p>
                <p className="machine-card__hint">Latest readings + history</p>
              </button>
            ))}
          </div>
        </aside>

        <main className="sensor-section">
          <div className="sensor-section__header">
            <div>
              <p className="section-kicker">Overview</p>
              <h2 className="sensor-section__title">{selectedDevice || 'All machines'}</h2>
            </div>
          </div>
          <div className="grid-panel">
            {sensorCards.map(({ key, label, value, unit, description }) => (
              <SensorCard key={key} label={label} value={value} unit={unit} description={description} />
            ))}
          </div>
        </main>
      </section>

      <section className="charts-panel">
        <h2 className="charts-panel__heading">History (last 40 readings)</h2>
        <div className="charts-grid">
          {Object.entries(SENSOR_CONFIGS).map(([key, { label, unit }]) => (
            <HistoryChart key={key} sensorId={key} label={label} unit={unit} deviceId={selectedDevice || null} />
          ))}
        </div>
      </section>

          <footer className="footer-note">
            <p>
              Backend hydration uses persisted readings from <code>iot_monitor.sensor_readings</code>.
            </p>
          </footer>
        </div>
      </div>
    </div>
    </>
  );
}

function App() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <LoginPage />;
}

export default App;
