import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../AuthContext.jsx';
import { useSensorHistory } from '../hooks/useSensorHistory.js';

const LINE_COLOR = '#3b82f6';

export default function HistoryChart({ sensorId, label, unit }) {
  const { token } = useAuth();
  const { readings, error } = useSensorHistory(sensorId, token);

  return (
    <div className="history-chart">
      <p className="history-chart__title">
        {label} <span className="history-chart__unit">{unit}</span>
      </p>

      {error && <p className="history-chart__error">Could not load history</p>}

      {readings.length === 0 && !error && (
        <p className="history-chart__empty">Waiting for data…</p>
      )}

      {readings.length > 0 && (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={readings} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(148,163,184,0.15)',
                borderRadius: 8,
                fontSize: 12,
              }}
              itemStyle={{ color: '#e2e8f0' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(v) => [`${v} ${unit}`, label]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
