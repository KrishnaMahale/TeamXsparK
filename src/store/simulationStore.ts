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
import {
  controlService,
  SequentialControlResponse,
  SequentialControlRequest,
  SequentialForecastPoint,
} from '../services/api/controlService'

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

  // Sequential MPC Trajectory State
  sequentialPlan: SequentialControlResponse | null
  isPlanningSequential: boolean
  sequentialPlanError: string | null
  planGridId: string | null
  planDate: string | null

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

  // Sequential MPC Planning actions
  fetchSequentialPlan: (gridId?: string, startTimestep?: string, horizonSteps?: number) => Promise<SequentialControlResponse | null>
  clearSequentialPlan: () => void
}

export const mergeActionsWithHybrid = (baseActions: CorrectiveAction[], hybridPlan?: CorrectiveAction | null): CorrectiveAction[] => {
  const map = new Map<string, CorrectiveAction>()
  baseActions.forEach((a) => {
    if (a && a.id) map.set(a.id, a)
  })
  if (hybridPlan && hybridPlan.id) {
    map.set(hybridPlan.id, hybridPlan)
  }
  return Array.from(map.values())
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

  // Sequential MPC trajectory state
  sequentialPlan: null,
  isPlanningSequential: false,
  sequentialPlanError: null,
  planGridId: null,
  planDate: null,

  availableActions: mockCorrectiveActions,
  selectedAction: mockCorrectiveActions[1], // Feeder Reconfiguration default
  executionResult: null,
  comparisonData: defaultComparisonData,
  error: null,

  setInput: (input) =>
    set({
      input,
      sequentialPlan: null,
      sequentialPlanError: null,
      planGridId: null,
      planDate: null,
    }),

  updateInput: (updates) => {
    set((state) => {
      const shouldInvalidatePlan =
        updates.gridId !== undefined ||
        updates.simulationDate !== undefined ||
        updates.solarTimeSeries !== undefined ||
        updates.loadTimeSeries !== undefined
      return {
        input: { ...state.input, ...updates },
        ...(shouldInvalidatePlan
          ? {
              sequentialPlan: null,
              sequentialPlanError: null,
              planGridId: null,
              planDate: null,
            }
          : {}),
      }
    })
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
      sequentialPlan: null,
      sequentialPlanError: null,
      planGridId: null,
      planDate: null,
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

      const allActs = mergeActionsWithHybrid(result.availableActions, result.hybridPlan)

      set((state) => ({
        currentProgressIndex: 5,
        progressSteps: state.progressSteps.map((s) => ({ ...s, status: 'done' })),
        fullResult: result,
        availableActions: allActs,
        selectedAction: allActs.find((a) => a.id === result.recommendedActionId) || allActs[0],
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
    const activeGridId = useGridStore.getState().network.id || get().input.gridId
    const currentInput = { ...get().input, gridId: activeGridId }

    // If we already ran a full simulation that matches the active grid, preserve its computed actions and outcomes
    const existing = get().fullResult
    if (existing && existing.availableActions?.length > 0 && (!existing.input?.gridId || existing.input.gridId === activeGridId)) {
      const recommended = existing.availableActions.find((a) => a.id === existing.recommendedActionId) || existing.availableActions[0]
      set({
        availableActions: existing.availableActions,
        selectedAction: get().selectedAction || recommended,
        comparisonData: existing.comparisonData,
        isRunning: false,
      })
      return
    }

    set({ isRunning: true, error: null })
    try {
      const response = await simulationService.runCorrectiveActions(undefined, activeGridId, currentInput)
      const allActs = mergeActionsWithHybrid(response.availableActions, response.hybridPlan)
      const recommended = allActs.find((a) => a.id === response.recommendedActionId) || allActs[0]
      set({
        availableActions: allActs,
        selectedAction: recommended,
        comparisonData: response.comparisonData,
        isRunning: false,
      })
    } catch (err: any) {
      try {
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
      const activeGridId = useGridStore.getState().network.id || get().input.gridId
      const currentInput = { ...get().input, gridId: activeGridId }
      const response = await simulationService.runCorrectiveActions(undefined, activeGridId, currentInput)
      const allActs = mergeActionsWithHybrid(response.availableActions, response.hybridPlan)
      const recommended = allActs.find((a) => a.id === response.recommendedActionId) || allActs[0]

      set({
        availableActions: allActs,
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
      const executedStateAction = {
        ...targetAction,
        expectedVoltagePu: result.afterState.b3Voltage,
        expectedFeederLoadPercent: result.afterState.f02LoadingPercent,
        solarUsedKw: result.afterState.solarUsedKw,
        batterySocPercent: result.afterState.batterySocPercent,
        remainingViolationsCount: result.afterState.violationsCount,
        isFeasible: result.success,
      }
      gridStore.applyActionToNetwork(executedStateAction)

      return result
    } catch (err: any) {
      set({ error: err.message || 'Execution failed', isRunning: false })
      return null
    }
  },

  resetSimulation: () => {
    const activeGridId = useGridStore.getState().network.id || get().input.gridId
    const input = createSimulationInputFromPreset('HIGH_SOLAR_LOW_LOAD')
    if (activeGridId) input.gridId = activeGridId
    set({
      input,
      activePresetKey: 'HIGH_SOLAR_LOW_LOAD',
      executionResult: null,
      fullResult: null,
      sequentialPlan: null,
      sequentialPlanError: null,
      planGridId: null,
      planDate: null,
    })
    const gridStore = useGridStore.getState()
    gridStore.fetchNetwork()
    get().fetchActions()
  },

  fetchSequentialPlan: async (gridId?: string, startTimestep?: string, horizonSteps?: number) => {
    const activeGridId = gridId || get().input.gridId || useGridStore.getState().network.id || 'default-grid'
    const simDate = get().input.simulationDate || new Date().toISOString().split('T')[0]
    set({ isPlanningSequential: true, sequentialPlanError: null })

    try {
      const { solarTimeSeries, loadTimeSeries } = get().input
      let forecastPoints: SequentialForecastPoint[] | undefined = undefined

      if (solarTimeSeries && solarTimeSeries.length >= 8 && loadTimeSeries && loadTimeSeries.length >= 8) {
        const loadMap = new Map(loadTimeSeries.map((lp) => [lp.time, lp.loadKw]))
        forecastPoints = solarTimeSeries
          .filter((sp) => loadMap.has(sp.time))
          .map((sp) => ({
            time: sp.time,
            solarKw: sp.solarKw,
            loadKw: loadMap.get(sp.time) || 0,
          }))
      }

      // Read current battery SOC from network state if available
      const network = useGridStore.getState().network
      const batteryMap: Record<string, number> = {}
      if (network && network.batteries) {
        network.batteries.forEach((b) => {
          if (b.socPercent !== undefined) {
            batteryMap[b.id] = b.socPercent
          }
        })
      }

      const req: SequentialControlRequest = {
        gridId: activeGridId,
        startTimestep: startTimestep || '12:00',
        horizonSteps: horizonSteps || 8,
        stepDurationHours: 0.25,
        recedingHorizonMode: true,
      }

      if (Object.keys(batteryMap).length > 0) {
        req.batterySocs = batteryMap
      }

      if (forecastPoints && forecastPoints.length >= (horizonSteps || 8)) {
        req.forecastData = forecastPoints
      }

      const plan = await controlService.planSequentialControl(req)
      set({
        sequentialPlan: plan,
        planGridId: activeGridId,
        planDate: simDate,
        isPlanningSequential: false,
        sequentialPlanError: null,
      })
      return plan
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.detail?.error?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to compute sequential MPC plan.'
      set({
        isPlanningSequential: false,
        sequentialPlanError: typeof msg === 'string' ? msg : JSON.stringify(msg),
      })
      return null
    }
  },

  clearSequentialPlan: () => {
    set({
      sequentialPlan: null,
      sequentialPlanError: null,
      planGridId: null,
      planDate: null,
    })
  },
}))
