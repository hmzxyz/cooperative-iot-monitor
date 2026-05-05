const statusLabels = {
  nominal: 'Stable',
  warning: 'Watch',
  critical: 'Act now',
  learning: 'Learning',
}

export default function AiInsightsPanel({ analytics, loading, error }) {
  if (loading && !analytics) {
    return <div className="ai-card">Loading AI recommendations...</div>
  }

  if (!analytics) {
    return <div className="ai-card">AI recommendations unavailable</div>
  }

  const riskScore = Math.round(analytics.risk_score || 0)
  const riskStatus = analytics.status || 'learning'
  const rankedSensors = [...(analytics.sensors || [])]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 4)

  return (
    <div className={`ai-card ai-card--${riskStatus}`}>
      <div className="ai-card__header">
        <div>
          <p className="section-kicker">AI model</p>
          <h3>{analytics.model_name}</h3>
        </div>
        <span className={`ai-status ai-status--${riskStatus}`}>
          {statusLabels[riskStatus] || riskStatus}
        </span>
      </div>

      <div className="ai-risk">
        <div>
          <span className="metric-label">Line risk</span>
          <strong>{riskScore}/100</strong>
        </div>
        <div className="ai-risk__meter" aria-label={`AI risk score ${riskScore} out of 100`}>
          <span style={{ width: `${Math.max(4, Math.min(100, riskScore))}%` }} />
        </div>
      </div>

      <div className="ai-action">
        <span>Next action</span>
        <p>{analytics.primary_action}</p>
      </div>

      {error && <p className="ai-note">{error}</p>}

      <div className="ai-recommendations">
        {(analytics.recommendations || []).map((recommendation) => (
          <article
            key={`${recommendation.sensor_id || 'line'}-${recommendation.title}`}
            className={`ai-recommendation ai-recommendation--${recommendation.priority}`}
          >
            <div>
              <h4>{recommendation.title}</h4>
              <p>{recommendation.message}</p>
            </div>
            <strong>{Math.round((recommendation.confidence || 0) * 100)}%</strong>
          </article>
        ))}
      </div>

      <div className="ai-sensor-list">
        {rankedSensors.map((sensor) => (
          <div key={sensor.sensor_id} className={`ai-sensor ai-sensor--${sensor.status}`}>
            <div>
              <strong>{sensor.label}</strong>
              <span>{sensor.action}</span>
            </div>
            <div className="ai-sensor__values">
              <span>{sensor.last_value ?? '--'} {sensor.unit}</span>
              <span>{Math.round(sensor.risk_score)} risk</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
