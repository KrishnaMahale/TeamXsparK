import {
  DomesticGridNetwork,
  DomesticPreset,
  DomesticControlAction,
  HouseNode,
} from '../../types/domestic'
import {
  calculateDomesticPowerFlow,
  generateDomestic24hProfile,
} from '../../mocks/domesticMock'
import { apiClient, IS_MOCK_API, simulateLatency } from './apiClient'

export const domesticService = {
  /**
   * Fetch current domestic rooftop solar network state
   */
  async getNetwork(
    time: string = '12:30',
    preset: DomesticPreset = 'SUNNY_NOON_EXPORT',
    action: DomesticControlAction = 'NONE'
  ): Promise<DomesticGridNetwork> {
    if (IS_MOCK_API) {
      await simulateLatency(150)
      return calculateDomesticPowerFlow(time, preset, action)
    }
    try {
      const response = await apiClient.get<DomesticGridNetwork>('/domestic/network', {
        params: { time, preset, action },
      })
      return response.data
    } catch {
      // Graceful fallback to client engine
      return calculateDomesticPowerFlow(time, preset, action)
    }
  },

  /**
   * Run simulation with specific scenario preset and smart inverter control
   */
  async simulate(
    time: string,
    preset: DomesticPreset,
    controlAction: DomesticControlAction
  ): Promise<DomesticGridNetwork> {
    if (IS_MOCK_API) {
      await simulateLatency(250)
      return calculateDomesticPowerFlow(time, preset, controlAction)
    }
    try {
      const response = await apiClient.post<DomesticGridNetwork>('/domestic/simulate', {
        time,
        preset,
        controlAction,
      })
      return response.data
    } catch {
      return calculateDomesticPowerFlow(time, preset, controlAction)
    }
  },

  /**
   * Fetch specific house telemetry
   */
  async getHouseTelemetry(houseId: string, time: string = '12:30'): Promise<HouseNode | undefined> {
    if (IS_MOCK_API) {
      await simulateLatency(100)
      const net = calculateDomesticPowerFlow(time)
      return net.houses.find((h) => h.id === houseId)
    }
    try {
      const response = await apiClient.get<HouseNode>(`/domestic/houses/${houseId}`, {
        params: { time },
      })
      return response.data
    } catch {
      const net = calculateDomesticPowerFlow(time)
      return net.houses.find((h) => h.id === houseId)
    }
  },
}
