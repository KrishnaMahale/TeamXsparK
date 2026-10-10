import React, { useState, useMemo } from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { AnimatedSelect } from '../ui/AnimatedSelect'
import { useScenarios } from '../../hooks/useScenarios'
import { GridNetwork } from '../../types/network'
import { SimulationInput } from '../../types/simulation'
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sun,
  Zap,
  Battery,
  AlertTriangle,
  Building,
  Settings2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { LiveSolarLoadChart } from './LiveSolarLoadChart'
import { SolarInputPanel } from './SolarInputPanel'
import { LoadInputPanel } from './LoadInputPanel'
import { NetworkConfigPanel } from './NetworkConfigPanel'
import { BatteryConfigPanel } from './BatteryConfigPanel'

interface ScenarioSimulationPanelProps {
  input: SimulationInput
  activePresetKey: string
  currentGrid: GridNetwork
  availableGrids: GridNetwork[]
  onSelectGrid: (gridId: string) => void
  onSelectPreset: (presetKey: string) => void
  onUpdateInput: (updates: Partial<SimulationInput>) => void
  onUpdateSolarPoint: (id: string, solarKw: number) => void
  onAddSolarPoint: (time: string, solarKw: number) => void
  onDeleteSolarPoint: (id: string) => void
  onGenerateSampleSolar: () => void
  onUpdateLoadPoint: (id: string, loadKw: number) => void
  onAddLoadPoint: (time: string, loadKw: number) => void
  onDeleteLoadPoint: (id: string) => void
  onGenerateSampleLoad: () => void
  onImportCsvData?: (points: Array<{ time: string; solarKw: number; loadKw: number }>) => void
}

