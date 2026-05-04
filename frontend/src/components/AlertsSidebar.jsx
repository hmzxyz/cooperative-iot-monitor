import usePrediction from '../usePrediction'
import ReportCard from './ReportCard'
import FailurePredictionPanel from './FailurePredictionPanel'
import SprintTrackingBoard from './SprintTrackingBoard'

/**
 * Alerts Sidebar Component
 * Provides AI-powered failure predictions and system report
 */
export default function AlertsSidebar({ connectionStatus, mockMode, lastUpdated }) {
  const { predictions, loading, error } = usePrediction()
  const sensorTypes = ['temperature', 'humidity', 'weight', 'flow']
  const activePredictions = Object.values(predictions)
  const warningCount = activePredictions.filter((prediction) => {
    const status = prediction?.predicted_status || 'nominal'
    return status === 'warning' || status === 'critical'
  }).length

  const panelTone = connectionStatus === 'Connected' && !mockMode ? 'live' : 'fallback'

  return (
    <aside className={`alerts-sidebar alerts-sidebar--${panelTone}`}>
      <div className="sidebar-header">
        <div>
          <p className="section-kicker">AI operations</p>
          <h2>Decision Panel</h2>
        </div>
        <div className={`connection-badge ${connectionStatus?.toLowerCase?.() || 'disconnected'}`}>
          {connectionStatus === 'Connected'
            ? mockMode
              ? 'Fallback mode'
              : 'Live MQTT'
            : connectionStatus === 'Connecting' || connectionStatus === 'Reconnecting'
              ? 'Connecting'
              : 'Offline'}
        </div>
      </div>

      <div className="sidebar-section sidebar-section--compact">
        <div className="sidebar-metrics">
          <div>
            <span className="metric-label">Model state</span>
            <strong>{mockMode ? 'Simulated' : 'Live'}</strong>
          </div>
          <div>
            <span className="metric-label">Flagged sensors</span>
            <strong>{warningCount}</strong>
          </div>
          <div>
            <span className="metric-label">Last update</span>
            <strong>{lastUpdated ? lastUpdated.toLocaleTimeString() : '--'}</strong>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>System Report</h3>
        <ReportCard />
      </div>

      <div className="sidebar-section">
        <div className="section-heading-row">
          <h3>System Alerts</h3>
          <span className="section-subtle">{error ? 'Partial data' : `${sensorTypes.length} sensors tracked`}</span>
        </div>
        <div className="alerts-list">
          {loading ? (
            <p className="loading-predictions">Refreshing predictions...</p>
          ) : error && activePredictions.length === 0 ? (
            <p className="no-alerts">{error}</p>
          ) : (
            sensorTypes.map((sensorType) => {
              const prediction = predictions[sensorType]
              const status = prediction?.predicted_status || 'nominal'
              const message = status === 'critical'
                ? 'Immediate attention recommended'
                : status === 'warning'
                  ? 'Monitor trend drift'
                  : 'Within expected range'

              return (
                <div key={sensorType} className={`alert-item severity-${status}`}>
                  <strong>{sensorType}:</strong> {message}
                  <span className="alert-time">
                    {prediction ? `${(prediction.confidence * 100).toFixed(0)}% confidence` : 'Waiting for model output'}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="sidebar-section">
        <h3>AI Failure Predictions</h3>
        {loading ? (
          <p className="loading-predictions">Loading predictions...</p>
        ) : (
          <div className="predictions-container">
            {sensorTypes.map((sensorType) => {
              const prediction = predictions[sensorType]
              return (
                <FailurePredictionPanel
                  key={sensorType}
                  sensorType={sensorType}
                  prediction={prediction}
                />
              )
            })}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <h3>Sprint Health</h3>
        <SprintTrackingBoard />
      </div>
    </aside>
  )
}
