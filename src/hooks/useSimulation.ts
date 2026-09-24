import { useSimulationStore } from '../store/simulationStore'
import { useGridStore } from '../store/gridStore'

export const useSimulation = () => {
  const {
    isRunning,
    availableActions,
    selectedAction,
    executionResult,
    comparisonData,
    error,
    runCorrectiveActionsAnalysis,
    selectAction,
    executeSelectedAction,
    resetSimulation,
  } = useSimulationStore()

  const { currentTime, setTime } = useGridStore()

  return {
    isRunning,
    availableActions,
    selectedAction,
    executionResult,
    comparisonData,
    error,
    currentTime,
    setTime,
    runCorrectiveActions: runCorrectiveActionsAnalysis,
    selectAction,
    executeAction: executeSelectedAction,
    resetSimulation,
  }
}
