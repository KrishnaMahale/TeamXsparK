import { useState, useEffect, useCallback } from 'react'
import { ForecastResponse, ForecastMetrics, ForecastDataPoint } from '../types/forecast'
import { forecastService } from '../services/api/forecastService'
import { mockForecastResponse } from '../mocks/forecastMock'

export const useForecast = (horizonHours: number = 24) => {
  const [forecast, setForecast] = useState<ForecastResponse>(mockForecastResponse)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const loadForecast = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await forecastService.getForecast(horizonHours)
      setForecast(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load forecast data')
    } finally {
      setIsLoading(false)
    }
  }, [horizonHours])

  useEffect(() => {
    loadForecast()
  }, [loadForecast])

  return {
    forecast,
    dataPoints: forecast.dataPoints,
    metrics: forecast.metrics,
    isLoading,
    error,
    refresh: loadForecast,
  }
}
