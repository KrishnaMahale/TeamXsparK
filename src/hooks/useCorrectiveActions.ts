import { useSimulationStore } from '../store/simulationStore'
import { CorrectiveAction } from '../types/action'

export const useCorrectiveActions = () => {
  const {
    availableActions,
    selectedAction,
    isRunning,
    executionResult,
    comparisonData,
    error,
    runCorrectiveActionsAnalysis,
    selectAction,
    executeSelectedAction,
    resetSimulation,
  } = useSimulationStore()

  return {
    actions: availableActions,
    selectedAction,
    isRunning,
    executionResult,
    comparisonData,
    error,
    runAnalysis: runCorrectiveActionsAnalysis,
    selectAction,
    executeAction: executeSelectedAction,
    resetSimulation,
  }
}
