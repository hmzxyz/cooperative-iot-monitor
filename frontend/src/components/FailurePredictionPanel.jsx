/**
 * Failure Prediction Panel Component
 * Displays AI prediction status for a specific sensor
 */
export default function FailurePredictionPanel({ sensorType, prediction }) {
  if (!prediction) {
    return (
      <div className="prediction-panel">
        <h4>{getSensorLabel(sensorType)}</h4>
        <div className="prediction-status nominal">
          <span className="status-indicator">●</span>
          <span className="status-text">Nominal</span>
          <span className="confidence">--</span>
        </div>
      </div>
    )
  }

  const status = prediction.predicted_status || 'nominal'
  const confidence = prediction.confidence || 0
  const severityClass = `severity-${status}`
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1)
  const trend = prediction.features?.trend ?? null

  return (
    <div className={`prediction-panel ${severityClass}`}>
      <div className="prediction-panel__header">
        <h4>{getSensorLabel(sensorType)}</h4>
        <span className={`prediction-pill ${status}`}>{statusLabel}</span>
      </div>
      <div className={`prediction-status ${status}`}>
        <span className="status-indicator">●</span>
        <span className="status-text">{(confidence * 100).toFixed(0)}% confidence</span>
      </div>
      {prediction.features && (
        <div className="prediction-features">
          <div className="feature-item">
            <span className="feature-label">Mean:</span>
            <span className="feature-value">{prediction.features.rolling_mean?.toFixed(1) || '--'}</span>
          </div>
          <div className="feature-item">
            <span className="feature-label">Std:</span>
            <span className="feature-value">{prediction.features.rolling_std?.toFixed(1) || '--'}</span>
          </div>
          <div className="feature-item">
            <span className="feature-label">Trend:</span>
            <span className="feature-value">{trend !== null ? trend.toFixed(2) : '--'}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function getSensorLabel(sensorType) {
  const labels = {
    'temperature': '🌡️ Temperature',
    'humidity': '💧 Humidity',
    'weight': '⚖️ Weight',
    'flow': '🔄 Flow Rate'
  }
  return labels[sensorType] || sensorType
}
