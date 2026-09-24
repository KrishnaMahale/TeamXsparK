import { GridScenario, ScenarioExecutionResponse, ScenarioId } from '../../types/scenario'
import { mockScenarios } from '../../mocks/scenarioMock'
import { apiClient, IS_MOCK_API, simulateLatency } from './apiClient'

export const scenarioService = {
  /**
   * Get list of standard test scenarios
   */
  async getScenarios(): Promise<GridScenario[]> {
    if (IS_MOCK_API) {
      await simulateLatency()
      return JSON.parse(JSON.stringify(mockScenarios))
    }
    const response = await apiClient.get<GridScenario[]>('/scenarios')
    return response.data
  },

  /**
   * Run a specific grid stress scenario
   */
  async runScenario(scenarioId: ScenarioId): Promise<ScenarioExecutionResponse> {
    if (IS_MOCK_API) {
      await simulateLatency(500)
      const scenario = mockScenarios.find((s) => s.id === scenarioId) || mockScenarios[0]
      return {
        scenario,
        executedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        initialViolations: scenario.violationsExpected,
        resolvedViolations: scenario.id === 'EXTREME_INFEASIBLE' ? 0 : scenario.violationsExpected,
        recommendedAction: scenario.recommendedActionHint,
        isFeasible: scenario.id !== 'EXTREME_INFEASIBLE',
      }
    }
    const response = await apiClient.post<ScenarioExecutionResponse>(`/scenarios/${scenarioId}/run`)
    return response.data
  },
}
