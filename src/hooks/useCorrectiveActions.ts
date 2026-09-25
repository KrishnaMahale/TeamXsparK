import { useEffect } from 'react'
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
    fetchActions,
    runCorrectiveActionsAnalysis,
    selectAction,
    executeSelectedAction,
    resetSimulation,
  } = useSimulationStore()

  useEffect(() => {
    fetchActions()
  }, [fetchActions])

  return {
    actions: availableActions,
    selectedAction,
    isRunning,
    executionResult,
    comparisonData,
    error,
    refresh: fetchActions,
    runAnalysis: runCorrectiveActionsAnalysis,
    selectAction,
    executeAction: executeSelectedAction,
    resetSimulation,
  }
}

