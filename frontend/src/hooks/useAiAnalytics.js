import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api.js'
import { SENSOR_CONFIGS } from '../config.js'
import { useAuth } from '../context/AuthContext'

const AI_REFRESH_MS = 15_000

const SENSOR_LIMITS = {
  temperature: { targetMin: 18, targetMax: 30, warningMin: 16, warningMax: 33, criticalMin: 12, criticalMax: 37 },
  humidity: { targetMin: 45, targetMax: 78, warningMin: 35, warningMax: 86, criticalMin: 25, criticalMax: 94 },
  weight: { targetMin: 2, targetMax: 44, warningMin: 0.5, warningMax: 48, criticalMin: 0, criticalMax: 50 },
  flow: { targetMin: 0.4, targetMax: 7, warningMin: 0.1, warningMax: 9, criticalMin: 0, criticalMax: 10 },
}

const statusFromRisk = (riskScore) => {
  if (riskScore >= 75) return 'critical'
  if (riskScore >= 45) return 'warning'
  return 'nominal'
}

const scoreCurrentValue = (sensorKey, value) => {
  const limits = SENSOR_LIMITS[sensorKey]
  if (!limits || !Number.isFinite(value)) return 0
  if (value < limits.criticalMin || value > limits.criticalMax) return 92
  if (value < limits.warningMin || value > limits.warningMax) return 72
  if (value < limits.targetMin || value > limits.targetMax) return 44
  return 12
}

const buildAction = (sensorKey, status) => {
  const label = SENSOR_CONFIGS[sensorKey]?.label?.toLowerCase() || sensorKey
  if (status === 'critical') {
    return `Inspect ${label} now and pause the affected process if the reading is confirmed.`
  }
  if (status === 'warning') {
    return `Check ${label} on the next cycle and watch for continued drift.`
  }
  return `Keep ${label} under normal observation.`
}

const buildLocalAnalytics = (sensorSnapshot, mockMode, lastUpdated) => {
  const sensors = Object.entries(SENSOR_CONFIGS).map(([sensorKey, config]) => {
    const value = Number(sensorSnapshot?.[sensorKey]?.value)
    const riskScore = scoreCurrentValue(sensorKey, value)
    const status = statusFromRisk(riskScore)
    return {
      sensor_id: sensorKey,
      label: config.label,
      unit: config.unit,
      status,
      risk_score: riskScore,
      confidence: mockMode ? 0.58 : 0.68,
      last_value: Number.isFinite(value) ? value : null,
      rolling_mean: null,
      volatility: null,
      trend: null,
      forecast_next: null,
      sample_count: 1,
      action: buildAction(sensorKey, status),
    }
  })

  const rankedSensors = [...sensors].sort((a, b) => b.risk_score - a.risk_score)
  const topSensor = rankedSensors[0]
  const recommendations = topSensor && topSensor.status !== 'nominal'
    ? [{
        priority: topSensor.status,
        title: `${topSensor.label} needs attention`,
        message: `Realtime score ${topSensor.risk_score}/100 from the latest dashboard value.`,
        action: topSensor.action,
        sensor_id: topSensor.sensor_id,
        confidence: topSensor.confidence,
      }]
    : [{
        priority: 'nominal',
        title: 'Current readings look stable',
        message: 'The edge model does not see an immediate threshold risk.',
        action: 'Continue normal monitoring while the backend model learns from stored history.',
        sensor_id: topSensor?.sensor_id || null,
        confidence: topSensor?.confidence || 0.58,
      }]

  return {
    model_name: 'RealtimeEdgeSafetyModel v1',
    generated_at: lastUpdated?.toISOString?.() || new Date().toISOString(),
    status: topSensor ? statusFromRisk(topSensor.risk_score) : 'learning',
    risk_score: topSensor?.risk_score || 0,
    primary_action: recommendations[0].action,
    data_quality: mockMode ? 'simulated_snapshot' : 'live_snapshot',
    recommendations,
    sensors,
  }
}

export function useAiAnalytics(sensorSnapshot, mockMode, lastUpdated) {
  const { logout, token } = useAuth()
  const [backendAnalytics, setBackendAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const localAnalytics = useMemo(
    () => buildLocalAnalytics(sensorSnapshot, mockMode, lastUpdated),
    [sensorSnapshot, mockMode, lastUpdated]
  )

  const fetchAnalytics = useCallback(async () => {
    if (!token) return

    setLoading(true)
    try {
      const data = await apiFetch('/predict/analytics', token)
      setBackendAnalytics(data)
      setError('')
    } catch (err) {
      if (err.message === 'unauthorized') {
        logout()
        return
      }
      setError('Using realtime dashboard values until backend analytics are available.')
    } finally {
      setLoading(false)
    }
  }, [logout, token])

  useEffect(() => {
    fetchAnalytics()
    const intervalId = setInterval(() => {
      fetchAnalytics()
    }, AI_REFRESH_MS)
    return () => clearInterval(intervalId)
  }, [fetchAnalytics])

  const analytics = backendAnalytics?.status === 'learning' ? localAnalytics : (backendAnalytics || localAnalytics)

  return {
    analytics,
    loading: loading && !backendAnalytics,
    error,
    refresh: fetchAnalytics,
  }
}
