import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useSelectedComponent } from '../../hooks/useSelectedComponent'
import { useGridStore } from '../../store/gridStore'
import { useSimulationStore } from '../../store/simulationStore'
import { Bus, Feeder, SolarUnit, Battery, Load, GridNetwork } from '../../types/network'
import { SolarRooftopVillaSvg } from '../network/assets/SolarRooftopIcon'
import {
  Cpu,
  ChevronDown,
  ChevronRight,
  Sliders,
  CheckCircle2,
  Edit3,
  Save,
  X,
  XCircle,
} from 'lucide-react'
import { formatVoltage, formatPercent } from '../../utils/formatters'

export const ComponentDetailsPanel: React.FC = () => {
  const { selectedComponent, setSelectedComponent } = useSelectedComponent()
  const { network, updateNetwork } = useGridStore()

  // Collapsible section states (Position box and Actions box completely removed per request)
  const [openSections, setOpenSections] = useState({
    component: true,
    connections: true,
    electrical: true,
  })

  const [showConnectPicker, setShowConnectPicker] = useState(false)

  // Interactive Electrical Data Editing State
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Always resolve live component data from active network state
  const liveComponent = useMemo(() => {
    if (!selectedComponent) return null
    const { type, id } = selectedComponent
    if (type === 'bus') {
      const b = network.buses.find((i) => i.id === id)
      return b ? { type: 'bus' as const, id: b.id, data: b } : selectedComponent
    }
    if (type === 'feeder') {
      const f = network.feeders.find((i) => i.id === id)
      return f ? { type: 'feeder' as const, id: f.id, data: f } : selectedComponent
    }
    if (type === 'solar') {
      const s = network.solarUnits.find((i) => i.id === id)
      return s ? { type: 'solar' as const, id: s.id, data: s } : selectedComponent
    }
    if (type === 'battery') {
      const b = network.batteries.find((i) => i.id === id)
      return b ? { type: 'battery' as const, id: b.id, data: b } : selectedComponent
    }
    if (type === 'load') {
      const l = network.loads.find((i) => i.id === id)
      return l ? { type: 'load' as const, id: l.id, data: l } : selectedComponent
    }
    if (type === 'transformer' || (type as string) === 'substation') {
      const sub = network.substation
      return sub ? { type: 'transformer' as const, id: sub.id, data: sub } : selectedComponent
    }
    return selectedComponent
  }, [selectedComponent, network])

  // Populate editForm whenever selected component changes
  useEffect(() => {
    setShowConnectPicker(false)
    setIsEditing(false)
    setSaveSuccess(false)

    if (!liveComponent) {
      setEditForm({})
      return
    }

    const { type, data } = liveComponent
    if (type === 'load') {
      const l = data as Load
      setEditForm({
        name: l.name || '',
        powerKw: l.powerKw ?? 50,
        powerFactor: l.powerFactor ?? 0.92,
      })
    } else if (type === 'solar') {
      const s = data as SolarUnit
      setEditForm({
        name: s.name || '',
        generationKw: s.generationKw ?? 50,
        loadKw: s.loadKw ?? 0,
        capacityKw: s.capacityKw ?? 100,
        isSolarRooftop: s.isSolarRooftop ?? false,
      })
    } else if (type === 'battery') {
      const b = data as Battery
      setEditForm({
        name: b.name || '',
        socPercent: b.socPercent ?? 60,
        powerKw: b.powerKw ?? 0,
        capacityKwh: b.capacityKwh ?? 100,
        maxDischargeKw: b.maxDischargeKw ?? 50,
      })
    } else if (type === 'bus') {
      const b = data as Bus
      setEditForm({
        name: b.name || '',
        voltage: b.voltage ?? 1.0,
        voltageLimitMin: b.voltageLimitMin ?? 0.95,
        voltageLimitMax: b.voltageLimitMax ?? 1.05,
        loadKw: b.loadKw ?? 0,
        solarKw: b.solarKw ?? 0,
      })
    } else if (type === 'feeder') {
      const f = data as Feeder
      setEditForm({
        name: f.name || '',
        capacityKw: f.capacityKw ?? 500,
        activePowerKw: f.activePowerKw ?? 0,
        isSwitchClosed: f.isSwitchClosed ?? true,
      })
    } else if (type === 'transformer' || (type as string) === 'substation') {
      const sub = network.substation
      setEditForm({
        name: sub?.name || 'Main Substation',
        ratingKva: sub?.ratingKva ?? 2500,
        loadingPercent: sub?.loadingPercent ?? 68,
      })
    }
  }, [liveComponent?.type, liveComponent?.id])

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Quick connect / reassign component to target bus
  const handleReassignBus = async (targetBusId: string) => {
    if (!liveComponent) return
    const updatedNetwork = JSON.parse(JSON.stringify(network)) as GridNetwork
    const { type, id } = liveComponent

    if (type === 'solar') {
      const s = updatedNetwork.solarUnits.find((i) => i.id === id)
      if (s) s.busId = targetBusId
    } else if (type === 'battery') {
      const b = updatedNetwork.batteries.find((i) => i.id === id)
      if (b) b.busId = targetBusId
    } else if (type === 'load') {
      const l = updatedNetwork.loads.find((i) => i.id === id)
      if (l) l.busId = targetBusId
    }

    await updateNetwork(updatedNetwork)
    setShowConnectPicker(false)
  }

  // Feeder line tie-line switch toggle
  const handleToggleSwitch = async () => {
    if (!liveComponent || liveComponent.type !== 'feeder') return
    const updatedNetwork = JSON.parse(JSON.stringify(network)) as GridNetwork
    const f = updatedNetwork.feeders.find((i) => i.id === liveComponent.id)
    if (f) {
      f.isSwitchClosed = !f.isSwitchClosed
      f.status = f.isSwitchClosed ? 'normal' : 'warning'
      await updateNetwork(updatedNetwork)
    }
  }

  // Save edited electrical data and propagate everywhere
  const handleSaveElectrical = async () => {
    if (!liveComponent) return
    setIsSaving(true)
    try {
      const updatedNetwork = JSON.parse(JSON.stringify(network)) as GridNetwork
      const { type, id } = liveComponent

      if (type === 'load') {
        const item = updatedNetwork.loads.find((l) => l.id === id)
        if (item) {
          if (editForm.name) item.name = editForm.name.trim()
          item.powerKw = Math.max(0, Number(editForm.powerKw) || 0)
          item.powerFactor = Math.min(1.0, Math.max(0.1, Number(editForm.powerFactor) || 0.92))

          // Propagate to connected bus loadKw
          if (item.busId) {
            const bus = updatedNetwork.buses.find((b) => b.id === item.busId)
            if (bus) {
              const busLoads = updatedNetwork.loads.filter((l) => l.busId === bus.id)
              bus.loadKw = busLoads.reduce(
                (sum, l) => sum + (l.id === item.id ? item.powerKw : (l.powerKw || 0)),
                0
              )
            }
          }
        }
      } else if (type === 'solar') {
        const item = updatedNetwork.solarUnits.find((s) => s.id === id)
        if (item) {
          if (editForm.name) item.name = editForm.name.trim()
          item.generationKw = Math.max(0, Number(editForm.generationKw) || 0)
          item.capacityKw = Math.max(
            item.generationKw,
            Number(editForm.capacityKw) || item.generationKw
          )
          if (editForm.loadKw !== undefined) {
            item.loadKw = Math.max(0, Number(editForm.loadKw) || 0)
          }

          // Propagate to connected bus solarKw and loadKw
          if (item.busId) {
            const bus = updatedNetwork.buses.find((b) => b.id === item.busId)
            if (bus) {
              const busSolars = updatedNetwork.solarUnits.filter((s) => s.busId === bus.id)
              bus.solarKw = busSolars.reduce(
                (sum, s) => sum + (s.id === item.id ? item.generationKw : (s.generationKw || 0)),
                0
              )
              const busLoads = updatedNetwork.loads.filter((l) => l.busId === bus.id)
              const baseLoad = busLoads.reduce((sum, l) => sum + (l.powerKw || 0), 0)
              const solarRooftopLoads = busSolars.reduce(
                (sum, s) => sum + (s.id === item.id ? (item.loadKw || 0) : (s.loadKw || 0)),
                0
              )
              bus.loadKw = baseLoad + solarRooftopLoads
            }
          }
        }
      } else if (type === 'battery') {
        const item = updatedNetwork.batteries.find((b) => b.id === id)
        if (item) {
          if (editForm.name) item.name = editForm.name.trim()
          item.socPercent = Math.min(100, Math.max(0, Number(editForm.socPercent) || 0))
          item.powerKw = Number(editForm.powerKw) || 0
          if (editForm.capacityKwh !== undefined)
            item.capacityKwh = Math.max(1, Number(editForm.capacityKwh) || 100)
          if (editForm.maxDischargeKw !== undefined)
            item.maxDischargeKw = Math.max(0, Number(editForm.maxDischargeKw) || 50)
        }
      } else if (type === 'bus') {
        const item = updatedNetwork.buses.find((b) => b.id === id)
        if (item) {
          if (editForm.name) item.name = editForm.name.trim()
          item.voltage = Number(editForm.voltage) || 1.0
          item.voltageLimitMin = Number(editForm.voltageLimitMin) || 0.95
          item.voltageLimitMax = Number(editForm.voltageLimitMax) || 1.05
          item.loadKw = Math.max(0, Number(editForm.loadKw) || 0)
          item.solarKw = Math.max(0, Number(editForm.solarKw) || 0)
          item.status =
            item.voltage > item.voltageLimitMax || item.voltage < item.voltageLimitMin
              ? 'critical'
              : 'normal'
        }
      } else if (type === 'feeder') {
        const item = updatedNetwork.feeders.find((f) => f.id === id)
        if (item) {
          if (editForm.name) item.name = editForm.name.trim()
          item.capacityKw = Math.max(1, Number(editForm.capacityKw) || 500)
          item.activePowerKw = Math.max(0, Number(editForm.activePowerKw) || 0)
          item.loadingPercent = Math.round((item.activePowerKw / item.capacityKw) * 100)
          item.isSwitchClosed = Boolean(editForm.isSwitchClosed)
          item.status =
            item.loadingPercent > (item.loadingLimitPercent || 100)
              ? 'critical'
              : item.loadingPercent > 90
              ? 'warning'
              : 'normal'
        }
      } else if (type === 'transformer' || (type as string) === 'substation') {
        if (updatedNetwork.substation) {
          if (editForm.name) updatedNetwork.substation.name = editForm.name.trim()
          updatedNetwork.substation.ratingKva = Math.max(1, Number(editForm.ratingKva) || 2500)
          updatedNetwork.substation.loadingPercent = Math.min(
            100,
            Math.max(0, Number(editForm.loadingPercent) || 68)
          )
        }
      }

      // Persist to store & backend
      await updateNetwork(updatedNetwork)

      // Also propagate aggregate solar / load into simulationStore so simulation inputs stay synchronized
      const totalSolarSum = updatedNetwork.solarUnits.reduce((acc, s) => acc + (s.generationKw || 0), 0)
      const rooftopLoadSum = updatedNetwork.solarUnits.reduce(
        (acc, s) => acc + (s.isSolarRooftop || (s.loadKw && s.loadKw > 0) ? (s.loadKw || 0) : 0),
        0
      )
      const totalLoadSum = updatedNetwork.loads.reduce((acc, l) => acc + (l.powerKw || 0), 0) + rooftopLoadSum
      const simStore = useSimulationStore.getState()
      if (simStore && simStore.updateInput) {
        simStore.updateInput({
          installedSolarCapacityKw: Math.max(simStore.input.installedSolarCapacityKw, totalSolarSum),
          peakLoadKw: Math.max(simStore.input.peakLoadKw, totalLoadSum),
        })
      }

      setIsEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to update electrical parameters:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Quick selector dropdown value
  const activeSelectorValue = liveComponent ? `${liveComponent.type}:${liveComponent.id}` : ''

  const handleDropdownSelect = (val: string) => {
    if (!val) {
      setSelectedComponent(null)
      return
    }
    const [t, id] = val.split(':')
    if (t === 'bus') {
      const b = network.buses.find((i) => i.id === id)
      if (b) setSelectedComponent({ type: 'bus', id: b.id, data: b })
    } else if (t === 'feeder') {
      const f = network.feeders.find((i) => i.id === id)
      if (f) setSelectedComponent({ type: 'feeder', id: f.id, data: f })
    } else if (t === 'solar') {
      const s = network.solarUnits.find((i) => i.id === id)
      if (s) setSelectedComponent({ type: 'solar', id: s.id, data: s })
    } else if (t === 'battery') {
      const b = network.batteries.find((i) => i.id === id)
      if (b) setSelectedComponent({ type: 'battery', id: b.id, data: b })
    } else if (t === 'load') {
      const l = network.loads.find((i) => i.id === id)
      if (l) setSelectedComponent({ type: 'load', id: l.id, data: l })
    } else if (t === 'substation') {
      if (network.substation)
        setSelectedComponent({ type: 'transformer', id: 'GRID', data: network.substation })
    }
  }

  // Calculate live bus electrical telemetry
  const busData = useMemo(() => {
    if (!liveComponent || liveComponent.type !== 'bus') return null
    const b = liveComponent.data as Bus
    const connectedFeeders = network.feeders.filter((f) => f.fromBus === b.id || f.toBus === b.id)
    const connectedLoads = network.loads.filter((l) => l.busId === b.id)
    const connectedSolar = network.solarUnits.filter((s) => s.busId === b.id)
    const connectedBatteries = network.batteries.filter((bat) => bat.busId === b.id)

    const connectedSolarRooftopLoad = connectedSolar.reduce((sum, s) => sum + (s.loadKw || 0), 0)
    const demandKw =
      connectedLoads.length > 0 || connectedSolarRooftopLoad > 0
        ? connectedLoads.reduce((sum, l) => sum + (l.powerKw || 0), 0) + connectedSolarRooftopLoad
        : b.loadKw || 0

    const solarKw =
      connectedSolar.length > 0
        ? connectedSolar.reduce((sum, s) => sum + (s.generationKw || 0), 0)
        : b.solarKw || 0

    const netKw = solarKw - demandKw

    return {
      bus: b,
      connectedFeeders,
      connectedLoads,
      connectedSolar,
      connectedBatteries,
      demandKw,
      solarKw,
      netKw,
    }
  }, [liveComponent, network])

  const isConfiguratorMode = typeof window !== 'undefined' && window.location.pathname.startsWith('/network')

  return (
    <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md rounded-2xl shadow-xs transition-colors flex flex-col">
      <CardHeader
        title={
          <span className="font-bold text-sm text-[#10251A] dark:text-[#ECFDF3]">
            Component Inspector
          </span>
        }
        subtitle="Telemetry & Electrical Parameters"
        icon={<Sliders className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
        action={
          liveComponent ? (
            <div className="flex items-center gap-1.5">
              <Badge variant="primary" size="sm">
                {liveComponent.id}
              </Badge>
              <button
                type="button"
                onClick={() => setSelectedComponent(null)}
                className="text-[#788477] hover:text-red-600 dark:hover:text-red-400 p-0.5 rounded cursor-pointer"
                title="Deselect Component"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Badge variant="neutral" size="sm">
              Standby
            </Badge>
          )
        }
      />

      <CardContent className="space-y-3 pt-1 text-xs flex-1 flex flex-col">
        {/* Quick Component Selector Dropdown */}
        <div>
          <select
            value={activeSelectorValue}
            onChange={(e) => handleDropdownSelect(e.target.value)}
            className="w-full bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-lg text-xs py-2 px-3 text-[#26352A] dark:text-[#F2F5ED] font-medium focus:ring-2 focus:ring-[#A0C878] focus:outline-none transition-all cursor-pointer"
          >
            <option value="">-- Select Grid Component --</option>
            <optgroup label="Buses">
              {network.buses.map((b) => (
                <option key={b.id} value={`bus:${b.id}`}>
                  Bus {b.id} — {b.name} {!isConfiguratorMode ? `(${b.voltage?.toFixed(3) || '1.000'} pu)` : ''}
                </option>
              ))}
            </optgroup>
            <optgroup label="Feeders">
              {network.feeders.map((f) => (
                <option key={f.id} value={`feeder:${f.id}`}>
                  Feeder {f.id} — {f.fromBus} → {f.toBus} {!isConfiguratorMode ? `(${Math.round(f.loadingPercent || 0)}%)` : `(${f.capacityKw} kW)`}
                </option>
              ))}
            </optgroup>
            <optgroup label="Solar PV">
              {network.solarUnits.map((s) => (
                <option key={s.id} value={`solar:${s.id}`}>
                  Solar {s.id} — {s.name} ({s.generationKw} kW)
                </option>
              ))}
            </optgroup>
            <optgroup label="Battery Storage">
              {network.batteries.map((b) => (
                <option key={b.id} value={`battery:${b.id}`}>
                  BESS {b.id} — {b.name} ({b.socPercent}% SoC)
                </option>
              ))}
            </optgroup>
            <optgroup label="Loads">
              {network.loads.map((l) => (
                <option key={l.id} value={`load:${l.id}`}>
                  Load {l.id} — {l.name} ({l.powerKw} kW)
                </option>
              ))}
            </optgroup>
            {network.substation && (
              <optgroup label="Interconnect">
                <option value="substation:GRID">Substation — {network.substation.name}</option>
              </optgroup>
            )}
          </select>
        </div>

        {/* Selected Component Inspector */}
        {!liveComponent ? (
          <div className="py-8 px-4 text-center rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E]">
            <Cpu className="w-7 h-7 mx-auto mb-2 text-[#788477] dark:text-[#859483] opacity-70" />
            <div className="font-semibold text-xs text-[#26352A] dark:text-[#F2F5ED]">
              No Component Selected
            </div>
            <p className="text-[11px] text-[#788477] dark:text-[#859483] mt-1 max-w-[240px] mx-auto">
              Select a bus, solar unit, load, or feeder line to inspect and edit its electrical parameters.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Success notification banner */}
            {saveSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs flex items-center gap-2 text-emerald-800 dark:text-emerald-200 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  Electrical parameters updated and propagated across Digital Twin!
                </span>
              </div>
            )}

            {/* Section 1: Component Header Information */}
            <div className="border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('component')}
                className="w-full flex items-center justify-between px-3 py-2 text-left font-semibold text-xs text-[#26352A] dark:text-[#F2F5ED] hover:bg-[#DDEB9D]/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  {openSections.component ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#788477]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#788477]" />
                  )}
                  <span>Component Details</span>
                </div>
                <Badge
                  variant={
                    isConfiguratorMode
                      ? 'success'
                      : (liveComponent.data as any)?.status === 'critical'
                      ? 'danger'
                      : (liveComponent.data as any)?.status === 'warning'
                      ? 'warning'
                      : 'success'
                  }
                  size="sm"
                >
                  {isConfiguratorMode ? 'CONFIGURED' : (liveComponent.data as any)?.status?.toUpperCase() || 'NORMAL'}
                </Badge>
              </button>

              {openSections.component && (
                <div className="px-3 pb-3 pt-1 border-t border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#788477]">Name:</span>
                    <span className="font-semibold text-[#26352A] dark:text-[#F2F5ED] truncate max-w-[200px]">
                      {(liveComponent.data as any)?.name || liveComponent.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#788477]">Type:</span>
                    <span className="font-mono uppercase font-semibold text-[#506052] dark:text-[#A0B0A2] flex items-center gap-1.5">
                      {liveComponent.type === 'solar' && Boolean(
                        (liveComponent.data as SolarUnit).isSolarRooftop ||
                        (liveComponent.data as SolarUnit).name.toLowerCase().includes('rooftop') ||
                        (liveComponent.data as SolarUnit).name.toLowerCase().includes('solarrooftop')
                      ) && <SolarRooftopVillaSvg className="w-4 h-4 shrink-0" />}
                      {liveComponent.type === 'solar' && Boolean(
                        (liveComponent.data as SolarUnit).isSolarRooftop ||
                        (liveComponent.data as SolarUnit).name.toLowerCase().includes('rooftop') ||
                        (liveComponent.data as SolarUnit).name.toLowerCase().includes('solarrooftop')
                      ) ? 'SOLARROOFTOP' : liveComponent.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#788477]">ID:</span>
                    <span className="font-mono font-bold text-[#26352A] dark:text-[#F2F5ED]">
                      {liveComponent.id}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Electrical Data & Interactive Parameter Editing */}
            <div className="border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] overflow-hidden">
              <div className="w-full flex items-center justify-between px-3 py-2 border-b border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60">
                <button
                  type="button"
                  onClick={() => toggleSection('electrical')}
                  className="flex items-center gap-1.5 font-semibold text-xs text-[#26352A] dark:text-[#F2F5ED] hover:text-[#506052] cursor-pointer"
                >
                  {openSections.electrical ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#788477]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#788477]" />
                  )}
                  <span>Electrical Data</span>
                </button>

                {!isEditing ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    leftIcon={<Edit3 className="w-3 h-3 text-[#A0C878]" />}
                    className="text-[11px] py-0.5 px-2.5 h-6"
                  >
                    Edit Data
                  </Button>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleSaveElectrical}
                      disabled={isSaving}
                      leftIcon={<Save className="w-3 h-3" />}
                      className="text-[11px] py-0.5 px-2 h-6"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsEditing(false)}
                      leftIcon={<X className="w-3 h-3" />}
                      className="text-[11px] py-0.5 px-2 h-6"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {openSections.electrical && (
                <div className="p-3">
                  {/* EDIT MODE: Interactive Form Inputs */}
                  {isEditing ? (
                    <div className="space-y-2.5 animate-in fade-in duration-150">
                      <div>
                        <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                          Component Name
                        </label>
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                        />
                      </div>

                      {/* Load Edit Fields */}
                      {liveComponent.type === 'load' && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Active Load (kW)
                              </label>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={editForm.powerKw ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, powerKw: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono font-bold text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Power Factor
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.5"
                                max="1.0"
                                value={editForm.powerFactor ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, powerFactor: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-[#788477] italic">
                            * Updating this load will instantly recalculate branch demand on connected Bus.
                          </p>
                        </>
                      )}

                      {/* Solar Unit Edit Fields */}
                      {liveComponent.type === 'solar' && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Current Output (kW)
                              </label>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={editForm.generationKw ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, generationKw: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Installed Capacity (kW)
                              </label>
                              <input
                                type="number"
                                step="1"
                                min="1"
                                value={editForm.capacityKw ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, capacityKw: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                          </div>
                          {Boolean(
                            editForm.isSolarRooftop ||
                            (liveComponent.data as SolarUnit).isSolarRooftop ||
                            (liveComponent.data as SolarUnit).name.toLowerCase().includes('rooftop') ||
                            (liveComponent.data as SolarUnit).name.toLowerCase().includes('solarrooftop')
                          ) && (
                            <div className="mt-2">
                              <label className="text-[10px] text-[#0284C7] dark:text-[#38BDF8] block mb-0.5 font-semibold">
                                Household Load Demand (kW)
                              </label>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={editForm.loadKw ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, loadKw: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#38BDF8] rounded-md px-2.5 py-1 text-xs font-mono font-bold text-[#0284C7] dark:text-[#38BDF8] focus:ring-1 focus:ring-[#0284C7] focus:outline-none"
                              />
                            </div>
                          )}
                          <p className="text-[10px] text-[#788477] italic mt-1.5">
                            * Solarrooftop acts as dual asset: generation pushes solar power into grid while household load consumes power from bus.
                          </p>
                        </>
                      )}

                      {/* Battery Edit Fields */}
                      {liveComponent.type === 'battery' && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                State of Charge (%)
                              </label>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                max="100"
                                value={editForm.socPercent ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, socPercent: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Active Dispatch (kW)
                              </label>
                              <input
                                type="number"
                                step="1"
                                value={editForm.powerKw ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, powerKw: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Capacity (kWh)
                              </label>
                              <input
                                type="number"
                                step="1"
                                min="1"
                                value={editForm.capacityKwh ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, capacityKwh: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Max Discharge (kW)
                              </label>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={editForm.maxDischargeKw ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, maxDischargeKw: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Bus Edit Fields */}
                      {liveComponent.type === 'bus' && (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Voltage (pu)
                              </label>
                              <input
                                type="number"
                                step="0.001"
                                min="0.8"
                                max="1.2"
                                value={editForm.voltage ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, voltage: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono font-bold text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Min Limit (pu)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.voltageLimitMin ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, voltageLimitMin: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Max Limit (pu)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.voltageLimitMax ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, voltageLimitMax: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Direct Demand (kW)
                              </label>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={editForm.loadKw ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, loadKw: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Direct Solar (kW)
                              </label>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={editForm.solarKw ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, solarKw: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Feeder Edit Fields */}
                      {liveComponent.type === 'feeder' && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Capacity (kW)
                              </label>
                              <input
                                type="number"
                                step="10"
                                min="10"
                                value={editForm.capacityKw ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, capacityKw: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                                Power Flow (kW)
                              </label>
                              <input
                                type="number"
                                step="10"
                                min="0"
                                value={editForm.activePowerKw ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, activePowerKw: e.target.value })
                                }
                                className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="checkbox"
                              id="isSwitchClosed"
                              checked={Boolean(editForm.isSwitchClosed)}
                              onChange={(e) =>
                                setEditForm({ ...editForm, isSwitchClosed: e.target.checked })
                              }
                              className="rounded text-[#A0C878] focus:ring-[#A0C878]"
                            />
                            <label
                              htmlFor="isSwitchClosed"
                              className="text-xs text-[#26352A] dark:text-[#F2F5ED] cursor-pointer"
                            >
                              Line Switch Closed (In-Service)
                            </label>
                          </div>
                        </>
                      )}

                      {/* Transformer / Substation Edit */}
                      {(liveComponent.type === 'transformer' ||
                        (liveComponent.type as string) === 'substation') && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                              Rating (kVA)
                            </label>
                            <input
                              type="number"
                              step="50"
                              min="100"
                              value={editForm.ratingKva ?? ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, ratingKva: e.target.value })
                              }
                              className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#788477] block mb-0.5 font-medium">
                              Loading (%)
                            </label>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max="150"
                              value={editForm.loadingPercent ?? ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, loadingPercent: e.target.value })
                              }
                              className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2.5 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* READ-ONLY DISPLAY MODE: Accurate Live Telemetry */
                    <div className="space-y-2">
                      {/* Bus electrical data */}
                      {busData && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                            <span className="text-[10px] text-[#788477] block">Voltage</span>
                            <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                              {formatVoltage(busData.bus.voltage)}
                            </span>
                            <span className="text-[9px] text-[#788477] block mt-0.5">
                              Limits: {busData.bus.voltageLimitMin?.toFixed(2) ?? '0.95'} -{' '}
                              {busData.bus.voltageLimitMax?.toFixed(2) ?? '1.05'} pu
                            </span>
                          </div>
                          <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                            <span className="text-[10px] text-[#788477] block">Line Loading</span>
                            <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                              {formatPercent(busData.bus.lineLoadingPercent)}
                            </span>
                            <span className="text-[9px] text-[#788477] block mt-0.5">Limit: 100%</span>
                          </div>
                          <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                            <span className="text-[10px] text-[#788477] block">Branch Demand</span>
                            <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                              {busData.demandKw} kW
                            </span>
                            <span className="text-[9px] text-[#788477] block mt-0.5">
                              {busData.connectedLoads.length} Connected Loads
                            </span>
                          </div>
                          <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                            <span className="text-[10px] text-[#788477] block">Solar Infeed</span>
                            <span className="font-bold font-mono text-amber-600 dark:text-amber-400 text-sm">
                              {busData.solarKw} kW
                            </span>
                            <span className="text-[9px] text-[#788477] block mt-0.5">
                              {busData.connectedSolar.length} Solar PV Arrays
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Feeder electrical data */}
                      {liveComponent.type === 'feeder' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                            <span className="text-[10px] text-[#788477] block">Branch Loading</span>
                            <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                              {Math.round((liveComponent.data as Feeder).loadingPercent || 0)}%
                            </span>
                            <span className="text-[9px] text-[#788477] block mt-0.5">
                              Limit: {(liveComponent.data as Feeder).loadingLimitPercent ?? 100}%
                            </span>
                          </div>
                          <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                            <span className="text-[10px] text-[#788477] block">Active Power Flow</span>
                            <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                              {(liveComponent.data as Feeder).activePowerKw} kW
                            </span>
                            <span className="text-[9px] text-[#788477] block mt-0.5">
                              Capacity: {(liveComponent.data as Feeder).capacityKw} kW
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Solar electrical data */}
                      {liveComponent.type === 'solar' && (() => {
                        const s = liveComponent.data as SolarUnit
                        const isRooftop = Boolean(
                          s.isSolarRooftop ||
                          s.name.toLowerCase().includes('rooftop') ||
                          s.name.toLowerCase().includes('solarrooftop') ||
                          s.name.includes('[Rooftop]') ||
                          s.name.toLowerCase().includes('solar roof')
                        )
                        const netKw = (s.generationKw || 0) - (s.loadKw || 0)

                        return (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                              <span className="text-[10px] text-[#788477] block">Solar Generation</span>
                              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                                +{s.generationKw} kW
                              </span>
                              <span className="text-[9px] text-[#788477] block mt-0.5">
                                Capacity: {s.capacityKw} kW
                              </span>
                            </div>

                            {isRooftop ? (
                              <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                                <span className="text-[10px] text-[#0284C7] dark:text-[#38BDF8] block font-semibold">Household Demand</span>
                                <span className="font-bold font-mono text-blue-600 dark:text-blue-400 text-sm">
                                  -{s.loadKw ?? 0} kW
                                </span>
                                <span className="text-[9px] text-[#788477] block mt-0.5 font-mono">
                                  Net: {netKw >= 0 ? `+${netKw}` : netKw} kW {netKw >= 0 ? '(Export)' : '(Import)'}
                                </span>
                              </div>
                            ) : (
                              <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                                <span className="text-[10px] text-[#788477] block">Installed Capacity</span>
                                <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                                  {s.capacityKw} kW
                                </span>
                                <span className="text-[9px] text-[#788477] block mt-0.5">
                                  Irradiance: {s.irradianceWm2 ?? 800} W/m²
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* Battery electrical data */}
                      {liveComponent.type === 'battery' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                            <span className="text-[10px] text-[#788477] block">State of Charge</span>
                            <span className="font-bold font-mono text-[#A0C878] text-sm">
                              {(liveComponent.data as Battery).socPercent}% SoC
                            </span>
                            <span className="text-[9px] text-[#788477] block mt-0.5">
                              Capacity: {(liveComponent.data as Battery).capacityKwh ?? 100} kWh
                            </span>
                          </div>
                          <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                            <span className="text-[10px] text-[#788477] block">Active Dispatch</span>
                            <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                              {(liveComponent.data as Battery).powerKw} kW
                            </span>
                            <span className="text-[9px] text-[#788477] block mt-0.5">
                              Max Discharge: {(liveComponent.data as Battery).maxDischargeKw ?? 50} kW
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Load electrical data */}
                      {liveComponent.type === 'load' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                            <span className="text-[10px] text-[#788477] block">Active Demand</span>
                            <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                              {(liveComponent.data as Load).powerKw} kW
                            </span>
                            <span className="text-[9px] text-[#788477] block mt-0.5">
                              Category: {(liveComponent.data as any).category || 'Consumer Load'}
                            </span>
                          </div>
                          <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                            <span className="text-[10px] text-[#788477] block">Power Factor</span>
                            <span className="font-bold font-mono text-[#506052] dark:text-[#A0B0A2] text-sm">
                              {(liveComponent.data as Load).powerFactor?.toFixed(2) ?? '0.92'}
                            </span>
                            <span className="text-[9px] text-[#788477] block mt-0.5">
                              Reactive: ~
                              {Math.round(
                                ((liveComponent.data as Load).powerKw || 0) * 0.35
                              )}{' '}
                              kvar
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Substation */}
                      {(liveComponent.type === 'transformer' ||
                        (liveComponent.type as string) === 'substation') && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                            <span className="text-[10px] text-[#788477] block">Transformer Rating</span>
                            <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                              {network.substation?.ratingKva ?? 2500} kVA
                            </span>
                            <span className="text-[9px] text-[#788477] block mt-0.5">33/11 kV Step-Down</span>
                          </div>
                          <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                            <span className="text-[10px] text-[#788477] block">Loading</span>
                            <span className="font-bold font-mono text-[#A0C878] text-sm">
                              {network.substation?.loadingPercent ?? 68.4}%
                            </span>
                            <span className="text-[9px] text-[#788477] block mt-0.5">Limit: 100%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: Connections */}
            <div className="border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('connections')}
                className="w-full flex items-center justify-between px-3 py-2 text-left font-semibold text-xs text-[#26352A] dark:text-[#F2F5ED] hover:bg-[#DDEB9D]/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  {openSections.connections ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#788477]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#788477]" />
                  )}
                  <span>Connections</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#A0C878] font-medium">
                  <CheckCircle2 className="w-3 h-3" /> In-Service
                </div>
              </button>

              {openSections.connections && (
                <div className="px-3 pb-3 pt-1 border-t border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60 space-y-2">
                  {/* Solar / Battery / Load bus connection */}
                  {(liveComponent.type === 'solar' ||
                    liveComponent.type === 'battery' ||
                    liveComponent.type === 'load') && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#788477]">Connected Bus:</span>
                        <span className="font-semibold font-mono text-[#26352A] dark:text-[#F2F5ED]">
                          {(liveComponent.data as any)?.busId || 'Unassigned'}
                        </span>
                      </div>
                      {showConnectPicker ? (
                        <div className="pt-1 space-y-1">
                          <span className="text-[10px] text-[#788477]">Select Target Bus:</span>
                          <select
                            onChange={(e) => handleReassignBus(e.target.value)}
                            value={(liveComponent.data as any)?.busId || ''}
                            className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2 py-1 text-xs text-[#26352A] dark:text-[#F2F5ED]"
                          >
                            <option value="">-- Reassign Bus --</option>
                            {network.buses.map((b) => (
                              <option key={b.id} value={b.id}>
                                Bus {b.id} ({b.name})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Feeder line connections */}
                  {liveComponent.type === 'feeder' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#788477]">Branch Path:</span>
                        <span className="font-mono font-semibold text-[#26352A] dark:text-[#F2F5ED]">
                          {(liveComponent.data as Feeder).fromBus} → {(liveComponent.data as Feeder).toBus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#788477]">Line Switch:</span>
                        <span className="font-semibold text-[#26352A] dark:text-[#F2F5ED]">
                          {(liveComponent.data as Feeder).isSwitchClosed
                            ? 'Closed (In-Service)'
                            : 'Open (Isolated)'}
                        </span>
                      </div>
                      {(liveComponent.data as Feeder).isReconfigurableAlternate && (
                        <div className="pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleToggleSwitch}
                            className="w-full text-[11px]"
                          >
                            Toggle Tie-Line Switch
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bus node connections */}
                  {busData && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#788477]">Connected Feeders:</span>
                        <span className="font-mono font-semibold text-[#26352A] dark:text-[#F2F5ED] truncate max-w-[190px]">
                          {busData.connectedFeeders.map((f) => f.id).join(', ') || 'Radial'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#788477]">Branch Feeders:</span>
                        <span className="text-[#506052] dark:text-[#A0B0A2] font-semibold">
                          {busData.connectedFeeders.length} Active Lines
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#788477]">Connected Assets:</span>
                        <span className="text-[#506052] dark:text-[#A0B0A2] font-medium text-[11px]">
                          {busData.connectedLoads.length} Loads • {busData.connectedSolar.length} Solar •{' '}
                          {busData.connectedBatteries.length} BESS
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ComponentDetailsPanel
