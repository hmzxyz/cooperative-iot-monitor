import { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiLogOut } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';

import { getCurrentUser, getSensorReadings } from '../services/api';
import { connectMqtt, disconnectMqtt } from '../services/mqtt';
import { useAuth } from '../hooks/useAuth';
import { GaugeCard } from '../components/GaugeCard';

// Threshold values are used for visual status in the dashboard.
const threshold = {
  temperature: { warning: 40, critical: 50 },
  pressure: { warning: 3.0, critical: 4.0 },
  milk_weight: { warning: 30, critical: 45 },
};

export default function Dashboard() {
  const { token, logout } = useAuth();
  const [alerts, setAlerts] = useState<string[]>([]);
  const [liveReading, setLiveReading] = useState<any>(null);

  // Load the current user profile if a token exists.
  const userQuery = useQuery(['current-user'], () => getCurrentUser(token), {
    enabled: !!token,
  });

  // Load recent sensor readings for history.
  const readingsQuery = useQuery(['sensor-readings'], () => getSensorReadings(token), {
    enabled: !!token,
  });

  useEffect(() => {
    const client = connectMqtt((message) => {
      setLiveReading(message);
      if (message.alert) {
        setAlerts((current) => [
          `${new Date().toLocaleTimeString()} — ${message.alert}`,
          ...current,
        ].slice(0, 10));
      }
    });

    return () => disconnectMqtt(client);
  }, []);

  const chartData = useMemo(() => readingsQuery.data ?? [], [readingsQuery.data]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/95 px-6 py-5 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">IoT Dashboard</h1>
            <p className="text-slate-400">Live sensor feed, thresholds, and alerts.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-slate-300">
              {userQuery.data ? userQuery.data.email : 'Guest'}
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-rose-400"
            >
              <FiLogOut /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <GaugeCard
                label="Temperature"
                value={liveReading?.temperature ?? 0}
                unit="°C"
                thresholds={threshold.temperature}
              />
              <GaugeCard
                label="Pressure"
                value={liveReading?.pressure ?? 0}
                unit="bar"
                thresholds={threshold.pressure}
              />
              <GaugeCard
                label="Milk weight"
                value={liveReading?.milk_weight ?? 0}
                unit="kg"
                thresholds={threshold.milk_weight}
              />
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6">
              <h2 className="text-xl font-semibold text-white">Latest readings</h2>
              <div className="mt-4 space-y-3">
                {chartData.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-slate-400">
                    Waiting for sensor data...
                  </div>
                ) : (
                  chartData.slice(0, 8).map((reading: any) => (
                    <div key={reading.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
                      <span>{new Date(reading.received_at).toLocaleTimeString()}</span>
                      <span>{reading.temperature.toFixed(1)}°C</span>
                      <span>{reading.pressure.toFixed(2)} bar</span>
                      <span>{reading.milk_weight.toFixed(1)} kg</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Active alert log</h2>
                  <p className="text-sm text-slate-500">Most recent MQTT alerts</p>
                </div>
                <FiAlertTriangle className="h-6 w-6 text-amber-400" />
              </div>

              <div className="mt-4 space-y-3">
                {alerts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-5 text-slate-500">
                    No active alerts
                  </div>
                ) : (
                  alerts.map((alert, index) => (
                    <div key={index} className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100">
                      {alert}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
