import { create } from 'zustand'
import {
  SimulationInput,
  FullSimulationResult,
  SimulationProgressStep,
  BeforeAfterComparisonData,
} from '../types/simulation'
import { CorrectiveAction, ActionExecutionResult } from '../types/action'
import { simulationService } from '../services/api/simulationService'
import {
  createSimulationInputFromPreset,
  generateSampleSolarProfile,
  generateSampleLoadProfile,
} from '../mocks/simulationInputMock'
import { defaultComparisonData } from '../mocks/simulationMock'
import { mockCorrectiveActions } from '../mocks/actionMock'
import { useGridStore } from './gridStore'

import { actionService } from '../services/api/actionService'

const initialSteps: SimulationProgressStep[] = [
  { id: '1', title: 'Initializing Digital Twin', subtitle: 'Loading distribution network model & topology', status: 'waiting' },
  { id: '2', title: 'Loading Time-Series Data', subtitle: 'Processing user-entered solar PV and load demand arrays', status: 'waiting' },
  { id: '3', title: 'Running Power-Flow Analysis', subtitle: 'Iterating nodal voltages and branch current balances', status: 'waiting' },
  { id: '4', title: 'Checking Equipment Limits', subtitle: 'Evaluating IEEE 1547 voltage limits and thermal ampacities', status: 'waiting' },
  { id: '5', title: 'Evaluating Corrective Actions', subtitle: 'Formulating optimal battery, switching, and curtailment dispatch', status: 'waiting' },
]

interface SimulationState {
  input: SimulationInput
  activePresetKey: string
  isRunning: boolean
  isProgressModalOpen: boolean
  progressSteps: SimulationProgressStep[]
  currentProgressIndex: number
  fullResult: FullSimulationResult | null

  // Active actions & comparison
  availableActions: CorrectiveAction[]
  selectedAction: CorrectiveAction | null
  executionResult: ActionExecutionResult | null
  comparisonData: BeforeAfterComparisonData
  error: string | null

  // Input mutation actions
  setInput: (input: SimulationInput) => void
  updateInput: (updates: Partial<SimulationInput>) => void
  loadPreset: (presetKey: string) => void
  updateSolarPoint: (id: string, solarKw: number) => void
  addSolarPoint: (time: string, solarKw: number) => void
  deleteSolarPoint: (id: string) => void
  generateSampleSolar: () => void
  updateLoadPoint: (id: string, loadKw: number) => void
  addLoadPoint: (time: string, loadKw: number) => void
  deleteLoadPoint: (id: string) => void
  generateSampleLoad: () => void
  importCsvData: (points: Array<{ time: string; solarKw: number; loadKw: number }>) => void

  // Simulation execution actions
  runFullSimulation: () => Promise<FullSimulationResult | null>
  closeProgressModal: () => void
  fetchActions: () => Promise<void>
  runCorrectiveActionsAnalysis: () => Promise<void>
  selectAction: (action: CorrectiveAction) => void
  executeSelectedAction: (actionId?: string) => Promise<ActionExecutionResult | null>
  resetSimulation: () => void
}

const defaultInput = createSimulationInputFromPreset('HIGH_SOLAR_LOW_LOAD')

