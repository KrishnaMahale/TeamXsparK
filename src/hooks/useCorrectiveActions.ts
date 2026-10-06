import { useEffect } from 'react'
import { useSimulationStore } from '../store/simulationStore'
import { useGridStore } from '../store/gridStore'
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

  const activeGridId = useGridStore((state) => state.network.id)

  useEffect(() => {
    fetchActions()
  }, [fetchActions, activeGridId])

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

