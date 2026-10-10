import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import {
  Settings,
  Plus,
  Trash,
  Copy,
  Zap,
  Sun,
  BatteryMedium,
  Building,
  Box,
  AlertTriangle,
  GitBranch,
  Database,
} from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { useUIStore } from '../../store/uiStore'
import { gridService } from '../../services/api/gridService'
import { GridNetwork, Bus, Feeder, SolarUnit, Battery, Load } from '../../types/network'

export const GridManagerPanel: React.FC = () => {
  const { network, switchGrid, createGrid, deleteGrid, addComponent, removeComponent, setSelectedComponent, selectedComponent } = useGridStore()
  const { is3DEnabled, toggle3D } = useUIStore()

  const [grids, setGrids] = useState<GridNetwork[]>([])
  const [isLoadingGrids, setIsLoadingGrids] = useState(false)
  const [activeModal, setActiveModal] = useState<
    'new-grid' | 'bus' | 'feeder' | 'solar' | 'battery' | 'load' | 'delete-grid' | null
  >(null)
  const [showComponentList, setShowComponentList] = useState(false)

  // New Grid Form State
  const [newGridName, setNewGridName] = useState('')
  const [newGridTemplate, setNewGridTemplate] = useState<'clone' | 'starter' | 'empty'>('clone')

  // Form states for adding components
  const [busForm, setBusForm] = useState({
    id: '',
    name: '',
    voltage: 1.0,
    voltageLimitMin: 0.95,
    voltageLimitMax: 1.05,
    loadKw: 0,
    solarKw: 0,
  })

  const [feederForm, setFeederForm] = useState({
    id: '',
    name: '',
    fromBus: '',
    toBus: '',
    capacityKw: 600,
    isSwitchClosed: true,
  })

  const [solarForm, setSolarForm] = useState({
    id: '',
    name: '',
    busId: '',
    capacityKw: 100,
    generationKw: 80,
    type: 'utility',
  })

  const [batteryForm, setBatteryForm] = useState({
    id: '',
    name: '',
    busId: '',
    capacityKwh: 100,
    maxDischargeKw: 50,
    maxChargeKw: 50,
    socPercent: 60,
  })

  const [loadForm, setLoadForm] = useState({
    id: '',
    name: '',
    busId: '',
    powerKw: 60,
    powerFactor: 0.92,
    category: 'Commercial',
  })

  const refreshGrids = async () => {
    setIsLoadingGrids(true)
    try {
      const list = await gridService.getGrids()
      setGrids(list)
    } catch (e) {
      console.error('Failed to load grids list', e)
    } finally {
      setIsLoadingGrids(false)
    }
  }

  useEffect(() => {
    refreshGrids()
  }, [network.id])

  const handleSelectGrid = async (id: string) => {
    if (!id || id === network.id) return
    await switchGrid(id)
    await refreshGrids()
  }

  const handleOpenNewGridModal = () => {
    setNewGridName(`Custom Grid ${grids.length + 1}`)
    setNewGridTemplate('clone')
    setActiveModal('new-grid')
  }

  const handleConfirmCreateGrid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGridName.trim()) return
    await createGrid(newGridName, newGridTemplate)
    await refreshGrids()
    setActiveModal(null)
  }

  const handleCloneCurrentGrid = async () => {
    const cloneName = `${network.name} (Copy)`
    await createGrid(cloneName, 'clone')
    await refreshGrids()
  }

  const handleConfirmDeleteGrid = async () => {
    if (network.id === 'default-grid') return
    await deleteGrid(network.id)
    await refreshGrids()
    setActiveModal(null)
  }

  // Open Component Modals with smart auto-generated IDs
  const openAddBus = () => {
    const nextId = `B${network.buses.length + 1}`
    setBusForm({
      id: nextId,
      name: `Bus ${network.buses.length + 1}`,
      voltage: 1.0,
      voltageLimitMin: 0.95,
      voltageLimitMax: 1.05,
      loadKw: 0,
      solarKw: 0,
    })
    setActiveModal('bus')
  }

  const openAddFeeder = () => {
    const nextId = `F-0${network.feeders.length + 1}`
    const firstBus = network.buses[0]?.id || ''
    const secondBus = network.buses[1]?.id || network.substation?.id || ''
    setFeederForm({
      id: nextId,
      name: `Feeder Line ${network.feeders.length + 1}`,
      fromBus: firstBus,
      toBus: secondBus,
      capacityKw: 500,
      isSwitchClosed: true,
    })
    setActiveModal('feeder')
  }

  const openAddSolar = () => {
    const nextId = `SOLAR-0${network.solarUnits.length + 1}`
    setSolarForm({
      id: nextId,
      name: `Solar Array ${network.solarUnits.length + 1}`,
      busId: network.buses[0]?.id || '',
      capacityKw: 100,
      generationKw: 80,
      type: 'utility',
    })
    setActiveModal('solar')
  }

  const openAddBattery = () => {
    const nextId = `BAT-0${network.batteries.length + 1}`
    setBatteryForm({
      id: nextId,
      name: `BESS Unit ${network.batteries.length + 1}`,
      busId: network.buses[0]?.id || '',
      capacityKwh: 100,
      maxDischargeKw: 50,
      maxChargeKw: 50,
      socPercent: 60,
    })
    setActiveModal('battery')
  }

  const openAddLoad = () => {
    const nextId = `LOAD-0${network.loads.length + 1}`
    setLoadForm({
      id: nextId,
      name: `Load Center ${network.loads.length + 1}`,
      busId: network.buses[0]?.id || '',
      powerKw: 60,
      powerFactor: 0.92,
      category: 'Commercial',
    })
    setActiveModal('load')
  }

  // Submission handlers
  const handleSaveBus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!busForm.id) return
    const newBus: Bus = {
      id: busForm.id.trim(),
      name: busForm.name.trim() || busForm.id,
      voltage: Number(busForm.voltage) || 1.0,
      voltageLimitMin: Number(busForm.voltageLimitMin) || 0.95,
      voltageLimitMax: Number(busForm.voltageLimitMax) || 1.05,
      loadKw: Number(busForm.loadKw) || 0,
      solarKw: Number(busForm.solarKw) || 0,
      lineLoadingPercent: 0,
      temperatureC: 30,
      status: 'normal',
      connectedFeeders: [],
      connectedAssets: {},
      position: { x: (network.buses.length % 5) * 4 - 8, y: 0, z: Math.floor(network.buses.length / 5) * 6 },
    }
    await addComponent('bus', newBus)
    setActiveModal(null)
  }

  const handleSaveFeeder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feederForm.id || !feederForm.fromBus || !feederForm.toBus) return
    const newFeeder: Feeder = {
      id: feederForm.id.trim(),
      name: feederForm.name.trim() || `Feeder ${feederForm.fromBus}-${feederForm.toBus}`,
      fromBus: feederForm.fromBus,
      toBus: feederForm.toBus,
      loadingPercent: 0,
      loadingLimitPercent: 100,
      capacityKw: Number(feederForm.capacityKw) || 500,
      activePowerKw: 0,
      reactivePowerKvar: 0,
      status: 'normal',
      isSwitchClosed: feederForm.isSwitchClosed,
    }
    await addComponent('feeder', newFeeder)
    setActiveModal(null)
  }

  const handleSaveSolar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!solarForm.id || !solarForm.busId) return
    const newSolar: SolarUnit = {
      id: solarForm.id.trim(),
      name: `${solarForm.type === 'rooftop' ? '[Rooftop]' : '[Utility]'} ${solarForm.name.trim() || solarForm.id}`,
      busId: solarForm.busId,
      generationKw: Number(solarForm.generationKw) || 0,
      capacityKw: Number(solarForm.capacityKw) || 100,
      irradianceWm2: 800,
      curtailedKw: 0,
      status: 'normal',
      position: { x: -6, y: 0, z: (network.solarUnits.length % 4) * 4 },
    }
    await addComponent('solar', newSolar)
    setActiveModal(null)
  }

  const handleSaveBattery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!batteryForm.id || !batteryForm.busId) return
    const newBattery: Battery = {
      id: batteryForm.id.trim(),
      name: batteryForm.name.trim() || batteryForm.id,
      busId: batteryForm.busId,
      powerKw: 0,
      maxDischargeKw: Number(batteryForm.maxDischargeKw) || 50,
      maxChargeKw: Number(batteryForm.maxChargeKw) || 50,
      socPercent: Number(batteryForm.socPercent) || 60,
      capacityKwh: Number(batteryForm.capacityKwh) || 100,
      status: 'normal',
      cycleCount: 120,
      position: { x: -6, y: 0, z: 6 + network.batteries.length * 3 },
    }
    await addComponent('battery', newBattery)
    setActiveModal(null)
  }

  const handleSaveLoad = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loadForm.id || !loadForm.busId) return
    const newLoad: Load = {
      id: loadForm.id.trim(),
      name: `[${loadForm.category}] ${loadForm.name.trim() || loadForm.id}`,
      busId: loadForm.busId,
      powerKw: Number(loadForm.powerKw) || 60,
      powerFactor: Number(loadForm.powerFactor) || 0.92,
      status: 'normal',
      position: { x: 6, y: 0, z: network.loads.length * 4 },
    }
    await addComponent('load', newLoad)
    setActiveModal(null)
  }

  // Calculated grid stats
  const totalSolarKw = network.solarUnits.reduce((acc, s) => acc + (s.generationKw || 0), 0)
  const totalBatteryKwh = network.batteries.reduce((acc, b) => acc + (b.capacityKwh || 0), 0)
  const totalLoadKw = network.loads.reduce((acc, l) => acc + (l.powerKw || 0), 0)

  return (
    <Card className="overflow-hidden border-[#DDD9C9] dark:border-[#2A3A2C] shadow-sm">
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[#26352A] dark:text-[#E8F0E6]">Grid Manager</span>
            <span className="w-2 h-2 rounded-full bg-[#A0C878] animate-pulse" title="Grid Active" />
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/80">
              <Database className="w-2.5 h-2.5" />
              DB Synced
            </span>
          </div>
        }
        subtitle="Model topologies & sandbox"
        icon={<Settings className="w-4 h-4 text-[#A0C878]" />}
        action={
          <Badge variant={network.id === 'default-grid' ? 'neutral' : 'primary'} size="sm">
            {network.id}
          </Badge>
        }
      />

      <CardContent className="space-y-4 pt-1">
        {/* Row 1: Grid Selector & Core Grid Operations */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={network.id}
            onChange={(e) => handleSelectGrid(e.target.value)}
            disabled={isLoadingGrids}
            className="flex-1 min-w-0 bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2A3A2C] rounded-lg text-xs py-2 px-3 text-[#26352A] dark:text-[#E8F0E6] font-medium focus:ring-2 focus:ring-[#A0C878] focus:outline-none transition-all"
          >
            {grids && grids.length > 0 ? (
              grids.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.buses?.length || 0} Buses • {g.feeders?.length || 0} Feeders)
                </option>
              ))
            ) : (
              <option value="default-grid">Default 4-Bus Feeder</option>
            )}
          </select>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleOpenNewGridModal}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              title="Create a new network model"
            >
              New
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCloneCurrentGrid}
              leftIcon={<Copy className="w-3.5 h-3.5" />}
              title="Duplicate current grid for sandbox scenario testing"
            >
              Clone
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setActiveModal('delete-grid')}
              disabled={network.id === 'default-grid' || grids.length <= 1}
              leftIcon={<Trash className="w-3.5 h-3.5" />}
              title={network.id === 'default-grid' ? 'Cannot delete default benchmark grid' : 'Delete active grid'}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Row 2: Grid Metrics HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="bg-[#FFFDF6] dark:bg-[#151F17] p-2 rounded-lg border border-[#DDD9C9] dark:border-[#2A3A2C]">
            <div className="text-[10px] text-[#788477] font-medium flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Buses
            </div>
            <div className="text-sm font-bold font-mono text-[#26352A] dark:text-[#E8F0E6] mt-0.5">
              {network.buses.length}
            </div>
          </div>
          <div className="bg-[#FFFDF6] dark:bg-[#151F17] p-2 rounded-lg border border-[#DDD9C9] dark:border-[#2A3A2C]">
            <div className="text-[10px] text-[#788477] font-medium flex items-center justify-center gap-1">
              <GitBranch className="w-3 h-3 text-[#A0C878]" /> Feeders
            </div>
            <div className="text-sm font-bold font-mono text-[#26352A] dark:text-[#E8F0E6] mt-0.5">
              {network.feeders.length}
            </div>
          </div>
          <div className="bg-[#FFFDF6] dark:bg-[#151F17] p-2 rounded-lg border border-[#DDD9C9] dark:border-[#2A3A2C]">
            <div className="text-[10px] text-[#788477] font-medium flex items-center justify-center gap-1">
              <Sun className="w-3 h-3 text-amber-500" /> Solar
            </div>
            <div className="text-sm font-bold font-mono text-[#26352A] dark:text-[#E8F0E6] mt-0.5">
              {totalSolarKw} <span className="text-[10px] font-normal text-[#788477]">kW</span>
            </div>
          </div>
          <div className="bg-[#FFFDF6] dark:bg-[#151F17] p-2 rounded-lg border border-[#DDD9C9] dark:border-[#2A3A2C]">
            <div className="text-[10px] text-[#788477] font-medium flex items-center justify-center gap-1">
              <BatteryMedium className="w-3 h-3 text-[#A0C878]" /> BESS
            </div>
            <div className="text-sm font-bold font-mono text-[#26352A] dark:text-[#E8F0E6] mt-0.5">
              {totalBatteryKwh} <span className="text-[10px] font-normal text-[#788477]">kWh</span>
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-[#FFFDF6] dark:bg-[#151F17] p-2 rounded-lg border border-[#DDD9C9] dark:border-[#2A3A2C]">
            <div className="text-[10px] text-[#788477] font-medium flex items-center justify-center gap-1">
              <Building className="w-3 h-3 text-amber-600" /> Load
            </div>
            <div className="text-sm font-bold font-mono text-[#26352A] dark:text-[#E8F0E6] mt-0.5">
              {totalLoadKw} <span className="text-[10px] font-normal text-[#788477]">kW</span>
            </div>
          </div>
        </div>

        {/* Row 3: Component Insertion Toolbar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[#506052] dark:text-[#A0B0A2] font-medium">
            <span>Add Equipment:</span>
            <button
              onClick={() => setShowComponentList(!showComponentList)}
              className="text-[#506052] dark:text-[#A0C878] hover:text-[#26352A] font-semibold hover:underline text-[10px] cursor-pointer"
            >
              {showComponentList ? 'Hide Assets' : `All Assets (${network.buses.length + network.feeders.length + network.solarUnits.length + network.batteries.length + network.loads.length})`}
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            <button
              onClick={openAddBus}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2A3A2C] hover:border-[#A0C878] hover:bg-[#DDEB9D]/30 text-[#26352A] dark:text-[#E8F0E6] transition-all text-center group cursor-pointer"
              title="Add Bus Node"
            >
              <Zap className="w-4 h-4 text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-semibold">+ Bus</span>
            </button>

            <button
              onClick={openAddFeeder}
              disabled={network.buses.length < 1}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2A3A2C] hover:border-[#A0C878] hover:bg-[#DDEB9D]/30 text-[#26352A] dark:text-[#E8F0E6] transition-all text-center group disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Add Feeder Branch"
            >
              <GitBranch className="w-4 h-4 text-[#A0C878] mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-semibold">+ Line</span>
            </button>

            <button
              onClick={openAddSolar}
              disabled={network.buses.length === 0}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2A3A2C] hover:border-[#A0C878] hover:bg-[#DDEB9D]/30 text-[#26352A] dark:text-[#E8F0E6] transition-all text-center group disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Add Solar PV Generation"
            >
              <Sun className="w-4 h-4 text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-semibold">+ Solar</span>
            </button>

            <button
              onClick={openAddBattery}
              disabled={network.buses.length === 0}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2A3A2C] hover:border-[#A0C878] hover:bg-[#DDEB9D]/30 text-[#26352A] dark:text-[#E8F0E6] transition-all text-center group disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Add Battery Energy Storage"
            >
              <BatteryMedium className="w-4 h-4 text-[#A0C878] mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-semibold">+ BESS</span>
            </button>

            <button
              onClick={openAddLoad}
              disabled={network.buses.length === 0}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2A3A2C] hover:border-[#A0C878] hover:bg-[#DDEB9D]/30 text-[#26352A] dark:text-[#E8F0E6] transition-all text-center group disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Add Electrical Load Center"
            >
              <Building className="w-4 h-4 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-semibold">+ Load</span>
            </button>
          </div>
        </div>

        {/* Collapsible Component Explorer */}
        {showComponentList && (
          <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="font-semibold text-[11px] text-slate-600 dark:text-slate-400 px-1">
              Active Network Components
            </div>
            {/* Buses */}
            {network.buses.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedComponent({ type: 'bus', id: b.id, data: b })}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  selectedComponent?.id === b.id
                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 text-sky-900 dark:text-sky-200'
                    : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-mono font-semibold">{b.id}</span>
                  <span className="text-slate-400 truncate">{b.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] text-slate-500">{b.voltage?.toFixed(3) || '1.000'} pu</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeComponent('bus', b.id)
                    }}
                    className="text-slate-400 hover:text-red-500 p-1"
                    title="Remove Bus"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Feeders */}
            {network.feeders.map((f) => (
              <div
                key={f.id}
                onClick={() => setSelectedComponent({ type: 'feeder', id: f.id, data: f })}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  selectedComponent?.id === f.id
                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 text-sky-900 dark:text-sky-200'
                    : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <GitBranch className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span className="font-mono font-semibold">{f.id}</span>
                  <span className="text-slate-400 truncate">
                    ({f.fromBus} → {f.toBus})
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] text-slate-500">{Math.round(f.loadingPercent || 0)}%</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeComponent('feeder', f.id)
                    }}
                    className="text-slate-400 hover:text-red-500 p-1"
                    title="Remove Line"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Solar */}
            {network.solarUnits.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedComponent({ type: 'solar', id: s.id, data: s })}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-mono font-semibold">{s.id}</span>
                  <span className="text-slate-400 truncate">{s.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">{s.generationKw} kW</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeComponent('solar', s.id)
                    }}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Batteries */}
            {network.batteries.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedComponent({ type: 'battery', id: b.id, data: b })}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <BatteryMedium className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-mono font-semibold">{b.id}</span>
                  <span className="text-slate-400 truncate">{b.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">{b.socPercent}% SoC</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeComponent('battery', b.id)
                    }}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Loads */}
            {network.loads.map((l) => (
              <div
                key={l.id}
                onClick={() => setSelectedComponent({ type: 'load', id: l.id, data: l })}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Building className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="font-mono font-semibold">{l.id}</span>
                  <span className="text-slate-400 truncate">{l.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">{l.powerKw} kW</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeComponent('load', l.id)
                    }}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3D Builder Callout */}
        {!is3DEnabled && (
          <div className="flex items-center justify-between p-3 bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 rounded-2xl text-xs shadow-2xs">
            <div className="flex items-center gap-2 text-[#52665A] dark:text-[#A7F3D0]">
              <Box className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] shrink-0" />
              <span className="text-[11px]">3D Digital Twin available for spatial node editing</span>
            </div>
            <Button size="sm" variant="secondary" onClick={toggle3D} className="text-xs shrink-0 py-1 px-2.5">
              3D View
            </Button>
          </div>
        )}
      </CardContent>

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* 1. Create Grid Modal */}
      <Modal
        isOpen={activeModal === 'new-grid'}
        onClose={() => setActiveModal(null)}
        title="Create New Grid Network"
        subtitle="Configure model metadata and choose your starting topology"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmCreateGrid} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Grid Name
            </label>
            <input
              type="text"
              value={newGridName}
              onChange={(e) => setNewGridName(e.target.value)}
              required
              placeholder="e.g. Microgrid Campus East"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Starting Template
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  newGridTemplate === 'clone'
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="gridTemplate"
                  checked={newGridTemplate === 'clone'}
                  onChange={() => setNewGridTemplate('clone')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-semibold">Clone Active Grid (Recommended)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Duplicate all existing buses, feeders, and assets from {network.name} for isolated sandbox testing.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  newGridTemplate === 'starter'
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="gridTemplate"
                  checked={newGridTemplate === 'starter'}
                  onChange={() => setNewGridTemplate('starter')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-semibold">Starter Radial Feeder</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Includes a primary 33/11kV Substation, Feeder F-01, and Bus B1 ready for new branch lines.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  newGridTemplate === 'empty'
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="gridTemplate"
                  checked={newGridTemplate === 'empty'}
                  onChange={() => setNewGridTemplate('empty')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-semibold">Blank Grid</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Clean slate with a main substation node. Build your complete network from scratch.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Grid
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Delete Confirmation Modal */}
      <Modal
        isOpen={activeModal === 'delete-grid'}
        onClose={() => setActiveModal(null)}
        title="Delete Network Model"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to delete <span className="font-semibold">{network.name}</span>? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDeleteGrid}>
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Add Bus Modal */}
      <Modal
        isOpen={activeModal === 'bus'}
        onClose={() => setActiveModal(null)}
        title="Add Bus Node"
        subtitle="Deploy an electrical nodal connection point"
        maxWidth="md"
      >
        <form onSubmit={handleSaveBus} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bus ID</label>
              <input
                type="text"
                value={busForm.id}
                onChange={(e) => setBusForm({ ...busForm, id: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={busForm.name}
                onChange={(e) => setBusForm({ ...busForm, name: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nominal (pu)</label>
              <input
                type="number"
                step="0.001"
                value={busForm.voltage}
                onChange={(e) => setBusForm({ ...busForm, voltage: parseFloat(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Min Limit (pu)</label>
              <input
                type="number"
                step="0.01"
                value={busForm.voltageLimitMin}
                onChange={(e) => setBusForm({ ...busForm, voltageLimitMin: parseFloat(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Limit (pu)</label>
              <input
                type="number"
                step="0.01"
                value={busForm.voltageLimitMax}
                onChange={(e) => setBusForm({ ...busForm, voltageLimitMax: parseFloat(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Bus
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Add Feeder Modal */}
      <Modal
        isOpen={activeModal === 'feeder'}
        onClose={() => setActiveModal(null)}
        title="Add Feeder Branch"
        subtitle="Connect two bus nodes with an overhead or underground distribution line"
        maxWidth="md"
      >
        <form onSubmit={handleSaveFeeder} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Feeder ID</label>
              <input
                type="text"
                value={feederForm.id}
                onChange={(e) => setFeederForm({ ...feederForm, id: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={feederForm.name}
                onChange={(e) => setFeederForm({ ...feederForm, name: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">From Node</label>
              <select
                value={feederForm.fromBus}
                onChange={(e) => setFeederForm({ ...feederForm, fromBus: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white"
              >
                {network.substation && (
                  <option value={network.substation.id}>Substation ({network.substation.id})</option>
                )}
                {network.buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">To Node</label>
              <select
                value={feederForm.toBus}
                onChange={(e) => setFeederForm({ ...feederForm, toBus: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white"
              >
                {network.buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Capacity (kW)</label>
              <input
                type="number"
                value={feederForm.capacityKw}
                onChange={(e) => setFeederForm({ ...feederForm, capacityKw: parseFloat(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={feederForm.isSwitchClosed}
                  onChange={(e) => setFeederForm({ ...feederForm, isSwitchClosed: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                Switch Closed (Energized)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Feeder
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Add Solar Modal */}
      <Modal
        isOpen={activeModal === 'solar'}
        onClose={() => setActiveModal(null)}
        title="Add Solar PV Installation"
        subtitle="Connect rooftop or utility photovoltaic generation to a bus node"
        maxWidth="md"
      >
        <form onSubmit={handleSaveSolar} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Solar ID</label>
              <input
                type="text"
                value={solarForm.id}
                onChange={(e) => setSolarForm({ ...solarForm, id: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={solarForm.name}
                onChange={(e) => setSolarForm({ ...solarForm, name: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Connect to Bus</label>
              <select
                value={solarForm.busId}
                onChange={(e) => setSolarForm({ ...solarForm, busId: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white"
              >
                {network.buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Asset Category</label>
              <select
                value={solarForm.type}
                onChange={(e) => setSolarForm({ ...solarForm, type: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white"
              >
                <option value="utility">Utility-Scale Ground Array</option>
                <option value="rooftop">Distributed Rooftop Solar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rated Capacity (kW)</label>
              <input
                type="number"
                value={solarForm.capacityKw}
                onChange={(e) => setSolarForm({ ...solarForm, capacityKw: parseFloat(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Output (kW)</label>
              <input
                type="number"
                value={solarForm.generationKw}
                onChange={(e) => setSolarForm({ ...solarForm, generationKw: parseFloat(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Solar
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Add Battery Modal */}
      <Modal
        isOpen={activeModal === 'battery'}
        onClose={() => setActiveModal(null)}
        title="Add Battery Energy Storage (BESS)"
        subtitle="Integrate battery storage unit with bidirectional inverter support"
        maxWidth="md"
      >
        <form onSubmit={handleSaveBattery} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Battery ID</label>
              <input
                type="text"
                value={batteryForm.id}
                onChange={(e) => setBatteryForm({ ...batteryForm, id: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={batteryForm.name}
                onChange={(e) => setBatteryForm({ ...batteryForm, name: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Connect to Bus</label>
              <select
                value={batteryForm.busId}
                onChange={(e) => setBatteryForm({ ...batteryForm, busId: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white"
              >
                {network.buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Capacity (kWh)</label>
              <input
                type="number"
                value={batteryForm.capacityKwh}
                onChange={(e) => setBatteryForm({ ...batteryForm, capacityKwh: parseFloat(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Power (kW)</label>
              <input
                type="number"
                value={batteryForm.maxDischargeKw}
                onChange={(e) =>
                  setBatteryForm({
                    ...batteryForm,
                    maxDischargeKw: parseFloat(e.target.value),
                    maxChargeKw: parseFloat(e.target.value),
                  })
                }
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial SoC (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={batteryForm.socPercent}
                onChange={(e) => setBatteryForm({ ...batteryForm, socPercent: parseFloat(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Battery
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. Add Load Modal */}
      <Modal
        isOpen={activeModal === 'load'}
        onClose={() => setActiveModal(null)}
        title="Add Electrical Load Center"
        subtitle="Connect residential, commercial, or industrial power consumption"
        maxWidth="md"
      >
        <form onSubmit={handleSaveLoad} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Load ID</label>
              <input
                type="text"
                value={loadForm.id}
                onChange={(e) => setLoadForm({ ...loadForm, id: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={loadForm.name}
                onChange={(e) => setLoadForm({ ...loadForm, name: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Connect to Bus</label>
              <select
                value={loadForm.busId}
                onChange={(e) => setLoadForm({ ...loadForm, busId: e.target.value })}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white"
              >
                {network.buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={loadForm.category}
                onChange={(e) => setLoadForm({ ...loadForm, category: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white"
              >
                <option value="Residential">Residential District</option>
                <option value="Commercial">Commercial Office Complex</option>
                <option value="Factory">Industrial / Factory</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Demand (kW)</label>
              <input
                type="number"
                value={loadForm.powerKw}
                onChange={(e) => setLoadForm({ ...loadForm, powerKw: parseFloat(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Power Factor</label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                max="1.0"
                value={loadForm.powerFactor}
                onChange={(e) => setLoadForm({ ...loadForm, powerFactor: parseFloat(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Load
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}