export const ScenarioSimulationPanel: React.FC<ScenarioSimulationPanelProps> = ({
  input,
  activePresetKey,
  currentGrid,
  availableGrids,
  onSelectGrid,
  onSelectPreset,
  onUpdateInput,
  onUpdateSolarPoint,
  onAddSolarPoint,
  onDeleteSolarPoint,
  onGenerateSampleSolar,
  onUpdateLoadPoint,
  onAddLoadPoint,
  onDeleteLoadPoint,
  onGenerateSampleLoad,
}) => {
  const { scenarios } = useScenarios()
  const [showAdvancedEditor, setShowAdvancedEditor] = useState<boolean>(false)

  const selectedScenario = scenarios.find((s) => s.id === activePresetKey) || scenarios[0]

  // Dynamic grid asset totals
  const totalSolarKw = useMemo(
    () => currentGrid.solarUnits.reduce((acc, s) => acc + (s.capacityKw || s.generationKw || 0), 0),
    [currentGrid.solarUnits]
  )
  const totalBessKwh = useMemo(
    () => currentGrid.batteries.reduce((acc, b) => acc + (b.capacityKwh || 0), 0),
    [currentGrid.batteries]
  )

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'optimal':
        return 'success' as const
      case 'warning':
        return 'warning' as const
      case 'critical':
      case 'infeasible':
        return 'danger' as const
      default:
        return 'neutral' as const
    }
  }

  const getStatusLabel = (s: any) => {
    if (!s) return 'Normal'
    if (s.id === 'HIGH_SOLAR_LOW_LOAD') return 'Critical Overvoltage'
    if (s.id === 'HIGH_SOLAR') return 'Reverse Flow Stress'
    if (s.id === 'EVENING_PEAK') return 'Peak Demand'
    if (s.id === 'NORMAL_DAY') return 'Normal Operating Day'
    if (s.id === 'EXTREME_INFEASIBLE') return 'Extreme Infeasible'
    if (s.id === 'STORM_CLOUD_RAMP') return 'Solar Ramp Drop'
    if (s.id === 'EV_CHARGING_SURGE') return 'EV Charging Surge'
    if (s.id === 'PHASE_UNBALANCE_PEAK') return 'Phase Unbalance'
    if (s.id === 'NIGHT_QUIET') return 'Low Solar / Baseload'
    return s.status ? s.status.toUpperCase() : 'Scenario'
  }

  const gridSelectOptions = useMemo(() => {
    if (!availableGrids || availableGrids.length === 0) {
      return [{ value: currentGrid.id, label: currentGrid.name }]
    }
    return availableGrids.map((g) => ({
      value: g.id,
      label: g.name,
      subtext: `${g.buses?.length || 0} Buses • ${g.feeders?.length || 0} Feeders`,
      badge: {
        text: g.gridConnectionStatus === 'islanded' ? 'Islanded' : '33/11 kV',
        variant: g.gridConnectionStatus === 'islanded' ? ('warning' as const) : ('success' as const),
      },
    }))
  }, [availableGrids, currentGrid])

  const scenarioSelectOptions = useMemo(() => {
    return scenarios.map((s) => ({
      value: s.id,
      label: s.name,
      subtext: `PV: ${s.solarKw} kW • Demand: ${s.loadKw} kW`,
      badge: {
        text: getStatusLabel(s),
        variant: getStatusBadgeVariant(s.status),
      },
    }))
  }, [scenarios])

  return (
    <div className="space-y-4">
      {/* FLOATING SIMULATION CONFIGURATION BOX */}
      <Card className="border-[#BBF7D0]/80 dark:border-[#86EFAC]/25 bg-white/85 dark:bg-[#122C1F]/85 backdrop-blur-md shadow-[0_8px_30px_rgba(16,80,55,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] rounded-2xl overflow-visible transition-all duration-200 relative z-20">
        <CardHeader
          className="p-3 px-4 sm:p-3.5 sm:px-5"
          title="Simulation Configuration"
          subtitle="Configure target grid and select a predefined operating condition for power-flow evaluation"
          icon={<SlidersHorizontal className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
          action={
            <Badge
              variant="neutral"
              size="sm"
              className="hidden sm:inline-flex border-[#BBF7D0] dark:border-[#86EFAC]/30 text-[#047857] dark:text-[#86EFAC] bg-[#ECFDF3] dark:bg-[#132F21]"
            >
              Active Digital Model
            </Badge>
          }
        />

        <CardContent className="p-3 sm:p-3.5 lg:p-4 space-y-2.5 sm:space-y-3 overflow-visible">
          {/* 1. GRID CONFIGURATION & SIMULATION SCENARIO (2-Column Grid with Animated Dropdowns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
            {/* Left: Grid Configuration */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="scenario-grid-select"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#10251A] dark:text-[#ECFDF3]"
                >
                  Grid Configuration
                </label>
                <span className="text-[10px] font-mono text-[#52665A] dark:text-[#A7F3D0]">
                  Target Model
                </span>
              </div>

              {/* Animated Custom Dropdown */}
              <AnimatedSelect
                id="scenario-grid-select"
                value={currentGrid.id}
                onChange={onSelectGrid}
                options={gridSelectOptions}
                size="md"
              />

              {/* Compact Floating Grid Telemetry Pill */}
              <div className="p-2 px-3 rounded-xl bg-[#ECFDF3]/80 dark:bg-[#163826]/70 border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 flex flex-wrap items-center justify-between gap-1.5 text-[11px] shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC] shrink-0" />
                  <span className="font-bold text-[#10251A] dark:text-[#ECFDF3] truncate">
                    {currentGrid.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white dark:bg-[#064E3B]/70 border border-[#BBF7D0] dark:border-[#86EFAC]/30 text-[#047857] dark:text-[#86EFAC]">
                    {currentGrid.gridConnectionStatus === 'islanded' ? 'Islanded' : '33/11 kV'}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[#52665A] dark:text-[#A7F3D0] text-[10.5px]">
                  <span>{currentGrid.buses.length} Buses • {currentGrid.feeders.length} Feeders</span>
                  <span>•</span>
                  <span>{totalSolarKw} kW PV</span>
                  <span>•</span>
                  <span>{totalBessKwh} kWh</span>
                </div>
              </div>
            </div>

            {/* Right: Simulation Scenario */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="scenario-dropdown-select"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#10251A] dark:text-[#ECFDF3]"
                >
                  Simulation Scenario
                </label>
                <span className="text-[10px] font-mono text-[#52665A] dark:text-[#A7F3D0]">
                  Operating Condition
                </span>
              </div>

              {/* Animated Custom Dropdown */}
              <AnimatedSelect
                id="scenario-dropdown-select"
                value={activePresetKey}
                onChange={onSelectPreset}
                options={scenarioSelectOptions}
                size="md"
              />

              {/* Scenario Quick Status Pill */}
              <div className="p-2 px-3 rounded-xl bg-[#ECFDF3]/80 dark:bg-[#163826]/70 border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 flex items-center justify-between gap-1.5 text-[11px] shadow-2xs">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(selectedScenario?.status)} size="sm">
                    {getStatusLabel(selectedScenario)}
                  </Badge>
                  <span className="text-xs font-bold text-[#10251A] dark:text-[#ECFDF3] truncate">
                    {selectedScenario?.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[#52665A] dark:text-[#A7F3D0] text-[10.5px]">
                  <Clock className="w-3 h-3 text-[#047857] dark:text-[#86EFAC]" />
                  <span>Sim Time: {selectedScenario?.simulatedTime || '12:00'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SCENARIO PARAMETERS & RUN HORIZON (Opens Downwards Cleanly Inside Box) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-[#BBF7D0]/50 dark:border-[#86EFAC]/15 text-xs">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#10251A] dark:text-[#ECFDF3] block">
                Scenario Identifier
              </label>
              <input
                type="text"
                value={input.scenarioName}
                onChange={(e) => onUpdateInput({ scenarioName: e.target.value })}
                className="w-full h-10 px-3.5 py-2 rounded-xl bg-white/90 dark:bg-[#132F21]/90 border border-[#BBF7D0]/80 dark:border-[#86EFAC]/30 text-[#10251A] dark:text-white text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#047857]/40 dark:focus:ring-[#86EFAC]/40 focus:border-[#047857] shadow-2xs transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#10251A] dark:text-[#ECFDF3] block">
                Simulation Duration
              </label>
              <AnimatedSelect
                value={input.simulationDuration}
                onChange={(val) => onUpdateInput({ simulationDuration: val as any })}
                direction="down"
                options={[
                  {
                    value: '6 hours',
                    label: '6 hours (Peak Window)',
                    subtext: 'High-solar generation peak hours',
                    badge: { text: 'Peak', variant: 'warning' },
                  },
                  {
                    value: '12 hours',
                    label: '12 hours (Daytime)',
                    subtext: '06:00 to 18:00 operational profile',
                    badge: { text: 'Day', variant: 'neutral' },
                  },
                  {
                    value: '24 hours',
                    label: '24 hours (Full Day)',
                    subtext: 'Complete 24-hour diurnal power dispatch',
                    badge: { text: 'Full Day', variant: 'success' },
                  },
                ]}
                size="md"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#10251A] dark:text-[#ECFDF3] block">
                Time Resolution
              </label>
              <AnimatedSelect
                value={input.timeResolution}
                onChange={(val) => onUpdateInput({ timeResolution: val as any })}
                direction="down"
                options={[
                  {
                    value: '15 minutes',
                    label: '15 mins (High-Fi)',
                    subtext: '96 intervals • High-fidelity dynamics',
                    badge: { text: 'High-Fi', variant: 'success' },
                  },
                  {
                    value: '30 minutes',
                    label: '30 mins',
                    subtext: '48 intervals • Balanced power-flow steps',
                    badge: { text: 'Balanced', variant: 'neutral' },
                  },
                  {
                    value: '1 hour',
                    label: '1 hour (Standard)',
                    subtext: '24 intervals • Standard IEEE evaluation',
                    badge: { text: 'Standard', variant: 'neutral' },
                  },
                ]}
                size="md"
              />
            </div>
          </div>

          {/* 3. FLOATING SCENARIO SUMMARY */}
          {selectedScenario && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-[#F7FCF9]/90 dark:bg-[#143224]/80 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 space-y-2.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#52665A] dark:text-[#A7F3D0]">
                    Expected Condition
                  </span>
                  <p className="text-xs text-[#10251A] dark:text-[#ECFDF3] font-medium leading-snug mt-0.5">
                    {selectedScenario.expectedCondition || selectedScenario.description}
                  </p>
                </div>
                {selectedScenario.recommendedActionHint && (
                  <div className="text-[11px] text-[#064E3B] dark:text-[#A7F3D0] flex items-center gap-1.5 bg-white/80 dark:bg-[#0E2419]/80 px-2.5 py-1 rounded-lg border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shrink-0 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC] shrink-0" />
                    <span className="truncate max-w-xs xl:max-w-md font-medium">
                      {selectedScenario.recommendedActionHint}
                    </span>
                  </div>
                )}
              </div>

              {/* Technical Operating Parameters Micro-Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#BBF7D0]/50 dark:border-[#86EFAC]/15">
                <div className="p-2.5 rounded-lg bg-white/90 dark:bg-[#0E2419]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs hover:border-[#047857]/40 transition-colors">
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sun className="w-3 h-3" />
                    Solar Profile
                  </div>
                  <div className="text-xs sm:text-sm font-black font-mono text-[#10251A] dark:text-white mt-0.5">
                    {selectedScenario.solarKw} kW
                  </div>
                  <div className="text-[9.5px] text-[#52665A] dark:text-[#A7F3D0]">Peak generation</div>
                </div>

                <div className="p-2.5 rounded-lg bg-white/90 dark:bg-[#0E2419]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs hover:border-[#047857]/40 transition-colors">
                  <div className="text-[10px] text-sky-700 dark:text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Load Profile
                  </div>
                  <div className="text-xs sm:text-sm font-black font-mono text-[#10251A] dark:text-white mt-0.5">
                    {selectedScenario.loadKw} kW
                  </div>
                  <div className="text-[9.5px] text-[#52665A] dark:text-[#A7F3D0]">Feeder demand</div>
                </div>

                <div className="p-2.5 rounded-lg bg-white/90 dark:bg-[#0E2419]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs hover:border-[#047857]/40 transition-colors">
                  <div className="text-[10px] text-[#047857] dark:text-[#86EFAC] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Battery className="w-3 h-3" />
                    Battery State
                  </div>
                  <div className="text-xs sm:text-sm font-black font-mono text-[#10251A] dark:text-white mt-0.5">
                    {selectedScenario.batterySocPercent}%
                  </div>
                  <div className="text-[9.5px] text-[#52665A] dark:text-[#A7F3D0]">Initial SOC</div>
                </div>

                <div className="p-2.5 rounded-lg bg-white/90 dark:bg-[#0E2419]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs hover:border-[#047857]/40 transition-colors">
                  <div className="text-[10px] text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Stress Level
                  </div>
                  <div className="text-xs sm:text-sm font-black font-mono text-[#10251A] dark:text-white mt-0.5 capitalize">
                    {selectedScenario.status}
                  </div>
                  <div className="text-[9.5px] text-[#52665A] dark:text-[#A7F3D0]">
                    {selectedScenario.violationsExpected > 0
                      ? `~${selectedScenario.violationsExpected} violations`
                      : 'Compliant'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. LOWEST POSITION IN THE BOX: "Fine-Tune Curves" Button (Strictly meeting Requirement 3) */}
          <div className="pt-2.5 border-t border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 flex items-center justify-between gap-3">
            <span className="text-[11px] text-[#52665A] dark:text-[#A7F3D0] font-medium hidden sm:inline">
              Customize solar/load curves, network topology & battery adjustments
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAdvancedEditor(!showAdvancedEditor)}
              leftIcon={<Settings2 className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC]" />}
              rightIcon={showAdvancedEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              className="ml-auto font-bold shadow-xs hover:border-[#047857]"
            >
              {showAdvancedEditor ? 'Hide Fine-Tune Curves' : 'Fine-Tune Curves'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 5. OPTIONAL ADVANCED ADJUSTMENTS DRAWER */}
      {showAdvancedEditor && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <LiveSolarLoadChart
            solarPoints={input.solarTimeSeries}
            loadPoints={input.loadTimeSeries}
            installedCapacityKw={input.installedSolarCapacityKw}
            peakLoadKw={input.peakLoadKw}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <SolarInputPanel
              installedCapacityKw={input.installedSolarCapacityKw}
              currentSolarKw={input.currentSolarKw}
              solarTimeSeries={input.solarTimeSeries}
              onChangeInstalledCapacity={(val: number) => onUpdateInput({ installedSolarCapacityKw: val })}
              onChangeCurrentSolar={(val: number) => onUpdateInput({ currentSolarKw: val })}
              onUpdateSolarPoint={onUpdateSolarPoint}
              onAddSolarPoint={onAddSolarPoint}
              onDeleteSolarPoint={onDeleteSolarPoint}
              onGenerateSample={onGenerateSampleSolar}
            />

            <LoadInputPanel
              peakLoadKw={input.peakLoadKw}
              currentLoadKw={input.currentLoadKw}
              loadTimeSeries={input.loadTimeSeries}
              onChangePeakLoad={(val: number) => onUpdateInput({ peakLoadKw: val })}
              onChangeCurrentLoad={(val: number) => onUpdateInput({ currentLoadKw: val })}
              onUpdateLoadPoint={onUpdateLoadPoint}
              onAddLoadPoint={onAddLoadPoint}
              onDeleteLoadPoint={onDeleteLoadPoint}
              onGenerateSample={onGenerateSampleLoad}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <NetworkConfigPanel
              config={input.networkConfig}
              onChange={(updates) =>
                onUpdateInput({ networkConfig: { ...input.networkConfig, ...updates } })
              }
            />

            <BatteryConfigPanel
              config={input.batteryConfig}
              onChange={(updates) =>
                onUpdateInput({ batteryConfig: { ...input.batteryConfig, ...updates } })
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ScenarioSimulationPanel
