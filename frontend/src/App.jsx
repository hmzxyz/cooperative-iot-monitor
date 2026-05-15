import { useCallback, useEffect, useMemo, useState } from 'react';
import SensorCard from './components/SensorCard.jsx';
import HistoryChart from './components/HistoryChart.jsx';
import Navbar from './components/Navbar.jsx';
import UserManagementPanel from './components/UserManagementPanel.jsx';
import { SENSOR_CONFIGS, SENSOR_KEYS } from './config.js';
import { apiFetch } from './api.js';
import { useAuth } from './context/AuthContext';
import { useLiveReadings } from './hooks/useLiveReadings.js';
import LoginPage from './pages/LoginPage.jsx';

const RECONCILE_INTERVAL_MS = 60_000;

const connectionLabelFor = (state) => {
  if (state === 'live') return 'Backend live';
  if (state === 'connecting') return 'Connecting to backend';
  if (state === 'error') return 'Backend live error';
  return 'Backend disconnected';
};

const formatSensorValue = (value) => {
  if (!Number.isFinite(value)) {
    return '--';
  }
  return Number(value.toFixed(1));
};

function Dashboard() {
  const { logout, role, token } = useAuth();
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);
  const [sensorData, setSensorData] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [devicesError, setDevicesError] = useState('');

  const mergeDevices = useCallback((ids) => {
    const cleaned = ids.filter((id) => typeof id === 'string' && id.trim());
    if (cleaned.length === 0) {
      return;
    }
    setDevices((prev) => {
      const merged = new Set(prev);
      cleaned.forEach((id) => merged.add(id));
      return Array.from(merged).sort();
    });
  }, []);

  const applySensorSnapshot = useCallback((sensors, timestamp) => {
    if (!sensors || typeof sensors !== 'object') {
      return;
    }

    const nextValues = {};
    SENSOR_KEYS.forEach((sensorKey) => {
      const value = Number(sensors[sensorKey]);
      if (Number.isFinite(value)) {
        nextValues[sensorKey] = {
          value,
          unit: SENSOR_CONFIGS[sensorKey]?.unit ?? '',
        };
      }
    });

    if (Object.keys(nextValues).length === 0) {
      return;
    }

    setSensorData((prev) => {
      return { ...prev, ...nextValues };
    });

    const parsed = timestamp ? new Date(timestamp) : new Date();
    setLastUpdated(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
  }, []);

  const handleLiveReadings = useCallback((readings) => {
    const acceptedReadings = readings.filter(
      (reading) => reading?.device_id && reading?.sensors && typeof reading.sensors === 'object'
    );

    if (acceptedReadings.length === 0) {
      return;
    }

    mergeDevices(acceptedReadings.map((reading) => reading.device_id));
    setDevicesError('');

    const activeDevice = selectedDevice || acceptedReadings[0].device_id;
    if (!selectedDevice) {
      setSelectedDevice(activeDevice);
    }

    const latestForActiveDevice = [...acceptedReadings]
      .reverse()
      .find((reading) => reading.device_id === activeDevice);

    if (latestForActiveDevice) {
      applySensorSnapshot(latestForActiveDevice.sensors, latestForActiveDevice.timestamp);
    }
  }, [applySensorSnapshot, mergeDevices, selectedDevice]);

  const { connectionState } = useLiveReadings({
    token,
    onReadings: handleLiveReadings,
  });

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
        setSelectedDevice((current) => current || cleaned[0] || '');
      } catch (err) {
        if (err.message === 'unauthorized') {
          logout();
          return;
        }
        setDevicesError('Could not load machine list yet.');
      }
    };

    loadDevices();
  }, [token, logout]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let cancelled = false;

    const hydrateLatestReadings = async () => {
      try {
        const deviceQuery = selectedDevice ? `?device_id=${encodeURIComponent(selectedDevice)}` : '';
        const latest = await apiFetch(`/sensors/latest${deviceQuery}`, token);
        if (cancelled) {
          return;
        }
        const sensors = SENSOR_KEYS.reduce((acc, sensorKey) => {
          const value = Number(latest?.[sensorKey]?.payload?.value);
          if (Number.isFinite(value)) {
            acc[sensorKey] = value;
          }
          return acc;
        }, {});
        applySensorSnapshot(sensors, Object.values(latest || {})[0]?.timestamp);
      } catch (err) {
        if (err.message === 'unauthorized') {
          logout();
        }
      }
    };

    hydrateLatestReadings();
    const intervalId = setInterval(hydrateLatestReadings, RECONCILE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [token, selectedDevice, logout, applySensorSnapshot]);

  const sensorCards = useMemo(
    () =>
      SENSOR_KEYS.map((sensorKey) => ({
        key: sensorKey,
        label: SENSOR_CONFIGS[sensorKey].label,
        unit: SENSOR_CONFIGS[sensorKey].unit,
        value: formatSensorValue(sensorData[sensorKey]?.value),
      })),
    [sensorData]
  );

  const connectionLabel = useMemo(() => connectionLabelFor(connectionState), [connectionState]);
  const lastUpdatedLabel = lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting for backend data';

  return (
    <>
      <Navbar
        connectionLabel={connectionLabel}
        connectionState={connectionState}
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
                  <p className="machine-section__meta">{lastUpdatedLabel}</p>
                </div>

                <div className="machine-grid" role="list">
                  {devicesError && <div className="machine-empty">{devicesError}</div>}
                  {!devicesError && devices.length === 0 && (
                    <div className="machine-empty">Waiting for backend data from Node-RED telemetry.</div>
                  )}
                  {devices.map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="listitem"
                      className={`machine-card${selectedDevice === id ? ' machine-card--active' : ''}`}
                      onClick={() => {
                        setSensorData({});
                        setLastUpdated(null);
                        setSelectedDevice(id);
                      }}
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
                  {sensorCards.map(({ key, label, value, unit }) => (
                    <SensorCard key={key} label={label} value={value} unit={unit} />
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
                Current values use FastAPI REST hydration and backend WebSocket updates from persisted telemetry.
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
