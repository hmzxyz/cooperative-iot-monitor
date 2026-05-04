import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { apiFetch } from './api.js'
import { SENSOR_CONFIGS } from './config.js'

export default function usePrediction() {
  const [predictions, setPredictions] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { token } = useAuth()

  const fetchPredictions = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError('')
    const sensorTypes = Object.keys(SENSOR_CONFIGS)

    try {
      const results = await Promise.all(
        sensorTypes.map(async (sensorId) => {
          try {
            const data = await apiFetch('/predict/failure', token, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sensor_id: sensorId,
                hours: 24,
              }),
            })
            return { sensorId, prediction: data }
          } catch (error) {
            return { sensorId, error }
          }
        })
      )

      const newPredictions = {}
      const failedSensors = []
      results.forEach(({ sensorId, prediction, error }) => {
        if (prediction) {
          newPredictions[sensorId] = prediction
        } else if (error) {
          failedSensors.push(sensorId)
        }
      })
      setPredictions(newPredictions)
      if (failedSensors.length > 0 && Object.keys(newPredictions).length === 0) {
        setError(`Predictions unavailable for ${failedSensors.join(', ')}`)
      }
    } catch (err) {
      setError(err.message || 'Error loading predictions')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return

    fetchPredictions()
    const interval = setInterval(fetchPredictions, 30000)

    return () => clearInterval(interval)
  }, [fetchPredictions, token])

  return { predictions, loading, error, fetchPredictions }
}