export const useSimulationStore = create<SimulationState>((set, get) => ({
  input: defaultInput,
  activePresetKey: 'HIGH_SOLAR_LOW_LOAD',
  isRunning: false,
  isProgressModalOpen: false,
  progressSteps: initialSteps,
  currentProgressIndex: 0,
  fullResult: null,

  availableActions: mockCorrectiveActions,
  selectedAction: mockCorrectiveActions[1], // Feeder Reconfiguration default
  executionResult: null,
  comparisonData: defaultComparisonData,
  error: null,

  setInput: (input) => set({ input }),

  updateInput: (updates) => {
    set((state) => ({ input: { ...state.input, ...updates } }))
  },

  loadPreset: (presetKey) => {
    const currentGridId = get().input.gridId || useGridStore.getState().network.id
    const newInput = createSimulationInputFromPreset(presetKey)
    if (currentGridId) {
      newInput.gridId = currentGridId
    }
    set({
      input: newInput,
      activePresetKey: presetKey,
    })
    const gridStore = useGridStore.getState()
    const targetTime = presetKey === 'NORMAL_DAY' ? '10:00' : (presetKey === 'EVENING_PEAK' ? '19:30' : (presetKey === 'HIGH_SOLAR_LOW_LOAD' ? '12:30' : (presetKey === 'EXTREME_INFEASIBLE' ? '14:00' : '13:15')))
    gridStore.setTime(targetTime)
  },

  updateSolarPoint: (id, solarKw) => {
    set((state) => ({
      input: {
        ...state.input,
        solarTimeSeries: state.input.solarTimeSeries.map((p) =>
          p.id === id ? { ...p, solarKw: Math.max(0, solarKw) } : p
        ),
      },
    }))
  },

  addSolarPoint: (time, solarKw) => {
    set((state) => ({
      input: {
        ...state.input,
        solarTimeSeries: [
          ...state.input.solarTimeSeries,
          { id: `solar-${Date.now()}`, time, solarKw: Math.max(0, solarKw) },
        ].sort((a, b) => a.time.localeCompare(b.time)),
      },
    }))
  },

  deleteSolarPoint: (id) => {
    set((state) => ({
      input: {
        ...state.input,
        solarTimeSeries: state.input.solarTimeSeries.filter((p) => p.id !== id),
      },
    }))
  },

  generateSampleSolar: () => {
    const installed = get().input.installedSolarCapacityKw || 250
    const sample = generateSampleSolarProfile(installed)
    set((state) => ({
      input: {
        ...state.input,
        solarTimeSeries: sample,
      },
    }))
  },

  updateLoadPoint: (id, loadKw) => {
    set((state) => ({
      input: {
        ...state.input,
        loadTimeSeries: state.input.loadTimeSeries.map((p) =>
          p.id === id ? { ...p, loadKw: Math.max(0, loadKw) } : p
        ),
      },
    }))
  },

  addLoadPoint: (time, loadKw) => {
    set((state) => ({
      input: {
        ...state.input,
        loadTimeSeries: [
          ...state.input.loadTimeSeries,
          { id: `load-${Date.now()}`, time, loadKw: Math.max(0, loadKw) },
        ].sort((a, b) => a.time.localeCompare(b.time)),
      },
    }))
  },

  deleteLoadPoint: (id) => {
    set((state) => ({
      input: {
        ...state.input,
        loadTimeSeries: state.input.loadTimeSeries.filter((p) => p.id !== id),
      },
    }))
  },

  generateSampleLoad: () => {
    const peak = get().input.peakLoadKw || 180
    const sample = generateSampleLoadProfile(peak)
    set((state) => ({
      input: {
        ...state.input,
        loadTimeSeries: sample,
      },
    }))
  },

  importCsvData: (points) => {
    const solarPoints = points.map((p) => ({
      id: `solar-${p.time}`,
      time: p.time,
      solarKw: p.solarKw,
    }))
    const loadPoints = points.map((p) => ({
      id: `load-${p.time}`,
      time: p.time,
      loadKw: p.loadKw,
    }))
    const maxSolar = Math.max(...points.map((p) => p.solarKw), 0)
    const maxLoad = Math.max(...points.map((p) => p.loadKw), 0)

    set((state) => ({
      input: {
        ...state.input,
        solarTimeSeries: solarPoints,
        loadTimeSeries: loadPoints,
        installedSolarCapacityKw: Math.max(state.input.installedSolarCapacityKw, maxSolar),
        peakLoadKw: Math.max(state.input.peakLoadKw, maxLoad),
      },
    }))
  },

  runFullSimulation: async () => {
    const currentInput = get().input
    set({
      isRunning: true,
      isProgressModalOpen: true,
      currentProgressIndex: 0,
      progressSteps: initialSteps.map((s, idx) => ({
        ...s,
        status: idx === 0 ? 'processing' : 'waiting',
      })),
      error: null,
    })

    // Simulate animated step-by-step progress
    const updateStep = (index: number) => {
      set((state) => ({
        currentProgressIndex: index,
        progressSteps: state.progressSteps.map((s, idx) => ({
          ...s,
          status: idx < index ? 'done' : idx === index ? 'processing' : 'waiting',
        })),
      }))
    }

    try {
      await new Promise((r) => setTimeout(r, 300))
      updateStep(1)
      await new Promise((r) => setTimeout(r, 350))
      updateStep(2)
      await new Promise((r) => setTimeout(r, 450))
      updateStep(3)
      await new Promise((r) => setTimeout(r, 350))
      updateStep(4)

      const result = await simulationService.runSimulation(currentInput)

      set((state) => ({
        currentProgressIndex: 5,
        progressSteps: state.progressSteps.map((s) => ({ ...s, status: 'done' })),
        fullResult: result,
        availableActions: result.availableActions,
        selectedAction: result.availableActions.find((a) => a.id === result.recommendedActionId) || result.availableActions[0],
        comparisonData: result.comparisonData,
        isRunning: false,
      }))

      // Update global grid store with the simulated result at the peak time
      const gridStore = useGridStore.getState()
      const peakTime = result.summary.simulationTime || '13:15'
      const peakResult = result.timeStepResults[peakTime] || Object.values(result.timeStepResults)[0]

      if (peakResult) {
        gridStore.updateFromSimulationResult(peakResult, peakTime)
      }

      return result
    } catch (err: any) {
      set({ error: err.message || 'Simulation execution failed', isRunning: false })
      return null
    }
  },

  closeProgressModal: () => {
    set({ isProgressModalOpen: false })
  },

  fetchActions: async () => {
    set({ isRunning: true, error: null })
    try {
      const activeGridId = get().input.gridId || useGridStore.getState().network.id
      const response = await simulationService.runCorrectiveActions(undefined, activeGridId)
      const recommended = response.availableActions.find((a) => a.id === response.recommendedActionId) || response.availableActions[0]
      set({
        availableActions: response.availableActions,
        selectedAction: recommended,
        comparisonData: response.comparisonData,
        isRunning: false,
      })
    } catch (err: any) {
      try {
        const activeGridId = get().input.gridId || useGridStore.getState().network.id
        const actions = await actionService.getActions(activeGridId)
        const recommended = actions.find((a) => a.id === 'ACT-02') || actions[0]
        set({
          availableActions: actions,
          selectedAction: recommended,
          isRunning: false,
        })
      } catch (innerErr: any) {
        set({ error: err.message || 'Failed to fetch actions', isRunning: false })
      }
    }
  },

  runCorrectiveActionsAnalysis: async () => {
    set({ isRunning: true, error: null })
    try {
      const activeGridId = get().input.gridId || useGridStore.getState().network.id
      const response = await simulationService.runCorrectiveActions(undefined, activeGridId)
      const recommended = response.availableActions.find((a) => a.id === response.recommendedActionId) || response.availableActions[0]

      set({
        availableActions: response.availableActions,
        selectedAction: recommended,
        comparisonData: response.comparisonData,
        isRunning: false,
      })
    } catch (err: any) {
      set({ error: err.message || 'Failed to calculate corrective actions', isRunning: false })
    }
  },

  selectAction: (action: CorrectiveAction) => {
    const currentComp = get().comparisonData
    const updatedComp: BeforeAfterComparisonData = {
      ...currentComp,
      b3Voltage: {
        ...currentComp.b3Voltage,
        after: action.expectedVoltagePu,
        status: action.expectedVoltagePu <= 1.05 ? 'safe' : 'violation',
      },
      f02Loading: {
        ...currentComp.f02Loading,
        after: action.expectedFeederLoadPercent,
        status: action.expectedFeederLoadPercent <= 100 ? 'safe' : 'violation',
      },
      solarUsed: {
        ...currentComp.solarUsed,
        after: action.solarUsedKw,
      },
      batterySoc: {
        ...currentComp.batterySoc,
        after: action.batterySocPercent,
      },
      isSafe: action.isFeasible && action.remainingViolationsCount === 0,
      renewableUseMaintainedPercent: action.renewableUtilizationPercent,
      selectedActionTitle: action.title,
      afterViolationsCount: action.remainingViolationsCount,
    }

    set({
      selectedAction: action,
      comparisonData: updatedComp,
    })

    const gridStore = useGridStore.getState()
    gridStore.applyActionToNetwork(action)
  },

  executeSelectedAction: async (actionId?: string) => {
    const targetAction = actionId
      ? get().availableActions.find((a) => a.id === actionId)
      : get().selectedAction

    if (!targetAction) return null

    set({ isRunning: true, error: null })
    try {
      const activeGridId = get().input.gridId || useGridStore.getState().network.id
      const result = await actionService.executeAction(targetAction.id, activeGridId)
      set({
        executionResult: result,
        isRunning: false,
      })

      const gridStore = useGridStore.getState()
      gridStore.applyActionToNetwork(targetAction)

      return result
    } catch (err: any) {
      set({ error: err.message || 'Execution failed', isRunning: false })
      return null
    }
  },

  resetSimulation: () => {
    const input = createSimulationInputFromPreset('HIGH_SOLAR_LOW_LOAD')
    set({
      input,
      activePresetKey: 'HIGH_SOLAR_LOW_LOAD',
      availableActions: mockCorrectiveActions,
      selectedAction: mockCorrectiveActions[1],
      executionResult: null,
      comparisonData: defaultComparisonData,
      fullResult: null,
    })
    const gridStore = useGridStore.getState()
    gridStore.fetchNetwork()
  },
}))
