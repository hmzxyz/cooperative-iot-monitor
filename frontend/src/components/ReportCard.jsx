import { useEffect, useState } from 'react'
import { apiFetch } from '../api.js'
import { useAuth } from '../context/AuthContext'

/**
 * Report Card Component
 * Displays system statistics and overall status
 */
export default function ReportCard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return

    async function fetchSummary() {
      setLoading(true)
      try {
        const data = await apiFetch('/predict/summary', token)
        setSummary(data)
        setLastUpdated(new Date())
      } catch (error) {
        console.error('Error fetching summary:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [token])

  if (loading) return <div className="report-card">Loading system status...</div>
  if (!summary) return <div className="report-card">No data available</div>

  const healthTone = (() => {
    if (summary.alerts_count > 0) return 'warning'
    if (summary.uptime_percentage >= 99) return 'good'
    return 'neutral'
  })()

  return (
    <div className={`report-card report-card--${healthTone}`}>
      <div className="report-card__header">
        <div>
          <p className="section-kicker">Operational snapshot</p>
          <h2>System Report</h2>
        </div>
        <div className="report-chip">
          {healthTone === 'warning' ? 'Attention needed' : healthTone === 'good' ? 'Healthy' : 'Monitoring'}
        </div>
      </div>
      <div className="report-grid">
        <div className="report-item">
          <h3>Total Devices</h3>
          <p className="report-value">{summary.total_devices}</p>
        </div>
        <div className="report-item">
          <h3>Total Readings</h3>
          <p className="report-value">{summary.total_readings}</p>
        </div>
        <div className="report-item">
          <h3>Active Alerts</h3>
          <p className="report-value alert">{summary.alerts_count}</p>
        </div>
        <div className="report-item">
          <h3>System Uptime</h3>
          <p className="report-value">{summary.uptime_percentage.toFixed(1)}%</p>
        </div>
      </div>
      <div className="report-meter">
        <div className="report-meter__bar">
          <div
            className="report-meter__fill"
            style={{ width: `${Math.max(0, Math.min(100, summary.uptime_percentage))}%` }}
          />
        </div>
        <div className="report-meta-row">
          <span>Alerts: {summary.alerts_count}</span>
          <span>Readings: {summary.total_readings}</span>
        </div>
      </div>
      <div className="report-timestamp">
        Last synced: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'just now'}
      </div>
    </div>
  )
}
