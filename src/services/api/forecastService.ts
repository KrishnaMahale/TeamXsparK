import { ForecastResponse, ForecastMetrics } from '../../types/forecast'
import { mockForecastResponse, mockForecastMetrics } from '../../mocks/forecastMock'
import { apiClient, IS_MOCK_API, simulateLatency } from './apiClient'

export const forecastService = {
  /**
   * Fetch 24-hour solar and load predictions for a given grid and date
   */
  async getForecast(
    horizonHours: number = 24,
    gridId?: string,
    targetDate?: string
  ): Promise<ForecastResponse> {
    if (IS_MOCK_API) {
      await simulateLatency()
      return JSON.parse(JSON.stringify(mockForecastResponse))
    }
    const params: Record<string, any> = { horizon: horizonHours }
    if (gridId) params.grid_id = gridId
    if (targetDate) params.target_date = targetDate

    const response = await apiClient.get<ForecastResponse>('/forecast/timeseries', {
      params,
    })
    return response.data
  },

  /**
   * Fetch model metrics
   */
  async getForecastMetrics(gridId?: string, targetDate?: string): Promise<ForecastMetrics> {
    if (IS_MOCK_API) {
      await simulateLatency()
      return { ...mockForecastMetrics }
    }
    const params: Record<string, any> = {}
    if (gridId) params.grid_id = gridId
    if (targetDate) params.target_date = targetDate

    const response = await apiClient.get<ForecastMetrics>('/forecast/metrics', {
      params,
    })
    return response.data
  },
}
