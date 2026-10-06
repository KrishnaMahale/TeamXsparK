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
   * Run a specific grid stress scenario targeting industrial or domestic grids
   */
  async runScenario(
    scenarioId: ScenarioId,
    gridId?: string,
    gridType?: string
  ): Promise<ScenarioExecutionResponse> {
    if (IS_MOCK_API) {
      await simulateLatency(400)
      const scenario = mockScenarios.find((s) => s.id === scenarioId) || mockScenarios[0]
      const isInfeasible = scenario.id === 'EXTREME_INFEASIBLE'
      const effType = gridType || scenario.gridType || 'industrial'

      return {
        scenario,
        executedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        initialViolations: scenario.violationsExpected,
        resolvedViolations: isInfeasible ? 0 : scenario.violationsExpected,
        recommendedAction: scenario.recommendedActionHint,
        isFeasible: !isInfeasible,
        gridType: effType,
        voltageMaxPu: scenario.peakVoltagePu || 1.05,
        feederLoadingMaxPct: scenario.maxFeederLoadingPct || 80.0,
        vufPercent: scenario.vufPercent || 0.8,
      }
    }
    const params: Record<string, string> = {}
    if (gridId) params.grid_id = gridId
    if (gridType) params.grid_type = gridType

    const response = await apiClient.post<ScenarioExecutionResponse>(
      `/scenarios/${scenarioId}/run`,
      null,
      { params }
    )
    return response.data
  },
}
