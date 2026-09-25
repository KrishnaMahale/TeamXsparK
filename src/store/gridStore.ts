import { create } from 'zustand'
import { GridNetwork, Bus, Feeder, SolarUnit, Battery, Load, Transformer, ComponentSelection } from '../types/network'
import { GridViolation, ViolationSummary } from '../types/violation'
import { gridService } from '../services/api/gridService'
import { simulationService } from '../services/api/simulationService'
import { PowerFlowResult } from '../types/simulation'
import { mockNetwork } from '../mocks/networkMock'
import { mockViolations, getViolationSummary } from '../mocks/violationMock'

interface GridState {
  network: GridNetwork
  currentTime: string
  selectedComponent: ComponentSelection | null
  violations: GridViolation[]
  violationSummary: ViolationSummary
  isInitialized: boolean
  isResolved: boolean
  activeActionApplied: any | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchNetwork: (force?: boolean) => Promise<void>
  setTime: (time: string) => Promise<void>
  setSelectedComponent: (selection: ComponentSelection | null) => void
  selectBusById: (busId: string) => void
  selectFeederById: (feederId: string) => void
  selectSolarById: (solarId: string) => void
  selectBatteryById: (batteryId: string) => void
  updateFromSimulationResult: (pfResult: PowerFlowResult, time: string) => void
  resolveViolations: (updatedBuses: Bus[], updatedFeeders: Feeder[]) => void
  applyActionToNetwork: (action: any) => void
}

