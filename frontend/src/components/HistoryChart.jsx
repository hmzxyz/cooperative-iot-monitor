import { useMemo } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { useSensorHistory } from '../hooks/useSensorHistory.js';

const LINE_COLOR = '#3b82f6';
const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const PADDING = 14;

function toChartPoints(readings) {
  if (readings.length === 0) return '';

  const values = readings.map((r) => Number(r.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const drawableWidth = CHART_WIDTH - PADDING * 2;
  const drawableHeight = CHART_HEIGHT - PADDING * 2;
  const stepX = readings.length > 1 ? drawableWidth / (readings.length - 1) : 0;

  return readings
    .map((r, index) => {
      const x = PADDING + index * stepX;
      const y = PADDING + (1 - (Number(r.value) - min) / range) * drawableHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export default function HistoryChart({ sensorId, label, unit }) {
  const { token } = useAuth();
  const { readings, error } = useSensorHistory(sensorId, token);
  const points = useMemo(() => toChartPoints(readings), [readings]);
  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

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
        <div className="history-chart__canvas">
          <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none">
            <line
              x1={PADDING}
              y1={CHART_HEIGHT - PADDING}
              x2={CHART_WIDTH - PADDING}
              y2={CHART_HEIGHT - PADDING}
              className="history-chart__axis"
            />
            <polyline points={points} fill="none" stroke={LINE_COLOR} strokeWidth="2.5" />
          </svg>
          {latest && (
            <p className="history-chart__latest">
              {latest.value} {unit} at {latest.time}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
