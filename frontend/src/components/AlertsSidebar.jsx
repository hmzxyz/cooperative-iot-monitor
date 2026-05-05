import { useAiAnalytics } from '../hooks/useAiAnalytics.js'
import AiInsightsPanel from './AiInsightsPanel'

export default function AlertsSidebar({ connectionStatus, mockMode, lastUpdated, sensorData }) {
  const { analytics, loading, error } = useAiAnalytics(sensorData, mockMode, lastUpdated)
  const riskScore = Math.round(analytics?.risk_score || 0)
  const priorityLabel = analytics?.status === 'critical'
    ? 'Act now'
    : analytics?.status === 'warning'
      ? 'Watch'
      : analytics?.status === 'learning'
        ? 'Learning'
        : 'Stable'
  const dataMode = analytics?.data_quality?.replaceAll('_', ' ') || (mockMode ? 'simulated' : 'live')

  const panelTone = connectionStatus === 'Connected' && !mockMode ? 'live' : 'fallback'

  return (
    <aside className={`alerts-sidebar alerts-sidebar--${panelTone}`}>
      <div className="sidebar-header">
        <div>
          <p className="section-kicker">AI assistant</p>
          <h2>Technician Brief</h2>
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
            <span className="metric-label">Risk score</span>
            <strong>{riskScore}/100</strong>
          </div>
          <div>
            <span className="metric-label">Priority</span>
            <strong>{priorityLabel}</strong>
          </div>
          <div>
            <span className="metric-label">Data mode</span>
            <strong>{dataMode}</strong>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <AiInsightsPanel analytics={analytics} loading={loading} error={error} />
      </div>

    </aside>
  )
}
