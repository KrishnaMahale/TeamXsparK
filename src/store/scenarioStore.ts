import { create } from 'zustand'
import { GridScenario, ScenarioId } from '../types/scenario'
import { mockScenarios } from '../mocks/scenarioMock'
import { scenarioService } from '../services/api/scenarioService'
import { useGridStore } from './gridStore'
import { useSimulationStore } from './simulationStore'

interface ScenarioState {
  scenarios: GridScenario[]
  selectedScenario: GridScenario
  isScenarioRunning: boolean
  lastExecutedScenarioId: string | null
  error: string | null

  // Actions
  fetchScenarios: () => Promise<void>
  selectScenario: (scenario: GridScenario) => void
  runScenario: (scenarioId: ScenarioId) => Promise<void>
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  scenarios: mockScenarios,
  selectedScenario: mockScenarios[1], // High Solar default
  isScenarioRunning: false,
  lastExecutedScenarioId: null,
  error: null,

  fetchScenarios: async () => {
    try {
      const scenarios = await scenarioService.getScenarios()
      set({ scenarios })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch scenarios' })
    }
  },

  selectScenario: (scenario: GridScenario) => {
    set({ selectedScenario: scenario })
  },

  runScenario: async (scenarioId: ScenarioId) => {
    const target = get().scenarios.find((s) => s.id === scenarioId) || get().selectedScenario
    set({ isScenarioRunning: true, error: null, selectedScenario: target })

    try {
      await scenarioService.runScenario(target.id)
      const gridStore = useGridStore.getState()
      const simulationStore = useSimulationStore.getState()

      if (target.id === 'NORMAL_DAY') {
        await gridStore.setTime('10:00')
      } else if (target.id === 'HIGH_SOLAR') {
        await gridStore.setTime('13:15')
      } else if (target.id === 'EVENING_PEAK') {
        await gridStore.setTime('19:30')
      } else if (target.id === 'HIGH_SOLAR_LOW_LOAD') {
        await gridStore.setTime('12:30')
      } else if (target.id === 'EXTREME_INFEASIBLE') {
        await gridStore.setTime('14:00')
        // Automatically set selected action to the infeasible one to highlight the failure!
        const infeasibleAction = simulationStore.availableActions.find((a) => a.id === 'ACT-04')
        if (infeasibleAction) {
          simulationStore.selectAction(infeasibleAction)
        }
      }

      set({ isScenarioRunning: false, lastExecutedScenarioId: target.id })
    } catch (err: any) {
      set({ error: err.message || 'Failed to run scenario', isScenarioRunning: false })
    }
  },
}))
