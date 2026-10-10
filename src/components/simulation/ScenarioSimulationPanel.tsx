import React, { useState, useMemo } from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
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
  Layers,
  Settings2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { LiveSolarLoadChart } from './LiveSolarLoadChart'
import { SolarInputPanel } from './SolarInputPanel'
import { LoadInputPanel } from './LoadInputPanel'
import { NetworkConfigPanel } from './NetworkConfigPanel'
import { BatteryConfigPanel } from './BatteryConfigPanel'
import { CSVUploader } from './CSVUploader'

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
  onImportCsvData: (points: Array<{ time: string; solarKw: number; loadKw: number }>) => void
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
  onImportCsvData,
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
  const totalLoadKw = useMemo(
    () => currentGrid.loads.reduce((acc, l) => acc + (l.powerKw || 0), 0),
    [currentGrid.loads]
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

  return (
    <div className="space-y-5">
      <Card className="border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs">
        <CardHeader
          title="Simulation Configuration"
          subtitle="Configure target grid and select a predefined operating condition for power-flow evaluation"
          icon={<SlidersHorizontal className="w-4 h-4 text-[#A0C878]" />}
          action={
            <div className="flex items-center gap-2">
              <CSVUploader onImport={onImportCsvData} />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAdvancedEditor(!showAdvancedEditor)}
                leftIcon={<Settings2 className="w-3.5 h-3.5" />}
                rightIcon={showAdvancedEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              >
                {showAdvancedEditor ? 'Hide Adjustments' : 'Fine-Tune Curves'}
              </Button>
            </div>
          }
        />

        <CardContent className="p-5 space-y-5">
          {/* 1. GRID CONFIGURATION & GRID SUMMARY */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="scenario-grid-select"
                className="block text-xs font-bold uppercase tracking-wider text-[#26352A] dark:text-[#F2F5ED]"
              >
                Grid Configuration
              </label>
              <span className="text-[11px] font-mono text-[#788477] dark:text-[#859483]">
                Active Grid Model
              </span>
            </div>

            <div className="relative">
              <select
                id="scenario-grid-select"
                value={currentGrid.id}
                onChange={(e) => onSelectGrid(e.target.value)}
                className="w-full h-11 px-3.5 pr-10 text-xs sm:text-sm font-semibold rounded-lg border border-[#DDD9C9] dark:border-[#2C3C2E] bg-[#FFFDF6] dark:bg-[#151F17] text-[#26352A] dark:text-[#F2F5ED] focus:outline-none focus:ring-2 focus:ring-[#A0C878]/50 cursor-pointer transition-colors"
              >
                {availableGrids && availableGrids.length > 0 ? (
                  availableGrids.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.buses?.length || 0} Buses • {g.feeders?.length || 0} Feeders • {g.gridConnectionStatus === 'islanded' ? 'Islanded' : 'Grid-Connected'})
                    </option>
                  ))
                ) : (
                  <option value={currentGrid.id}>{currentGrid.name}</option>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#788477] dark:text-[#859483]">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Compact Grid Telemetry Row */}
            <div className="p-3.5 rounded-2xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC] shrink-0" />
                <span className="font-bold text-[#10251A] dark:text-[#ECFDF3] truncate">
                  {currentGrid.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ECFDF3] dark:bg-[#064E3B]/60 border border-[#BBF7D0] dark:border-[#86EFAC]/30 text-[#047857] dark:text-[#86EFAC]">
                  {currentGrid.gridConnectionStatus === 'islanded' ? 'Islanded' : 'Connected (33/11 kV)'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono text-[#52665A] dark:text-[#A7F3D0] flex-wrap">
                <span>{currentGrid.buses.length} Buses</span>
                <span>•</span>
                <span>{currentGrid.feeders.length} Feeders</span>
                <span>•</span>
                <span>{totalSolarKw} kW PV</span>
                <span>•</span>
                <span>{totalBessKwh} kWh BESS</span>
                <span>•</span>
                <span>Substation: {currentGrid.substation?.ratingKva || 500} kVA</span>
              </div>
            </div>
          </div>

          {/* 2. SIMULATION SCENARIO SELECTOR */}
          <div className="space-y-2 pt-2 border-t border-[#BBF7D0]/40 dark:border-[#86EFAC]/20">
            <div className="flex items-center justify-between">
              <label
                htmlFor="scenario-dropdown-select"
                className="block text-xs font-bold uppercase tracking-wider text-[#10251A] dark:text-[#ECFDF3]"
              >
                Simulation Scenario
              </label>
              <span className="text-[11px] text-[#52665A] dark:text-[#A7F3D0]">
                Select a predefined operating condition for the selected grid
              </span>
            </div>

            <div className="relative">
              <select
                id="scenario-dropdown-select"
                value={activePresetKey}
                onChange={(e) => onSelectPreset(e.target.value)}
                className="w-full h-11 px-3.5 pr-10 text-xs sm:text-sm font-semibold rounded-xl border border-[#BBF7D0]/70 dark:border-[#86EFAC]/20 bg-white dark:bg-[#122C1F] text-[#10251A] dark:text-[#ECFDF3] focus:outline-none focus:ring-2 focus:ring-[#10B981]/40 cursor-pointer transition-colors shadow-2xs"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {getStatusLabel(s)} (PV: {s.solarKw} kW, Demand: {s.loadKw} kW)
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#52665A] dark:text-[#A7F3D0]">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 3. SCENARIO SUMMARY */}
          {selectedScenario && (
            <div className="p-4 rounded-2xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#52665A] dark:text-[#A7F3D0]">
                    Scenario Summary
                  </div>
                  <div className="text-sm font-bold text-[#10251A] dark:text-[#ECFDF3] flex items-center gap-2 mt-0.5">
                    <span>{selectedScenario.name}</span>
                    <Badge variant={getStatusBadgeVariant(selectedScenario.status)} size="sm">
                      {getStatusLabel(selectedScenario)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-[#52665A] dark:text-[#A7F3D0] self-start sm:self-center">
                  <span className="px-2.5 py-1 rounded-full bg-white dark:bg-[#122C1F] border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 flex items-center gap-1 shadow-2xs">
                    <Clock className="w-3 h-3 text-[#047857] dark:text-[#86EFAC]" />
                    Simulated Time: {selectedScenario.simulatedTime || '12:00'}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-[#52665A] dark:text-[#A7F3D0] uppercase tracking-wider">
                  Expected Condition
                </div>
                <p className="text-xs text-[#52665A] dark:text-[#A7F3D0] mt-0.5 leading-relaxed">
                  {selectedScenario.expectedCondition || selectedScenario.description}
                </p>
              </div>

              {/* Technical Operating Parameters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60">
                <div className="p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/70 dark:border-[#2C3C2E]">
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sun className="w-3 h-3" />
                    Solar Profile
                  </div>
                  <div className="text-sm font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-0.5">
                    {selectedScenario.solarKw} kW
                  </div>
                  <div className="text-[10px] text-[#788477] dark:text-[#859483]">Peak generation</div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/70 dark:border-[#2C3C2E]">
                  <div className="text-[10px] text-sky-700 dark:text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Load Profile
                  </div>
                  <div className="text-sm font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-0.5">
                    {selectedScenario.loadKw} kW
                  </div>
                  <div className="text-[10px] text-[#788477] dark:text-[#859483]">Feeder demand</div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/70 dark:border-[#2C3C2E]">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Battery className="w-3 h-3" />
                    Battery State
                  </div>
                  <div className="text-sm font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-0.5">
                    {selectedScenario.batterySocPercent}%
                  </div>
                  <div className="text-[10px] text-[#788477] dark:text-[#859483]">Initial SOC</div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/70 dark:border-[#2C3C2E]">
                  <div className="text-[10px] text-[#788477] dark:text-[#859483] font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-[#A0C878]" />
                    Stress Level
                  </div>
                  <div className="text-sm font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-0.5 capitalize">
                    {selectedScenario.status}
                  </div>
                  <div className="text-[10px] text-[#788477] dark:text-[#859483]">
                    {selectedScenario.violationsExpected > 0
                      ? `~${selectedScenario.violationsExpected} violations`
                      : 'Compliant'}
                  </div>
                </div>
              </div>

              {selectedScenario.recommendedActionHint && (
                <div className="p-2 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/70 dark:border-[#2C3C2E] text-[11px] text-[#506052] dark:text-[#C2CCC0] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#A0C878] shrink-0" />
                  <span>
                    <strong>Expected Action:</strong> {selectedScenario.recommendedActionHint}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick Scenario Metadata Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60 text-xs">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] block">
                Scenario Identifier / Name
              </label>
              <input
                type="text"
                value={input.scenarioName}
                onChange={(e) => onUpdateInput({ scenarioName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] text-[#26352A] dark:text-[#F2F5ED] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#A0C878]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] block">
                Simulation Duration
              </label>
              <select
                value={input.simulationDuration}
                onChange={(e) => onUpdateInput({ simulationDuration: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] text-[#26352A] dark:text-[#F2F5ED] text-xs focus:outline-none focus:ring-1 focus:ring-[#A0C878]"
              >
                <option value="6 hours">6 hours (Peak Window)</option>
                <option value="12 hours">12 hours (Daytime)</option>
                <option value="24 hours">24 hours (Full Day)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] block">
                Time Resolution
              </label>
              <select
                value={input.timeResolution}
                onChange={(e) => onUpdateInput({ timeResolution: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] text-[#26352A] dark:text-[#F2F5ED] text-xs focus:outline-none focus:ring-1 focus:ring-[#A0C878]"
              >
                <option value="15 minutes">15 mins (High-Fi)</option>
                <option value="30 minutes">30 mins</option>
                <option value="1 hour">1 hour (Standard)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. OPTIONAL ADVANCED ADJUSTMENTS DRAWER */}
      {showAdvancedEditor && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <LiveSolarLoadChart
            solarPoints={input.solarTimeSeries}
            loadPoints={input.loadTimeSeries}
            installedCapacityKw={input.installedSolarCapacityKw}
            peakLoadKw={input.peakLoadKw}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
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
