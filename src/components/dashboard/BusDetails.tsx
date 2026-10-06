import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useSelectedComponent } from '../../hooks/useSelectedComponent'
import { useGridStore } from '../../store/gridStore'
import { useUIStore } from '../../store/uiStore'
import { Bus, Feeder, SolarUnit, Battery, Load, ComponentSelection, GridNetwork } from '../../types/network'
import {
  Zap,
  Activity,
  Cpu,
  Sun,
  BatteryMedium,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Move,
  Link2,
  Trash2,
  Sliders,
  CheckCircle2,
} from 'lucide-react'
import { formatVoltage, formatPercent, formatTemp } from '../../utils/formatters'

export const ComponentDetailsPanel: React.FC = () => {
  const { selectedComponent, setSelectedComponent } = useSelectedComponent()
  const { network, updateNetwork, removeComponent } = useGridStore()
  const { is3DEnabled, toggle3D } = useUIStore()

  // Collapsible section states (open by default for fast scanning)
  const [openSections, setOpenSections] = useState({
    component: true,
    position: true,
    connections: true,
    electrical: true,
    actions: true,
  })

  // Local coordinate state for real-time inspector editing
  const [coords, setCoords] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [showConnectPicker, setShowConnectPicker] = useState(false)

  // Synchronize coordinates whenever selected component changes
  useEffect(() => {
    setDeleteConfirm(false)
    setShowConnectPicker(false)

    if (!selectedComponent) return

    const { type, data } = selectedComponent
    let next: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }

    if (type === 'bus') {
      const b = data as Bus
      next = { x: b.position?.x ?? 0, y: b.position?.y ?? 0.6, z: b.position?.z ?? 0 }
    } else if (type === 'solar') {
      const s = data as SolarUnit
      next = { x: s.position?.x ?? 0, y: s.position?.y ?? 0, z: s.position?.z ?? 0 }
    } else if (type === 'battery') {
      const b = data as Battery
      next = { x: b.position?.x ?? 0, y: b.position?.y ?? 0, z: b.position?.z ?? 0 }
    } else if (type === 'load') {
      const l = data as Load
      next = { x: l.position?.x ?? 0, y: l.position?.y ?? 0, z: l.position?.z ?? 0 }
    } else if (type === 'transformer' || type === 'substation') {
      const sub = network.substation
      next = { x: sub?.position?.x ?? 0, y: sub?.position?.y ?? 0.6, z: sub?.position?.z ?? -10 }
    }

    setCoords((prev) => {
      if (prev.x === next.x && prev.y === next.y && prev.z === next.z) return prev
      return next
    })
  }, [selectedComponent?.type, selectedComponent?.id, network.substation?.position?.x, network.substation?.position?.y, network.substation?.position?.z])

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Update position in grid store and synchronise digital twin
  const handlePositionChange = async (axis: 'x' | 'y' | 'z', val: number) => {
    const nextCoords = { ...coords, [axis]: val }
    setCoords(nextCoords)

    if (!selectedComponent) return
    const updatedNetwork = JSON.parse(JSON.stringify(network)) as GridNetwork
    const { type, id } = selectedComponent

    if (type === 'bus') {
      const b = updatedNetwork.buses.find((i) => i.id === id)
      if (b) b.position = nextCoords
    } else if (type === 'solar') {
      const s = updatedNetwork.solarUnits.find((i) => i.id === id)
      if (s) s.position = nextCoords
    } else if (type === 'battery') {
      const b = updatedNetwork.batteries.find((i) => i.id === id)
      if (b) b.position = nextCoords
    } else if (type === 'load') {
      const l = updatedNetwork.loads.find((i) => i.id === id)
      if (l) l.position = nextCoords
    } else if (type === 'transformer' || type === 'substation') {
      if (updatedNetwork.substation) updatedNetwork.substation.position = nextCoords
    }

    try {
      await updateNetwork(updatedNetwork)
    } catch (e) {
      console.error('Failed to update component position:', e)
    }
  }

  // Quick connect / reassign component to target bus
  const handleReassignBus = async (targetBusId: string) => {
    if (!selectedComponent) return
    const updatedNetwork = JSON.parse(JSON.stringify(network)) as GridNetwork
    const { type, id } = selectedComponent

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
    if (!selectedComponent || selectedComponent.type !== 'feeder') return
    const updatedNetwork = JSON.parse(JSON.stringify(network)) as GridNetwork
    const f = updatedNetwork.feeders.find((i) => i.id === selectedComponent.id)
    if (f) {
      f.isSwitchClosed = !f.isSwitchClosed
      f.status = f.isSwitchClosed ? 'normal' : 'warning'
      await updateNetwork(updatedNetwork)
    }
  }

  // Move action: toggles 3D mode if needed and highlights position
  const handleMoveAction = () => {
    if (!is3DEnabled) {
      toggle3D()
    }
    setOpenSections((prev) => ({ ...prev, position: true }))
  }

  // Delete component from topology
  const handleDeleteComponent = async () => {
    if (!selectedComponent) return
    await removeComponent(selectedComponent.type, selectedComponent.id)
    setSelectedComponent(null)
    setDeleteConfirm(false)
  }

  // Quick selector dropdown value
  const activeSelectorValue = selectedComponent ? `${selectedComponent.type}:${selectedComponent.id}` : ''

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
      if (network.substation) setSelectedComponent({ type: 'transformer', id: 'GRID', data: network.substation })
    }
  }

  return (
    <Card className="h-full border-[#DDD9C9] dark:border-[#2C3C2E] shadow-sm">
      <CardHeader
        title={<span className="font-semibold text-sm text-[#26352A] dark:text-[#F2F5ED]">Component Management</span>}
        subtitle="Control-room engineering inspector"
        icon={<Sliders className="w-4 h-4 text-[#A0C878]" />}
        action={
          selectedComponent ? (
            <Badge variant="primary" size="sm">
              {selectedComponent.id}
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              Standby
            </Badge>
          )
        }
      />

      <CardContent className="space-y-3.5 pt-1 text-xs">
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
                  Bus {b.id} — {b.name} ({b.voltage?.toFixed(3) || '1.000'} pu)
                </option>
              ))}
            </optgroup>
            <optgroup label="Feeders">
              {network.feeders.map((f) => (
                <option key={f.id} value={`feeder:${f.id}`}>
                  Feeder {f.id} — {f.fromBus} → {f.toBus} ({Math.round(f.loadingPercent || 0)}%)
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
        {!selectedComponent ? (
          <div className="py-8 px-4 text-center rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E]">
            <Cpu className="w-7 h-7 mx-auto mb-2 text-[#788477] dark:text-[#859483] opacity-70" />
            <div className="font-semibold text-xs text-[#26352A] dark:text-[#F2F5ED]">No Component Selected</div>
            <p className="text-[11px] text-[#788477] dark:text-[#859483] mt-1 max-w-[240px] mx-auto">
              Select a component from the list or click a node on the digital twin schematic.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Section 1: Component Information */}
            <div className="border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('component')}
                className="w-full flex items-center justify-between px-3 py-2 text-left font-semibold text-xs text-[#26352A] dark:text-[#F2F5ED] hover:bg-[#DDEB9D]/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  {openSections.component ? <ChevronDown className="w-3.5 h-3.5 text-[#788477]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#788477]" />}
                  <span>Component</span>
                </div>
                <Badge
                  variant={
                    (selectedComponent.data as any)?.status === 'critical'
                      ? 'danger'
                      : (selectedComponent.data as any)?.status === 'warning'
                      ? 'warning'
                      : 'success'
                  }
                  size="sm"
                >
                  {(selectedComponent.data as any)?.status?.toUpperCase() || 'NORMAL'}
                </Badge>
              </button>

              {openSections.component && (
                <div className="px-3 pb-3 pt-1 border-t border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#788477]">Name:</span>
                    <span className="font-semibold text-[#26352A] dark:text-[#F2F5ED]">{(selectedComponent.data as any)?.name || selectedComponent.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#788477]">Type:</span>
                    <span className="font-mono uppercase font-semibold text-[#506052] dark:text-[#A0B0A2]">{selectedComponent.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#788477]">ID:</span>
                    <span className="font-mono text-[#26352A] dark:text-[#F2F5ED]">{selectedComponent.id}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Position (Compact X, Y, Z controls) */}
            {selectedComponent.type !== 'feeder' && (
              <div className="border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('position')}
                  className="w-full flex items-center justify-between px-3 py-2 text-left font-semibold text-xs text-[#26352A] dark:text-[#F2F5ED] hover:bg-[#DDEB9D]/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    {openSections.position ? <ChevronDown className="w-3.5 h-3.5 text-[#788477]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#788477]" />}
                    <span>Position</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#788477]">
                    [{coords.x.toFixed(1)}, {coords.y.toFixed(1)}, {coords.z.toFixed(1)}]
                  </span>
                </button>

                {openSections.position && (
                  <div className="px-3 pb-3 pt-1 border-t border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-[#788477] block mb-0.5 font-medium">X (m)</span>
                        <input
                          type="number"
                          step="0.5"
                          value={coords.x}
                          onChange={(e) => handlePositionChange('x', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#788477] block mb-0.5 font-medium">Y (m)</span>
                        <input
                          type="number"
                          step="0.5"
                          value={coords.y}
                          onChange={(e) => handlePositionChange('y', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#788477] block mb-0.5 font-medium">Z (m)</span>
                        <input
                          type="number"
                          step="0.5"
                          value={coords.z}
                          onChange={(e) => handlePositionChange('z', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2 py-1 text-xs font-mono text-[#26352A] dark:text-[#F2F5ED] focus:ring-1 focus:ring-[#A0C878] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 3: Connections */}
            <div className="border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('connections')}
                className="w-full flex items-center justify-between px-3 py-2 text-left font-semibold text-xs text-[#26352A] dark:text-[#F2F5ED] hover:bg-[#DDEB9D]/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  {openSections.connections ? <ChevronDown className="w-3.5 h-3.5 text-[#788477]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#788477]" />}
                  <span>Connections</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#A0C878] font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </div>
              </button>

              {openSections.connections && (
                <div className="px-3 pb-3 pt-1 border-t border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60 space-y-2">
                  {/* Solar / Battery / Load bus connection */}
                  {(selectedComponent.type === 'solar' || selectedComponent.type === 'battery' || selectedComponent.type === 'load') && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#788477]">Connected Bus:</span>
                        <span className="font-semibold font-mono text-[#26352A] dark:text-[#F2F5ED]">
                          {(selectedComponent.data as any)?.busId || 'Unassigned'}
                        </span>
                      </div>
                      {showConnectPicker ? (
                        <div className="pt-1 space-y-1">
                          <span className="text-[10px] text-[#788477]">Select Target Bus:</span>
                          <select
                            onChange={(e) => handleReassignBus(e.target.value)}
                            value={(selectedComponent.data as any)?.busId || ''}
                            className="w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-md px-2 py-1 text-xs text-[#26352A] dark:text-[#F2F5ED]"
                          >
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
                  {selectedComponent.type === 'feeder' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#788477]">Branch Path:</span>
                        <span className="font-mono font-semibold text-[#26352A] dark:text-[#F2F5ED]">
                          {(selectedComponent.data as Feeder).fromBus} → {(selectedComponent.data as Feeder).toBus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#788477]">Line Switch:</span>
                        <span className="font-semibold text-[#26352A] dark:text-[#F2F5ED]">
                          {(selectedComponent.data as Feeder).isSwitchClosed ? 'Closed (In-Service)' : 'Open (Isolated)'}
                        </span>
                      </div>
                      {(selectedComponent.data as Feeder).isReconfigurableAlternate && (
                        <div className="pt-1">
                          <Button size="sm" variant="outline" onClick={handleToggleSwitch} className="w-full text-[11px]">
                            Toggle Tie-Line Switch
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bus node connections */}
                  {selectedComponent.type === 'bus' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#788477]">Connected Lines:</span>
                        <span className="font-mono font-semibold text-[#26352A] dark:text-[#F2F5ED]">
                          {(selectedComponent.data as Bus).connectedFeeders?.join(', ') || 'Radial'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#788477]">Branch Feeders:</span>
                        <span className="text-[#506052] dark:text-[#A0B0A2]">
                          {network.feeders.filter((f) => f.fromBus === selectedComponent.id || f.toBus === selectedComponent.id).length} Active Branches
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 4: Electrical Data */}
            <div className="border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('electrical')}
                className="w-full flex items-center justify-between px-3 py-2 text-left font-semibold text-xs text-[#26352A] dark:text-[#F2F5ED] hover:bg-[#DDEB9D]/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  {openSections.electrical ? <ChevronDown className="w-3.5 h-3.5 text-[#788477]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#788477]" />}
                  <span>Electrical Data</span>
                </div>
              </button>

              {openSections.electrical && (
                <div className="px-3 pb-3 pt-1 border-t border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60">
                  {/* Bus electrical data */}
                  {selectedComponent.type === 'bus' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">Voltage</span>
                        <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                          {formatVoltage((selectedComponent.data as Bus).voltage)}
                        </span>
                        <span className="text-[9px] text-[#788477] block mt-0.5">Limit: {(selectedComponent.data as Bus).voltageLimitMax?.toFixed(2) ?? '1.05'} pu</span>
                      </div>
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">Line Loading</span>
                        <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                          {formatPercent((selectedComponent.data as Bus).lineLoadingPercent)}
                        </span>
                        <span className="text-[9px] text-[#788477] block mt-0.5">Limit: 100%</span>
                      </div>
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">Branch Demand</span>
                        <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED]">
                          {(selectedComponent.data as Bus).loadKw} kW
                        </span>
                      </div>
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">Solar Infeed</span>
                        <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                          {(selectedComponent.data as Bus).solarKw} kW
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Feeder electrical data */}
                  {selectedComponent.type === 'feeder' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">Branch Loading</span>
                        <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                          {Math.round((selectedComponent.data as Feeder).loadingPercent || 0)}%
                        </span>
                        <span className="text-[9px] text-[#788477] block mt-0.5">Limit: {(selectedComponent.data as Feeder).loadingLimitPercent}%</span>
                      </div>
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">Active Power Flow</span>
                        <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                          {(selectedComponent.data as Feeder).activePowerKw} kW
                        </span>
                        <span className="text-[9px] text-[#788477] block mt-0.5">Capacity: {(selectedComponent.data as Feeder).capacityKw} kW</span>
                      </div>
                    </div>
                  )}

                  {/* Solar electrical data */}
                  {selectedComponent.type === 'solar' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">Output Generation</span>
                        <span className="font-bold font-mono text-amber-600 dark:text-amber-400 text-sm">
                          {(selectedComponent.data as SolarUnit).generationKw} kW
                        </span>
                      </div>
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">Installed Capacity</span>
                        <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                          {(selectedComponent.data as SolarUnit).capacityKw} kW
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Battery electrical data */}
                  {selectedComponent.type === 'battery' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">State of Charge</span>
                        <span className="font-bold font-mono text-[#A0C878] text-sm">
                          {(selectedComponent.data as Battery).socPercent}% SoC
                        </span>
                      </div>
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">Active Dispatch</span>
                        <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                          {(selectedComponent.data as Battery).powerKw} kW
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Load electrical data */}
                  {selectedComponent.type === 'load' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">Active Demand</span>
                        <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] text-sm">
                          {(selectedComponent.data as Load).powerKw} kW
                        </span>
                      </div>
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">Power Factor</span>
                        <span className="font-bold font-mono text-[#506052] dark:text-[#A0B0A2] text-sm">
                          {(selectedComponent.data as Load).powerFactor.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Substation */}
                  {selectedComponent.type === 'transformer' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">Rating</span>
                        <span className="font-bold font-mono text-[#26352A] dark:text-[#F2F5ED]">2500 kVA</span>
                      </div>
                      <div className="p-2 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                        <span className="text-[10px] text-[#788477] block">Loading</span>
                        <span className="font-bold font-mono text-[#A0C878]">68.4%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 5: Actions ([ Move ] [ Connect ] [ Delete ]) */}
            <div className="border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('actions')}
                className="w-full flex items-center justify-between px-3 py-2 text-left font-semibold text-xs text-[#26352A] dark:text-[#F2F5ED] hover:bg-[#DDEB9D]/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  {openSections.actions ? <ChevronDown className="w-3.5 h-3.5 text-[#788477]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#788477]" />}
                  <span>Actions</span>
                </div>
              </button>

              {openSections.actions && (
                <div className="px-3 pb-3 pt-1 border-t border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleMoveAction}
                      leftIcon={<Move className="w-3.5 h-3.5" />}
                      className="flex-1 text-xs"
                      title="Adjust position in digital twin coordinate space"
                    >
                      Move
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowConnectPicker(!showConnectPicker)}
                      leftIcon={<Link2 className="w-3.5 h-3.5" />}
                      className="flex-1 text-xs"
                      title="Reassign or verify bus connection"
                    >
                      Connect
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setDeleteConfirm(true)}
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      className="text-xs"
                      title="Remove component from network model"
                    >
                      Delete
                    </Button>
                  </div>

                  {deleteConfirm && (
                    <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900/80 text-xs mt-2">
                      <div className="font-semibold text-red-900 dark:text-red-200">
                        Remove {selectedComponent.id}?
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="danger" onClick={handleDeleteComponent} className="flex-1 py-1">
                          Confirm
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(false)} className="flex-1 py-1">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedComponent(null)}
                      className="w-full text-center text-[11px] text-[#788477] hover:text-[#26352A] dark:hover:text-[#F2F5ED] underline cursor-pointer"
                    >
                      Deselect
                    </button>
                  </div>
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
