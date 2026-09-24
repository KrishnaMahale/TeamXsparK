import { useScenarioStore } from '../store/scenarioStore'
import { ScenarioId, GridScenario } from '../types/scenario'

export const useScenarios = () => {
  const {
    scenarios,
    selectedScenario,
    isScenarioRunning,
    lastExecutedScenarioId,
    error,
    selectScenario,
    runScenario,
    fetchScenarios,
  } = useScenarioStore()

  return {
    scenarios,
    selectedScenario,
    isScenarioRunning,
    lastExecutedScenarioId,
    error,
    selectScenario,
    runScenario,
    refresh: fetchScenarios,
  }
}
