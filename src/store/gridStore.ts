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
  isLoading: boolean
  error: string | null

  // Actions
  fetchNetwork: () => Promise<void>
  setTime: (time: string) => Promise<void>
  setSelectedComponent: (selection: ComponentSelection | null) => void
  selectBusById: (busId: string) => void
  selectFeederById: (feederId: string) => void
  selectSolarById: (solarId: string) => void
  selectBatteryById: (batteryId: string) => void
  updateFromSimulationResult: (pfResult: PowerFlowResult, time: string) => void
  resolveViolations: (updatedBuses: Bus[], updatedFeeders: Feeder[]) => void
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
  isLoading: false,
  error: null,

  fetchNetwork: async () => {
    set({ isLoading: true, error: null })
    try {
      const network = await gridService.getNetwork()
      set({ network, isLoading: false })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch grid network', isLoading: false })
    }
  },

  updateFromSimulationResult: (pfResult: PowerFlowResult, time: string) => {
    const currentNet = get().network

    // Update solar generation and battery SOC if present
    const updatedSolarUnits = currentNet.solarUnits.map((s) => {
      if (s.id === 'SOLAR-01') {
        return { ...s, generationKw: Math.round(pfResult.totalGenerationKw * 0.65) }
      }
      if (s.id === 'SOLAR-02') {
        return { ...s, generationKw: Math.round(pfResult.totalGenerationKw * 0.35) }
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

    const updatedNetwork: GridNetwork = {
      ...currentNet,
      buses: pfResult.buses,
      feeders: pfResult.feeders,
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
      const pfResult = await simulationService.runPowerFlow(time)
      get().updateFromSimulationResult(pfResult, time)
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
}))
