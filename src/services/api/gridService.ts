import { GridNetwork, Bus, Feeder, SolarUnit, Battery, Load } from '../../types/network'
import { mockNetwork } from '../../mocks/networkMock'
import { apiClient, IS_MOCK_API, simulateLatency } from './apiClient'

export const gridService = {
  /**
   * Fetch current distribution grid state including buses, feeders, and assets
   */
  async getNetwork(): Promise<GridNetwork> {
    if (IS_MOCK_API) {
      await simulateLatency()
      return JSON.parse(JSON.stringify(mockNetwork))
    }
    const response = await apiClient.get<GridNetwork>('/grid/network')
    return response.data
  },

  /**
   * Fetch specific Bus details by ID
   */
  async getBusDetails(id: string): Promise<Bus | undefined> {
    if (IS_MOCK_API) {
      await simulateLatency()
      return mockNetwork.buses.find((b) => b.id === id)
    }
    const response = await apiClient.get<Bus>(`/grid/buses/${id}`)
    return response.data
  },

  /**
   * Fetch specific Feeder details by ID
   */
  async getFeederDetails(id: string): Promise<Feeder | undefined> {
    if (IS_MOCK_API) {
      await simulateLatency()
      return mockNetwork.feeders.find((f) => f.id === id)
    }
    const response = await apiClient.get<Feeder>(`/grid/feeders/${id}`)
    return response.data
  },
}
