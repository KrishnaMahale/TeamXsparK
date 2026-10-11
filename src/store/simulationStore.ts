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
  planHorizonMode: 'forecast_series' | 'constant_snapshot' | 'grid_forecast' | null
  planHorizonLabel: string | null

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
  fetchSequentialPlan: (
    gridId?: string,
    startTimestep?: string,
    horizonSteps?: number,
    horizonMode?: 'auto' | 'constant_snapshot' | 'grid_forecast' | 'forecast_series'
  ) => Promise<SequentialControlResponse | null>
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

export const interpolatePowerAtTime = (timeStr: string, inputData: SimulationInput): { solarKw: number; loadKw: number } => {
  const [hStr, mStr] = timeStr.split(':')
  const h = parseInt(hStr, 10) || 0
  const m = parseInt(mStr, 10) || 0
  const tFloat = h + m / 60.0

  const sExact = inputData.solarTimeSeries?.find((s) => s.time === timeStr)
  const lExact = inputData.loadTimeSeries?.find((l) => l.time === timeStr)
  if (sExact !== undefined && lExact !== undefined) {
    return { solarKw: sExact.solarKw, loadKw: lExact.loadKw }
  }

  const interpSeries = (points: Array<{ time: string; [key: string]: any }> | undefined, valKey: string): number | null => {
    if (!points || points.length === 0) return null
    const parsed: Array<[number, number]> = []
    for (const p of points) {
      const parts = p.time.split(':')
      if (parts.length >= 2) {
        const t = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60.0
        const v = Number(p[valKey])
        if (!isNaN(t) && !isNaN(v)) parsed.push([t, v])
      }
    }
    if (parsed.length === 0) return null
    parsed.sort((a, b) => a[0] - b[0])
    if (tFloat <= parsed[0][0]) return parsed[0][1]
    if (tFloat >= parsed[parsed.length - 1][0]) return parsed[parsed.length - 1][1]
    for (let i = 0; i < parsed.length - 1; i++) {
      const [t1, v1] = parsed[i]
      const [t2, v2] = parsed[i + 1]
      if (t1 <= tFloat && tFloat <= t2) {
        if (t2 === t1) return v1
        const ratio = (tFloat - t1) / (t2 - t1)
        return v1 + ratio * (v2 - v1)
      }
    }
    return parsed[parsed.length - 1][1]
  }

  const sVal = sExact !== undefined ? sExact.solarKw : interpSeries(inputData.solarTimeSeries, 'solarKw')
  const lVal = lExact !== undefined ? lExact.loadKw : interpSeries(inputData.loadTimeSeries, 'loadKw')

  if (sVal !== null && lVal !== null) {
    return { solarKw: Math.round(sVal * 10) / 10, loadKw: Math.round(lVal * 10) / 10 }
  }

  const cap = inputData.installedSolarCapacityKw || 250.0
  const calcSolar =
    6.0 <= tFloat && tFloat <= 19.0
      ? Math.max(0, cap * Math.sin(((tFloat - 6.0) / 13.0) * Math.PI))
      : 0.0
  const peakL = inputData.peakLoadKw || 180.0
  const loadFactor =
    0.35 +
    0.30 * Math.exp(-Math.pow(tFloat - 10.0, 2) / 8.0) +
    0.35 * Math.exp(-Math.pow(tFloat - 19.0, 2) / 8.0)
  const calcLoad = Math.max(30.0, peakL * Math.min(1.0, loadFactor))

  return {
    solarKw: Math.round((sVal !== null ? sVal : calcSolar) * 10) / 10,
    loadKw: Math.round((lVal !== null ? lVal : calcLoad) * 10) / 10,
  }
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
  planHorizonMode: null,
  planHorizonLabel: null,

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
      planHorizonMode: null,
      planHorizonLabel: null,
    }),

  updateInput: (updates) => {
    set((state) => {
      const shouldInvalidatePlan =
        updates.gridId !== undefined ||
        updates.simulationDate !== undefined ||
        updates.solarTimeSeries !== undefined ||
        updates.loadTimeSeries !== undefined ||
        updates.currentSolarKw !== undefined ||
        updates.currentLoadKw !== undefined ||
        updates.batteryConfig !== undefined ||
        updates.networkConfig !== undefined
      return {
        input: { ...state.input, ...updates },
        ...(shouldInvalidatePlan
          ? {
              sequentialPlan: null,
              sequentialPlanError: null,
              planGridId: null,
              planDate: null,
              planHorizonMode: null,
              planHorizonLabel: null,
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
      planHorizonMode: null,
      planHorizonLabel: null,
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
      result.availableActions = allActs

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
    if (get().isRunning) return
    const activeGridId = useGridStore.getState().network.id || get().input.gridId
    const currentInput = { ...get().input, gridId: activeGridId }

    // If we already ran a full simulation that matches the active grid, preserve its computed actions and outcomes
    const existing = get().fullResult
    if (existing && existing.availableActions?.length > 0 && (!existing.input?.gridId || existing.input.gridId === activeGridId)) {
      const allActs = mergeActionsWithHybrid(existing.availableActions, existing.hybridPlan)
      const recommended = allActs.find((a) => a.id === existing.recommendedActionId) || allActs[0]
      set({
        availableActions: allActs,
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

  fetchSequentialPlan: async (
    gridId?: string,
    startTimestep?: string,
    horizonSteps?: number,
    horizonMode: 'auto' | 'constant_snapshot' | 'grid_forecast' | 'forecast_series' = 'auto'
  ) => {
    const activeGridId = gridId || get().input.gridId || useGridStore.getState().network.id || 'default-grid'
    const simDate = get().input.simulationDate || new Date().toISOString().split('T')[0]
    const resolvedStartTime = startTimestep || useGridStore.getState().currentTime || '12:00'
    const resolvedHorizonSteps = Math.max(8, horizonSteps || 8)

    set({ isPlanningSequential: true, sequentialPlanError: null })

    try {
      const input = get().input
      const network = useGridStore.getState().network

      // 1. Initial Battery State: propagate state from active digital twin simulation at resolvedStartTime if available
      const simResultAtStart = get().fullResult?.timeStepResults?.[resolvedStartTime]
      const configuredSoc =
        simResultAtStart?.batterySocPercent !== undefined
          ? Math.min(100, Math.max(0, simResultAtStart.batterySocPercent))
          : input.batteryConfig?.initialSocPercent !== undefined
          ? Math.min(100, Math.max(0, input.batteryConfig.initialSocPercent))
          : 62

      const batteryMap: Record<string, number> = {}
      if (network && network.batteries && network.batteries.length > 0) {
        network.batteries.forEach((b) => {
          batteryMap[b.id] = configuredSoc
        })
      }

      // 2. Initial Topology: propagate active simulation switch state or user-selected topology
      const supportsAlt = network?.feeders?.some((f) => f.isReconfigurableAlternate) ?? false
      const simFeeders = simResultAtStart?.feeders
      const tieLineFeeder = simFeeders?.find((f) => f.isReconfigurableAlternate || f.id === 'F-03')
      const currentSimTopology = tieLineFeeder?.isSwitchClosed ? 'alternative' : 'standard'
      const requestedTopology =
        simResultAtStart
          ? currentSimTopology
          : input.networkConfig?.feederTopology === 'alternative'
          ? 'alternative'
          : 'standard'
      const initialTopology =
        requestedTopology === 'alternative' && supportsAlt ? 'alternative' : 'standard'

      const req: SequentialControlRequest = {
        gridId: activeGridId,
        startTimestep: resolvedStartTime,
        horizonSteps: resolvedHorizonSteps,
        stepDurationHours: 0.25,
        initialSocPercent: configuredSoc,
        initialTopology,
        installedSolarCapacityKw: input.installedSolarCapacityKw || 250,
        recedingHorizonMode: true,
      }

      if (Object.keys(batteryMap).length > 0) {
        req.batterySocs = batteryMap
      }

      // 3. Form Horizon Data: check staged forecast series vs normal-simulation baseline
      const add15Minutes = (timeStr: string, stepsCount: number): string => {
        const parts = timeStr.split(':')
        const h = parseInt(parts[0], 10) || 0
        const m = parseInt(parts[1], 10) || 0
        const totalMins = ((h * 60 + m + stepsCount * 15) % 1440 + 1440) % 1440
        const nextH = Math.floor(totalMins / 60)
        const nextM = totalMins % 60
        return `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`
      }

      const checkConsecutive15MinSpacing = (pts: Array<{ time: string }>): boolean => {
        for (let i = 1; i < pts.length; i++) {
          const [hPrev, mPrev] = pts[i - 1].time.split(':').map(Number)
          const [hCurr, mCurr] = pts[i].time.split(':').map(Number)
          const delta = (((hCurr * 60 + mCurr) - (hPrev * 60 + mPrev)) % 1440 + 1440) % 1440
          if (delta !== 15) return false
        }
        return true
      }

      let effectiveHorizonMode: 'forecast_series' | 'constant_snapshot' | 'grid_forecast' = 'constant_snapshot'
      let effectiveHorizonLabel = ''

      // Check for valid 15-minute series in input (e.g. from /forecasts)
      const { solarTimeSeries, loadTimeSeries } = input
      let valid15MinSeries: SequentialForecastPoint[] | null = null

      if (solarTimeSeries && loadTimeSeries && solarTimeSeries.length >= 8 && loadTimeSeries.length >= 8) {
        const loadMap = new Map(loadTimeSeries.map((lp) => [lp.time, lp.loadKw]))
        const paired = solarTimeSeries
          .filter((sp) => loadMap.has(sp.time))
          .map((sp) => ({
            time: sp.time,
            solarKw: sp.solarKw,
            loadKw: loadMap.get(sp.time) || 0,
          }))

        const startIdx = paired.findIndex((p) => p.time === resolvedStartTime)
        if (startIdx >= 0 && startIdx + resolvedHorizonSteps <= paired.length) {
          const window = paired.slice(startIdx, startIdx + resolvedHorizonSteps)
          if (checkConsecutive15MinSpacing(window)) {
            valid15MinSeries = window
          }
        }
      }

      const isForecastDriven = input.simulationSource === 'forecast'

      if (horizonMode === 'forecast_series' || (horizonMode === 'auto' && isForecastDriven && valid15MinSeries)) {
        if (!valid15MinSeries) {
          throw new Error(
            `Forecast series at ${resolvedStartTime} does not have at least ${resolvedHorizonSteps} consecutive 15-minute intervals. Please select an earlier start time (e.g. 12:00) or generate a full day-ahead forecast.`
          )
        }
        req.forecastData = valid15MinSeries
        effectiveHorizonMode = 'forecast_series'
        effectiveHorizonLabel = `ML Day-Ahead Forecast (${resolvedHorizonSteps} steps)`
      } else if (horizonMode === 'grid_forecast') {
        // Reuse grid's day-ahead forecast baseline from backend ForecastService without fabricating data
        req.forecastData = undefined
        effectiveHorizonMode = 'grid_forecast'
        effectiveHorizonLabel = `Grid Day-Ahead Forecast Baseline (${network.name || activeGridId})`
      } else if (horizonMode === 'constant_snapshot') {
        const snapSolar = Math.max(0, input.currentSolarKw ?? 0)
        const snapLoad = Math.max(0, input.currentLoadKw ?? 0)

        if (isNaN(snapSolar) || isNaN(snapLoad)) {
          throw new Error('Operating conditions contain invalid or non-numeric solar / load values.')
        }

        const constantPoints: SequentialForecastPoint[] = []
        for (let i = 0; i < resolvedHorizonSteps; i++) {
          constantPoints.push({
            time: add15Minutes(resolvedStartTime, i),
            solarKw: snapSolar,
            loadKw: snapLoad,
          })
        }

        req.forecastData = constantPoints
        effectiveHorizonMode = 'constant_snapshot'
        effectiveHorizonLabel = `Constant-Input Baseline Scenario (${snapSolar} kW PV / ${snapLoad} kW Demand)`
      } else {
        // Mode: auto (operating condition baseline matching the 3D digital twin timeline)
        const timelinePoints: SequentialForecastPoint[] = []
        for (let i = 0; i < resolvedHorizonSteps; i++) {
          const t = add15Minutes(resolvedStartTime, i)
          const powers = interpolatePowerAtTime(t, input)
          timelinePoints.push({
            time: t,
            solarKw: powers.solarKw,
            loadKw: powers.loadKw,
          })
        }

        req.forecastData = timelinePoints
        effectiveHorizonMode = 'constant_snapshot'
        const startPowers = interpolatePowerAtTime(resolvedStartTime, input)
        effectiveHorizonLabel = `Operating Timeline Baseline (${resolvedHorizonSteps} steps from ${resolvedStartTime}: ${startPowers.solarKw} kW PV / ${startPowers.loadKw} kW Demand)`
      }

      const plan = await controlService.planSequentialControl(req)
      set({
        sequentialPlan: plan,
        planGridId: activeGridId,
        planDate: simDate,
        planHorizonMode: effectiveHorizonMode,
        planHorizonLabel: effectiveHorizonLabel,
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
      planHorizonMode: null,
      planHorizonLabel: null,
    })
  },
}))
