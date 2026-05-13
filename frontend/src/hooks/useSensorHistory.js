import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import { useAuth } from '../context/AuthContext';

const POLL_INTERVAL_MS = 10_000;

export function useSensorHistory(sensorId, token, deviceId, limit = 40) {
  const { logout } = useAuth();
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState(null);

  const poll = useCallback(async () => {
    try {
      const deviceQuery = deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : '';
      const data = await apiFetch(`/sensors/?sensor_id=${sensorId}&limit=${limit}${deviceQuery}`, token);
      // API returns newest-first; chart needs oldest-first
      setReadings(
        data.reverse().map((r) => ({
          time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          value: r.payload.value,
        }))
      );
      setError(null);
    } catch (err) {
      if (err.message === 'unauthorized') logout();
      setError(err.message);
    }
  }, [sensorId, token, deviceId, limit, logout]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [poll]);

  return { readings, error };
}
