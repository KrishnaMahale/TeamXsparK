import { ForecastResponse, ForecastMetrics } from '../../types/forecast'
import { mockForecastResponse, mockForecastMetrics } from '../../mocks/forecastMock'
import { apiClient, IS_MOCK_API, simulateLatency } from './apiClient'

export const forecastService = {
  /**
   * Fetch 24-hour solar and load predictions
   */
  async getForecast(horizonHours: number = 24): Promise<ForecastResponse> {
    if (IS_MOCK_API) {
      await simulateLatency()
      return JSON.parse(JSON.stringify(mockForecastResponse))
    }
    const response = await apiClient.get<ForecastResponse>('/forecast/timeseries', {
      params: { horizon: horizonHours },
    })
    return response.data
  },

  /**
   * Fetch model metrics (Random Forest accuracy, peak projections)
   */
  async getForecastMetrics(): Promise<ForecastMetrics> {
    if (IS_MOCK_API) {
      await simulateLatency()
      return { ...mockForecastMetrics }
    }
    const response = await apiClient.get<ForecastMetrics>('/forecast/metrics')
    return response.data
  },
}
