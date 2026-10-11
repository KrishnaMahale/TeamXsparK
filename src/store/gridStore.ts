import { create } from 'zustand'
import { GridNetwork, Bus, Feeder, SolarUnit, Battery, Load, ComponentSelection } from '../types/network'
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

  // Grid Management actions
  pastNetworks: GridNetwork[]
  futureNetworks: GridNetwork[]
  undo: () => Promise<void>
  redo: () => Promise<void>
  setNetwork: (network: GridNetwork) => void
  updateNetwork: (updated: GridNetwork) => Promise<void>
  updateComponentPosition: (id: string, position: { x: number; y: number; z: number }, persist?: boolean) => Promise<void>
  switchGrid: (gridId: string) => Promise<void>
  createGrid: (name: string, template?: 'clone' | 'starter' | 'empty') => Promise<GridNetwork>
  deleteGrid: (gridId: string) => Promise<boolean>
  renameGrid: (gridId: string, newName: string) => Promise<boolean>
  addComponent: (type: 'bus' | 'feeder' | 'solar' | 'battery' | 'load', item: any) => Promise<void>
  removeComponent: (type: string, id: string) => Promise<void>
}

export const useGridStore = create<GridState>((set, get) => ({
  network: mockNetwork,
  currentTime: '13:15',
  selectedComponent: {
    type: 'bus',
    id: 'B3',
    data: mockNetwork.buses.find((b) => b.id === 'B3')!,
  },
  violations: [],
  violationSummary: getViolationSummary([]),
  isInitialized: false,
  isResolved: false,
  activeActionApplied: null,
  isLoading: false,
  error: null,
  pastNetworks: [],
  futureNetworks: [],

  undo: async () => {
    const { pastNetworks, network, futureNetworks } = get()
    if (pastNetworks.length === 0) return
    const prev = pastNetworks[pastNetworks.length - 1]
    const newPast = pastNetworks.slice(0, pastNetworks.length - 1)
    const newFuture = [JSON.parse(JSON.stringify(network)), ...futureNetworks].slice(0, 30)
    set({ network: prev, pastNetworks: newPast, futureNetworks: newFuture })
    await gridService.updateGrid(prev.id, prev)
    await get().setTime(get().currentTime)
  },

  redo: async () => {
    const { pastNetworks, network, futureNetworks } = get()
    if (futureNetworks.length === 0) return
    const next = futureNetworks[0]
    const newFuture = futureNetworks.slice(1)
    const newPast = [...pastNetworks, JSON.parse(JSON.stringify(network))].slice(-30)
    set({ network: next, pastNetworks: newPast, futureNetworks: newFuture })
    await gridService.updateGrid(next.id, next)
    await get().setTime(get().currentTime)
  },

  fetchNetwork: async (force: boolean = false) => {
    if (!force && get().isInitialized) {
      return
    }
    set({ isLoading: true, error: null })
    try {
      const activeId = await gridService.getActiveGridId()
      const network = await gridService.getGrid(activeId)
      set({ network, isInitialized: true, isLoading: false })
      await get().setTime(get().currentTime)
    } catch (err: any) {
      const fallbackNet = await gridService.getNetwork()
      set({ network: fallbackNet, error: err.message || null, isInitialized: true, isLoading: false })
    }
  },

  setNetwork: (network: GridNetwork) => {
    set({ network })
  },

  updateNetwork: async (updated: GridNetwork) => {
    const current = get().network
    const past = [...get().pastNetworks, JSON.parse(JSON.stringify(current))].slice(-30)
    set({ network: updated, pastNetworks: past, futureNetworks: [] })
    await gridService.updateGrid(updated.id, updated)
  },

  updateComponentPosition: async (
    id: string,
    position: { x: number; y: number; z: number },
    persist: boolean = true
  ) => {
    const current = get().network

    // Short-circuit ephemeral update if position hasn't changed to avoid unnecessary reconciliations
    if (!persist) {
      let existingPos: { x: number; y: number; z: number } | undefined
      if (current.substation && current.substation.id === id) existingPos = current.substation.position
      else {
        const item = current.buses.find((x) => x.id === id) ||
          current.solarUnits.find((x) => x.id === id) ||
          current.batteries.find((x) => x.id === id) ||
          current.loads.find((x) => x.id === id)
        existingPos = item?.position
      }
      if (
        existingPos &&
        Math.abs(existingPos.x - position.x) < 0.001 &&
        Math.abs(existingPos.y - position.y) < 0.001 &&
        Math.abs(existingPos.z - position.z) < 0.001
      ) {
        return
      }
    }

    let modified = false

    const updated: GridNetwork = {
      ...current,
      buses: current.buses.map((b) => {
        if (b.id === id) {
          modified = true
          return { ...b, position }
        }
        return b
      }),
      solarUnits: current.solarUnits.map((s) => {
        if (s.id === id) {
          modified = true
          return { ...s, position }
        }
        return s
      }),
      batteries: current.batteries.map((bat) => {
        if (bat.id === id) {
          modified = true
          return { ...bat, position }
        }
        return bat
      }),
      loads: current.loads.map((l) => {
        if (l.id === id) {
          modified = true
          return { ...l, position }
        }
        return l
      }),
      substation:
        current.substation && current.substation.id === id
          ? (() => {
              modified = true
              return { ...current.substation, position }
            })()
          : current.substation,
    }

    if (!modified) return

    // Update selectedComponent if it matches the moved component so inspection panel is always in sync
    const sel = get().selectedComponent
    const updatedSelected =
      sel && sel.id === id
        ? {
            ...sel,
            data:
              sel.type === 'transformer' && updated.substation?.id === id
                ? updated.substation
                : sel.type === 'bus'
                ? updated.buses.find((b) => b.id === id) || sel.data
                : sel.type === 'solar'
                ? updated.solarUnits.find((s) => s.id === id) || sel.data
                : sel.type === 'battery'
                ? updated.batteries.find((b) => b.id === id) || sel.data
                : sel.type === 'load'
                ? updated.loads.find((l) => l.id === id) || sel.data
                : sel.data,
          }
        : sel

    if (persist) {
      const past = [...get().pastNetworks, JSON.parse(JSON.stringify(current))].slice(-30)
      set({
        network: updated,
        selectedComponent: updatedSelected,
        pastNetworks: past,
        futureNetworks: [],
      })
      try {
        await gridService.updateGrid(updated.id, updated)
      } catch (err) {
        console.warn('Failed to persist component position to backend:', err)
      }
    } else {
      // Ephemeral update during active dragging: instant 60fps state update, no history push, no network overhead
      set({ network: updated, selectedComponent: updatedSelected })
    }
  },

  switchGrid: async (gridId: string) => {
    set({ isLoading: true, error: null })
    try {
      await gridService.setActiveGridId(gridId)
      const network = await gridService.getGrid(gridId)
      simulationService.setActiveSimulation(null)
      set({
        network,
        selectedComponent: null,
        violations: [],
        violationSummary: getViolationSummary([]),
        activeActionApplied: null,
        isResolved: false,
        isLoading: false,
      })
      await get().setTime(get().currentTime)
    } catch (err: any) {
      set({ error: err.message || 'Failed to switch grid', isLoading: false })
    }
  },

  createGrid: async (name: string, template: 'clone' | 'starter' | 'empty' = 'clone') => {
    const current = get().network
    let newGridData: Partial<GridNetwork>

    if (template === 'clone') {
      newGridData = {
        ...JSON.parse(JSON.stringify(current)),
        id: `GRID-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        name: name.trim() || `Cloned Grid`,
      }
    } else if (template === 'starter') {
      const sub = JSON.parse(JSON.stringify(mockNetwork.substation))
      const b1: Bus = {
        id: 'B1',
        name: 'Feeder Head Bus 1',
        voltage: 1.02,
        voltageLimitMin: 0.95,
        voltageLimitMax: 1.05,
        loadKw: 0,
        solarKw: 0,
        lineLoadingPercent: 40,
        temperatureC: 30,
        status: 'normal',
        connectedFeeders: ['F-01'],
        connectedAssets: {},
        position: { x: 0, y: 0, z: -5 },
      }
      const f1: Feeder = {
        id: 'F-01',
        name: 'Substation Feeder F-01',
        fromBus: sub.id,
        toBus: 'B1',
        loadingPercent: 40,
        loadingLimitPercent: 100,
        capacityKw: 1000,
        activePowerKw: 400,
        reactivePowerKvar: 50,
        status: 'normal',
        isSwitchClosed: true,
      }
      newGridData = {
        id: `GRID-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        name: name.trim() || `Radial Feeder`,
        substation: sub,
        buses: [b1],
        feeders: [f1],
        solarUnits: [],
        batteries: [],
        loads: [],
      }
    } else {
      newGridData = {
        id: `GRID-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        name: name.trim() || `New Custom Grid`,
        substation: JSON.parse(JSON.stringify(mockNetwork.substation)),
        buses: [],
        feeders: [],
        solarUnits: [],
        batteries: [],
        loads: [],
      }
    }

    const created = await gridService.createGrid(newGridData)
    await get().switchGrid(created.id)
    return created
  },

  deleteGrid: async (gridId: string) => {
    if (gridId === 'default-grid') return false
    const success = await gridService.deleteGrid(gridId)
    if (success) {
      await get().switchGrid('default-grid')
    }
    return success
  },

  renameGrid: async (gridId: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) return false
    const targetId = gridId || get().network.id

    if (targetId === get().network.id) {
      const updated: GridNetwork = {
        ...get().network,
        name: trimmed,
        lastUpdated: new Date().toISOString(),
      }
      set({ network: updated })
      await gridService.updateGrid(targetId, updated)
      return true
    } else {
      const existing = await gridService.getGrid(targetId)
      if (existing) {
        existing.name = trimmed
        existing.lastUpdated = new Date().toISOString()
        await gridService.updateGrid(targetId, existing)
        return true
      }
    }
    return false
  },

  addComponent: async (type, item) => {
    const net = JSON.parse(JSON.stringify(get().network)) as GridNetwork
    if (type === 'bus') {
      net.buses.push(item)
    } else if (type === 'feeder') {
      net.feeders.push(item)
    } else if (type === 'solar') {
      net.solarUnits.push(item)
    } else if (type === 'battery') {
      net.batteries.push(item)
    } else if (type === 'load') {
      net.loads.push(item)
    }
    await get().updateNetwork(net)
    await get().setTime(get().currentTime)
  },

  removeComponent: async (type, id) => {
    const net = JSON.parse(JSON.stringify(get().network)) as GridNetwork
    if (type === 'bus') {
      net.buses = net.buses.filter((b) => b.id !== id)
      net.feeders = net.feeders.filter((f) => f.fromBus !== id && f.toBus !== id)
      net.solarUnits.forEach((s) => {
        if (s.busId === id) s.busId = ''
      })
      net.batteries.forEach((b) => {
        if (b.busId === id) b.busId = ''
      })
      net.loads.forEach((l) => {
        if (l.busId === id) l.busId = ''
      })
    } else if (type === 'feeder') {
      net.feeders = net.feeders.filter((f) => f.id !== id)
    } else if (type === 'solar') {
      net.solarUnits = net.solarUnits.filter((s) => s.id !== id)
    } else if (type === 'battery') {
      net.batteries = net.batteries.filter((b) => b.id !== id)
    } else if (type === 'load') {
      net.loads = net.loads.filter((l) => l.id !== id)
    }
    if (get().selectedComponent?.id === id) {
      set({ selectedComponent: null })
    }
    await get().updateNetwork(net)
    await get().setTime(get().currentTime)
  },

  updateFromSimulationResult: (pfResult: PowerFlowResult, time: string) => {
    const currentNet = get().network

    const totalSolarCap = currentNet.solarUnits.reduce((acc, s) => acc + s.capacityKw, 0) || 1
    const updatedSolarUnits = currentNet.solarUnits.map((s) => {
      const gen = Math.round(pfResult.totalGenerationKw * (s.capacityKw / totalSolarCap))
      return {
        ...s,
        generationKw: gen,
        status: gen > 0 ? ('normal' as const) : ('normal' as const),
      }
    })

    const updatedBatteries = currentNet.batteries.map((b) => {
      if (pfResult.batterySocPercent !== undefined) {
        return { ...b, socPercent: pfResult.batterySocPercent }
      }
      return b
    })

    const totalLoadCap = currentNet.loads.reduce((acc, l) => acc + l.powerKw, 0) || 1
    const updatedLoads = currentNet.loads.map((l) => {
      return { ...l, powerKw: Math.round(pfResult.totalDemandKw * (l.powerKw / totalLoadCap)) }
    })

    const f01 = pfResult.feeders.find((f) => f.id === 'F-01')
    const updatedSubstation = currentNet.substation
      ? {
          ...currentNet.substation,
          loadingPercent: f01?.loadingPercent ?? currentNet.substation.loadingPercent,
        }
      : currentNet.substation

    // Match buses and feeders by ID to preserve custom grids without overwriting
    const pfBusMap = new Map(pfResult.buses.map((b) => [b.id, b]))
    const hasMatchingBuses = currentNet.buses.some((b) => pfBusMap.has(b.id))
    const updatedBuses = hasMatchingBuses
      ? currentNet.buses.map((b) => {
          const sim = pfBusMap.get(b.id)
          return sim ? { ...b, voltage: sim.voltage, lineLoadingPercent: sim.lineLoadingPercent, status: sim.status } : b
        })
      : currentNet.buses

    const pfFeederMap = new Map(pfResult.feeders.map((f) => [f.id, f]))
    const hasMatchingFeeders = currentNet.feeders.some((f) => pfFeederMap.has(f.id))
    const updatedFeeders = hasMatchingFeeders
      ? currentNet.feeders.map((f) => {
          const sim = pfFeederMap.get(f.id)
          return sim ? { ...f, loadingPercent: sim.loadingPercent, status: sim.status, isSwitchClosed: sim.isSwitchClosed } : f
        })
      : currentNet.feeders

    const updatedNetwork: GridNetwork = {
      ...currentNet,
      buses: updatedBuses,
      feeders: updatedFeeders,
      substation: updatedSubstation,
      solarUnits: updatedSolarUnits,
      batteries: updatedBatteries,
      loads: updatedLoads,
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
      const activeNetId = get().network.id
      const activeSim = simulationService.getActiveSimulation()
      let pfResult: PowerFlowResult | undefined
      if (
        activeSim &&
        (!activeSim.input.gridId || activeSim.input.gridId === activeNetId) &&
        activeSim.timeStepResults[time]
      ) {
        pfResult = activeSim.timeStepResults[time]
      } else {
        pfResult = await simulationService.runPowerFlow(time, undefined, activeNetId)
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

    // Dynamically identify target bus and feeder from the authoritative backend action
    const criticalBus = current.buses.find((b) => b.status === 'critical' || b.voltage > 1.05 || b.voltage < 0.95)
    const targetBusId = action.targetComponentId || criticalBus?.id || current.buses[0]?.id
    const criticalFeeder = current.feeders.find((f) => f.status === 'critical' || f.loadingPercent > 100)
    const targetFeederId = (action.type === 'feeder_reconfiguration' ? action.targetComponentId : null) || criticalFeeder?.id || current.feeders[0]?.id

    const updatedBuses = current.buses.map((b) => {
      if (b.id === targetBusId || (isFeasible && b.status === 'critical' && action.remainingViolationsCount === 0)) {
        const v = action.expectedVoltagePu !== undefined ? action.expectedVoltagePu : b.voltage
        const status = v <= 1.05 && v >= 0.95 ? ('normal' as const) : ('critical' as const)
        return {
          ...b,
          voltage: v,
          lineLoadingPercent: action.expectedFeederLoadPercent !== undefined ? action.expectedFeederLoadPercent : b.lineLoadingPercent,
          status,
        }
      }
      return b
    })

    const updatedFeeders = current.feeders.map((f) => {
      if (f.id === targetFeederId || (isFeasible && f.status === 'critical' && action.remainingViolationsCount === 0)) {
        const loadPct = action.expectedFeederLoadPercent !== undefined ? action.expectedFeederLoadPercent : f.loadingPercent
        const status = loadPct <= 100 ? ('normal' as const) : ('critical' as const)
        return {
          ...f,
          loadingPercent: loadPct,
          status,
          isSwitchClosed: isFeasible && action.type === 'feeder_reconfiguration' ? false : f.isSwitchClosed,
        }
      }
      if (f.isReconfigurableAlternate || !f.isSwitchClosed) {
        const isSwitchClosed = isFeasible && action.type === 'feeder_reconfiguration'
        return {
          ...f,
          isSwitchClosed,
          status: 'normal' as const,
        }
      }
      return f
    })

    const targetSolar = current.solarUnits.find((s) => s.busId === targetBusId) || current.solarUnits[0]
    const updatedSolar = current.solarUnits.map((s) => {
      if (targetSolar && s.id === targetSolar.id) {
        const genKw = action.solarUsedKw !== undefined ? Math.round(action.solarUsedKw) : s.generationKw
        const curtailed = Math.max(0, s.capacityKw - genKw)
        return {
          ...s,
          generationKw: genKw,
          curtailedKw: curtailed,
          status: 'normal' as const,
        }
      }
      return s
    })

    const targetBattery = current.batteries.find((b) => b.busId === targetBusId) || current.batteries[0]
    const updatedBatteries = current.batteries.map((b) => {
      if (targetBattery && b.id === targetBattery.id) {
        return {
          ...b,
          socPercent: action.batterySocPercent ?? b.socPercent,
          status: !isFeasible ? ('critical' as const) : ('normal' as const),
        }
      }
      return b
    })

    let updatedViolations: GridViolation[] = []
    if (!isFeasible) {
      updatedViolations = [
        {
          id: `VIO-${targetBusId}-ACTION-FAIL`,
          time: get().currentTime,
          componentType: 'bus',
          componentId: targetBusId || 'B1',
          componentName: current.buses.find((b) => b.id === targetBusId)?.name || 'Critical Bus',
          issue: 'Operating Limit Breach (Action Infeasible)',
          type: 'over_voltage',
          value: action.expectedVoltagePu || 1.074,
          unit: 'pu',
          formattedValue: `${action.expectedVoltagePu || 1.074} pu`,
          limit: 1.05,
          formattedLimit: '1.050 pu',
          severity: 'critical',
          status: 'active',
          recommendationHint: action.infeasibleReason || 'Action rejected: Infeasible operating constraint',
        },
      ]
    } else {
      const baseViols = get().violations.length > 0 ? get().violations : []
      updatedViolations = baseViols.map((v) => {
        if (v.componentType === 'bus') {
          const bus = updatedBuses.find((b) => b.id === v.componentId)
          const vMax = bus?.voltageLimitMax ?? 1.05
          const vMin = bus?.voltageLimitMin ?? 0.95
          if (bus && bus.voltage <= vMax && bus.voltage >= vMin) {
            return {
              ...v,
              value: bus.voltage,
              formattedValue: `${bus.voltage.toFixed(3)} pu`,
              status: 'resolved' as const,
              severity: 'resolved' as const,
            }
          } else if (bus) {
            return {
              ...v,
              value: bus.voltage,
              formattedValue: `${bus.voltage.toFixed(3)} pu`,
              status: 'active' as const,
            }
          }
        } else if (v.componentType === 'feeder') {
          const feeder = updatedFeeders.find((f) => f.id === v.componentId)
          const fMax = feeder?.loadingLimitPercent ?? 100
          if (feeder && feeder.loadingPercent <= fMax) {
            return {
              ...v,
              value: feeder.loadingPercent,
              formattedValue: `${feeder.loadingPercent.toFixed(0)}%`,
              status: 'resolved' as const,
              severity: 'resolved' as const,
            }
          } else if (feeder) {
            return {
              ...v,
              value: feeder.loadingPercent,
              formattedValue: `${feeder.loadingPercent.toFixed(0)}%`,
              status: 'active' as const,
            }
          }
        }
        return v
      })
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
      isResolved: isFeasible && action.remainingViolationsCount === 0,
      activeActionApplied: action,
    })
  },
}))