export const useGridStore = create<GridState>((set, get) => ({
  network: mockNetwork,
  currentTime: '13:15',
  selectedComponent: {
    type: 'bus',
    id: 'B3',
    data: mockNetwork.buses.find((b) => b.id === 'B3')!,
  },
  violations: mockViolations,
  violationSummary: getViolationSummary(mockViolations),
  isInitialized: false,
  isResolved: false,
  activeActionApplied: null,
  isLoading: false,
  error: null,

  fetchNetwork: async (force: boolean = false) => {
    // If already initialized and not forced, preserve current state
    if (!force && get().isInitialized) {
      return
    }
    set({ isLoading: true, error: null })
    try {
      const network = await gridService.getNetwork()
      set({ network, isInitialized: true, isLoading: false })
      // Run dynamic simulation for initial time
      await get().setTime(get().currentTime)
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch grid network', isInitialized: true, isLoading: false })
    }
  },

  updateFromSimulationResult: (pfResult: PowerFlowResult, time: string) => {
    const currentNet = get().network

    // Update solar generation and battery SOC if present
    const updatedSolarUnits = currentNet.solarUnits.map((s) => {
      if (s.id === 'SOLAR-01') {
        return {
          ...s,
          generationKw: Math.round(pfResult.totalGenerationKw * 0.65),
          status: pfResult.totalGenerationKw > 0 ? ('normal' as const) : ('normal' as const),
        }
      }
      if (s.id === 'SOLAR-02') {
        const gen = Math.round(pfResult.totalGenerationKw * 0.35)
        const isB3Critical = pfResult.buses.find((b) => b.id === 'B3')?.status === 'critical'
        return {
          ...s,
          generationKw: gen,
          status: isB3Critical && gen > 40 ? ('warning' as const) : ('normal' as const),
        }
      }
      return s
    })

    const updatedBatteries = currentNet.batteries.map((b) => {
      if (pfResult.batterySocPercent !== undefined) {
        return { ...b, socPercent: pfResult.batterySocPercent }
      }
      return b
    })

    const updatedLoads = currentNet.loads.map((l) => {
      if (l.id === 'LOAD-01') return { ...l, powerKw: Math.round(pfResult.totalDemandKw * 0.4) }
      if (l.id === 'LOAD-02') return { ...l, powerKw: Math.round(pfResult.totalDemandKw * 0.3) }
      if (l.id === 'LOAD-03') return { ...l, powerKw: Math.round(pfResult.totalDemandKw * 0.3) }
      return l
    })

    const f01 = pfResult.feeders.find((f) => f.id === 'F-01')
    const updatedSubstation = currentNet.substation
      ? {
          ...currentNet.substation,
          loadingPercent: f01?.loadingPercent ?? currentNet.substation.loadingPercent,
        }
      : currentNet.substation

    const updatedNetwork: GridNetwork = {
      ...currentNet,
      buses: pfResult.buses,
      feeders: pfResult.feeders,
      substation: updatedSubstation,
      solarUnits: updatedSolarUnits,
      batteries: updatedBatteries,
      loads: updatedLoads,
      lastUpdated: new Date().toISOString(),
    }

    const prevSel = get().selectedComponent
    let updatedSel = prevSel
    if (prevSel && prevSel.type === 'bus') {
      const found = pfResult.buses.find((b) => b.id === prevSel.id)
      if (found) updatedSel = { type: 'bus', id: found.id, data: found }
    } else if (prevSel && prevSel.type === 'feeder') {
      const found = pfResult.feeders.find((f) => f.id === prevSel.id)
      if (found) updatedSel = { type: 'feeder', id: found.id, data: found }
    } else if (prevSel && prevSel.type === 'solar') {
      const found = updatedSolarUnits.find((s) => s.id === prevSel.id)
      if (found) updatedSel = { type: 'solar', id: found.id, data: found }
    } else if (prevSel && prevSel.type === 'load') {
      const found = updatedLoads.find((l) => l.id === prevSel.id)
      if (found) updatedSel = { type: 'load', id: found.id, data: found }
    } else if (prevSel && prevSel.type === 'battery') {
      const found = updatedBatteries.find((b) => b.id === prevSel.id)
      if (found) updatedSel = { type: 'battery', id: found.id, data: found }
    } else if (prevSel && prevSel.type === 'transformer') {
      if (updatedSubstation) updatedSel = { type: 'transformer', id: prevSel.id, data: updatedSubstation }
    }

    set({
      currentTime: time,
      network: updatedNetwork,
      violations: pfResult.violations,
      violationSummary: getViolationSummary(pfResult.violations),
      selectedComponent: updatedSel,
      isLoading: false,
    })
  },

  setTime: async (time: string) => {
    set({ currentTime: time, isLoading: true })
    try {
      const activeSim = simulationService.getActiveSimulation()
      let pfResult: PowerFlowResult | undefined
      if (activeSim && activeSim.timeStepResults[time]) {
        pfResult = activeSim.timeStepResults[time]
      } else {
        pfResult = await simulationService.runPowerFlow(time)
      }
      if (pfResult) {
        get().updateFromSimulationResult(pfResult, time)
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to simulate time step', isLoading: false })
    }
  },

  setSelectedComponent: (selection: ComponentSelection | null) => {
    set({ selectedComponent: selection })
  },

  selectBusById: (busId: string) => {
    const bus = get().network.buses.find((b) => b.id === busId)
    if (bus) {
      set({ selectedComponent: { type: 'bus', id: bus.id, data: bus } })
    }
  },

  selectFeederById: (feederId: string) => {
    const feeder = get().network.feeders.find((f) => f.id === feederId)
    if (feeder) {
      set({ selectedComponent: { type: 'feeder', id: feeder.id, data: feeder } })
    }
  },

  selectSolarById: (solarId: string) => {
    const solar = get().network.solarUnits.find((s) => s.id === solarId)
    if (solar) {
      set({ selectedComponent: { type: 'solar', id: solar.id, data: solar } })
    }
  },

  selectBatteryById: (batteryId: string) => {
    const battery = get().network.batteries.find((b) => b.id === batteryId)
    if (battery) {
      set({ selectedComponent: { type: 'battery', id: battery.id, data: battery } })
    }
  },

  resolveViolations: (updatedBuses: Bus[], updatedFeeders: Feeder[]) => {
    const current = get().network
    const activeViolations = get().violations.map((v) => ({
      ...v,
      status: 'resolved' as const,
      severity: 'resolved' as const,
    }))
    set({
      network: {
        ...current,
        buses: updatedBuses,
        feeders: updatedFeeders,
      },
      violations: activeViolations,
      violationSummary: getViolationSummary(activeViolations),
    })
  },

  applyActionToNetwork: (action: any) => {
    const current = get().network
    const isFeasible = action.isFeasible !== false

    const updatedBuses = current.buses.map((b) => {
      if (b.id === 'B3') {
        const v = isFeasible ? action.expectedVoltagePu : 1.074
        const status = v <= 1.05 && v >= 0.95 ? ('normal' as const) : ('critical' as const)
        return {
          ...b,
          voltage: v,
          lineLoadingPercent: isFeasible ? action.expectedFeederLoadPercent : 108,
          status,
        }
      }
      return b
    })

    const updatedFeeders = current.feeders.map((f) => {
      if (f.id === 'F-02') {
        const loadPct = isFeasible ? action.expectedFeederLoadPercent : 108
        const status = loadPct <= 100 ? ('normal' as const) : ('critical' as const)
        return {
          ...f,
          loadingPercent: loadPct,
          status,
          isSwitchClosed: isFeasible && action.id === 'ACT-02' ? false : true,
        }
      }
      if (f.id === 'F-03') {
        const isSwitchClosed = isFeasible && action.id === 'ACT-02'
        return {
          ...f,
          isSwitchClosed,
          loadingPercent: isSwitchClosed ? 46 : 0,
          status: 'normal' as const,
        }
      }
      return f
    })

    const updatedSolar = current.solarUnits.map((s) => {
      if (s.id === 'SOLAR-01') {
        return { ...s, generationKw: Math.round((action.solarUsedKw || 240) * 0.65) }
      }
      if (s.id === 'SOLAR-02') {
        const curtailed = isFeasible && action.id === 'ACT-03' ? 30 : 0
        return {
          ...s,
          generationKw: Math.round((action.solarUsedKw || 240) * 0.35),
          curtailedKw: curtailed,
          status: curtailed > 0 ? ('normal' as const) : isFeasible ? ('normal' as const) : ('warning' as const),
        }
      }
      return s
    })

    const updatedBatteries = current.batteries.map((b) => {
      if (b.id === 'BAT-01') {
        const power = isFeasible && action.id === 'ACT-01' ? -40 : action.id === 'ACT-04' ? -80 : 0
        return {
          ...b,
          socPercent: action.batterySocPercent ?? b.socPercent,
          powerKw: power,
          status: !isFeasible ? ('critical' as const) : ('normal' as const),
        }
      }
      return b
    })

    let updatedViolations: GridViolation[] = []
    if (isFeasible && (action.remainingViolationsCount === 0 || action.remainingViolationsCount === undefined)) {
      updatedViolations = get().violations.map((v) => ({
        ...v,
        status: 'resolved' as const,
        severity: 'resolved' as const,
      }))
    } else if (!isFeasible) {
      updatedViolations = [
        {
          id: 'VIO-B3-ACTION-FAIL',
          time: get().currentTime,
          componentType: 'bus',
          componentId: 'B3',
          componentName: 'Bus 3',
          issue: 'Over-voltage (Action Infeasible)',
          type: 'over_voltage',
          value: 1.074,
          unit: 'pu',
          formattedValue: '1.074 pu',
          limit: 1.05,
          formattedLimit: '1.050 pu',
          severity: 'critical',
          status: 'active',
          recommendationHint: action.infeasibleReason || 'Action rejected: Infeasible battery reserve',
        },
        {
          id: 'VIO-F02-ACTION-FAIL',
          time: get().currentTime,
          componentType: 'feeder',
          componentId: 'F-02',
          componentName: 'Feeder F-02',
          issue: 'Thermal Overload (108%)',
          type: 'feeder_overload',
          value: 108,
          unit: '%',
          formattedValue: '108%',
          limit: 100,
          formattedLimit: '100%',
          severity: 'critical',
          status: 'active',
          recommendationHint: 'Execute Feeder Reconfiguration F-02 -> F-03',
        },
      ]
    }

    const updatedNetwork: GridNetwork = {
      ...current,
      buses: updatedBuses,
      feeders: updatedFeeders,
      solarUnits: updatedSolar,
      batteries: updatedBatteries,
      lastUpdated: new Date().toISOString(),
    }

    const prevSel = get().selectedComponent
    let updatedSel = prevSel
    if (prevSel && prevSel.type === 'bus') {
      const found = updatedBuses.find((b) => b.id === prevSel.id)
      if (found) updatedSel = { type: 'bus', id: found.id, data: found }
    } else if (prevSel && prevSel.type === 'feeder') {
      const found = updatedFeeders.find((f) => f.id === prevSel.id)
      if (found) updatedSel = { type: 'feeder', id: found.id, data: found }
    } else if (prevSel && prevSel.type === 'solar') {
      const found = updatedSolar.find((s) => s.id === prevSel.id)
      if (found) updatedSel = { type: 'solar', id: found.id, data: found }
    } else if (prevSel && prevSel.type === 'battery') {
      const found = updatedBatteries.find((b) => b.id === prevSel.id)
      if (found) updatedSel = { type: 'battery', id: found.id, data: found }
    }

    set({
      network: updatedNetwork,
      violations: updatedViolations,
      violationSummary: getViolationSummary(updatedViolations),
      selectedComponent: updatedSel,
      isResolved: isFeasible && (action.remainingViolationsCount === 0 || action.remainingViolationsCount === undefined),
      activeActionApplied: action,
    })
  },
}))
