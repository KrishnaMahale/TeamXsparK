import { create } from 'zustand'
import { GridScenario, ScenarioId, ScenarioExecutionResponse } from '../types/scenario'
import { mockScenarios } from '../mocks/scenarioMock'
import { scenarioService } from '../services/api/scenarioService'
import { useGridStore } from './gridStore'
import { useSimulationStore } from './simulationStore'
import { useDomesticStore } from './domesticStore'

interface ScenarioState {
  scenarios: GridScenario[]
  selectedScenario: GridScenario
  isScenarioRunning: boolean
  lastExecutedScenarioId: string | null
  lastExecutionResult: ScenarioExecutionResponse | null
  error: string | null

  // Actions
  fetchScenarios: () => Promise<void>
  selectScenario: (scenario: GridScenario) => void
  runScenario: (scenarioId: ScenarioId, gridId?: string, gridType?: string) => Promise<ScenarioExecutionResponse | null>
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  scenarios: mockScenarios,
  selectedScenario: mockScenarios[1], // High Solar default
  isScenarioRunning: false,
  lastExecutedScenarioId: null,
  lastExecutionResult: null,
  error: null,

  fetchScenarios: async () => {
    try {
      const scenarios = await scenarioService.getScenarios()
      if (scenarios && scenarios.length > 0) {
        set({ scenarios })
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch scenarios' })
    }
  },

  selectScenario: (scenario: GridScenario) => {
    set({ selectedScenario: scenario })
  },

  runScenario: async (scenarioId: ScenarioId, gridId?: string, gridType?: string) => {
    const target = get().scenarios.find((s) => s.id === scenarioId) || get().selectedScenario
    const effGridId = gridId || useGridStore.getState().network.id
    const effGridType = gridType || target.gridType || useDomesticStore.getState().gridType

    set({ isScenarioRunning: true, error: null, selectedScenario: target })

    try {
      const result = await scenarioService.runScenario(target.id, effGridId, effGridType)
      const gridStore = useGridStore.getState()
      const simulationStore = useSimulationStore.getState()
      const domesticStore = useDomesticStore.getState()

      // Sync Domestic Digital Twin if domestic grid is active or requested
      if (effGridType === 'domestic' || target.gridType === 'domestic') {
        domesticStore.setGridType('domestic')
        domesticStore.setTime(target.simulatedTime)
        domesticStore.setPreset(target.id as any)
      } else {
        // Sync Industrial Digital Twin
        await gridStore.setTime(target.simulatedTime)

        if (result.powerFlowResult && result.powerFlowResult.buses) {
          gridStore.updateFromSimulationResult(
            {
              timestamp: target.simulatedTime,
              converged: true,
              iterations: 4,
              buses: result.powerFlowResult.buses,
              feeders: result.powerFlowResult.feeders || [],
              violations: result.violations || [],
              totalLossKw: result.lossesKw || 12.0,
              totalGenerationKw: target.solarKw,
              totalDemandKw: target.loadKw,
              batterySocPercent: target.batterySocPercent,
            },
            target.simulatedTime
          )
        }
      }

      if (target.id === 'EXTREME_INFEASIBLE') {
        const infeasibleAction = simulationStore.availableActions.find((a) => a.id === 'ACT-04')
        if (infeasibleAction) {
          simulationStore.selectAction(infeasibleAction)
        }
      }

      set({
        isScenarioRunning: false,
        lastExecutedScenarioId: target.id,
        lastExecutionResult: result,
      })

      return result
    } catch (err: any) {
      set({ error: err.message || 'Failed to run scenario', isScenarioRunning: false })
      return null
    }
  },
}))
