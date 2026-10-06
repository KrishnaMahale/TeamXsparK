import React, { useState, useEffect, useMemo } from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useScenarios } from '../hooks/useScenarios'
import { useSimulationStore } from '../store/simulationStore'
import { useGridStore } from '../store/gridStore'
import { useDomesticStore } from '../store/domesticStore'
import { gridService } from '../services/api/gridService'
import { GridNetwork } from '../types/network'
import { GridScenario, ScenarioExecutionResponse } from '../types/scenario'
import { useNavigate } from 'react-router-dom'
import {
  Sun,
  Zap,
  BatteryMedium,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  SlidersHorizontal,
  Database,
  Cpu,
  Layers,
  ExternalLink,
  Play,
  RotateCw,
  X,
  Activity,
  Factory,
  Home,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  Gauge,
} from 'lucide-react'

export const ScenariosPage: React.FC = () => {
  const { scenarios, selectedScenario, runScenario, isScenarioRunning, lastExecutedScenarioId } = useScenarios()
  const { loadPreset, updateInput } = useSimulationStore()
  const { network, switchGrid } = useGridStore()
  const { setGridType: setGlobalGridType } = useDomesticStore()
  const [availableGrids, setAvailableGrids] = useState<GridNetwork[]>([])
  const [isLoadingGrids, setIsLoadingGrids] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'industrial' | 'domestic'>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [activeResult, setActiveResult] = useState<ScenarioExecutionResponse | null>(null)
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setIsLoadingGrids(true)
    gridService
      .getGrids()
      .then(setAvailableGrids)
      .catch((err) => console.error('Failed to load grids in ScenariosPage:', err))
      .finally(() => setIsLoadingGrids(false))
  }, [network.id])

  const handleTargetGridChange = async (gridId: string) => {
    if (!gridId || gridId === network.id) return
    await switchGrid(gridId)
    updateInput({ gridId })
  }

  const handleSelectAndConfigure = (scenario: GridScenario) => {
    loadPreset(scenario.id)
    updateInput({ gridId: network.id })
    if (scenario.gridType === 'domestic') {
      setGlobalGridType('domestic')
    }
    navigate('/simulation')
  }

  const handleRunInstantSimulation = async (scenario: GridScenario) => {
    setRunningScenarioId(scenario.id)
    try {
      const targetGridType = scenario.gridType === 'domestic' ? 'domestic' : 'industrial'
      const res = await runScenario(scenario.id, network.id, targetGridType)
      if (res) {
        setActiveResult(res)
      }
    } catch (err) {
      console.error('Error running scenario:', err)
    } finally {
      setRunningScenarioId(null)
    }
  }

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>()
    scenarios.forEach((s) => {
      s.tags?.forEach((t) => set.add(t))
    })
    return Array.from(set)
  }, [scenarios])

  // Filtered scenarios
  const filteredScenarios = useMemo(() => {
    return scenarios.filter((s) => {
      const matchType =
        filterType === 'all' ||
        s.gridType === 'any' ||
        (filterType === 'industrial' && (s.gridType === 'industrial' || !s.gridType)) ||
        (filterType === 'domestic' && s.gridType === 'domestic')

      const matchTag = selectedTag === 'all' || s.tags?.includes(selectedTag)
      return matchType && matchTag
    })
  }, [scenarios, filterType, selectedTag])

  return (
    <PageContainer
      title="Grid Operating Scenarios"
      subtitle="Select or run real-world grid scenes and stress tests across 11 kV Industrial Feeders and 230 V Domestic Rooftop Networks"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Layers className="w-3.5 h-3.5" />}
            onClick={() => navigate('/network')}
          >
            Grid Configurator
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            onClick={() => navigate('/simulation')}
          >
            New Simulation
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Active Target Grid Selector Card */}
        <div className="p-4 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#A0C878]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352A] dark:text-[#F2F5ED]">
                  Target Grid Digital Twin (Database Synced)
                </h3>
                <Badge variant="success" size="sm" className="gap-1 font-mono text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A0C878] animate-pulse" />
                  DB Synced
                </Badge>
              </div>
              <p className="text-[11px] text-[#506052] dark:text-[#C2CCC0]">
                Physics calculations run against the selected grid model. Switch grid topology or inspect dual-tier dynamics.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={network.id}
                onChange={(e) => handleTargetGridChange(e.target.value)}
                disabled={isLoadingGrids}
                className="bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-lg text-xs font-semibold py-1.5 px-3 text-[#26352A] dark:text-[#F2F5ED] focus:ring-2 focus:ring-[#A0C878] focus:outline-none transition-all cursor-pointer shadow-xs min-w-[200px]"
              >
                {availableGrids.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.id})
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={() => navigate('/network')}
              >
                <span>Edit Topology</span>
                <ExternalLink className="w-3 h-3 text-[#788477]" />
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar for Active Grid */}
          <div className="mt-3 pt-3 border-t border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60 flex flex-wrap items-center gap-4 text-[11px] text-[#506052] dark:text-[#C2CCC0]">
            <span className="flex items-center gap-1 font-mono font-medium">
              <Cpu className="w-3.5 h-3.5 text-[#A0C878]" />
              <strong className="text-[#26352A] dark:text-[#F2F5ED]">{network.buses?.length || 0}</strong> Buses
            </span>
            <span className="flex items-center gap-1 font-mono font-medium">
              <Zap className="w-3.5 h-3.5 text-[#A0C878]" />
              <strong className="text-[#26352A] dark:text-[#F2F5ED]">{network.feeders?.length || 0}</strong> Feeders
            </span>
            <span className="flex items-center gap-1 font-mono font-medium">
              <Sun className="w-3.5 h-3.5 text-[#B09B29]" />
              <strong className="text-[#26352A] dark:text-[#F2F5ED]">{network.solarUnits?.length || 0}</strong> Solar PVs
            </span>
            <span className="flex items-center gap-1 font-mono font-medium">
              <BatteryMedium className="w-3.5 h-3.5 text-[#A0C878]" />
              <strong className="text-[#26352A] dark:text-[#F2F5ED]">{network.batteries?.length || 0}</strong> Storage Units
            </span>
            <span className="ml-auto text-[10px] text-[#788477] font-mono">
              Grid ID: {network.id}
            </span>
          </div>
        </div>

        {/* Live Scenario Execution Result Card */}
        {activeResult && (
          <div className="p-5 rounded-xl bg-[#FFFDF6] dark:bg-[#151F17] border-2 border-[#A0C878] shadow-md transition-all animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD9C9] dark:border-[#2C3C2E]">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${activeResult.isFeasible ? 'bg-[#A0C878]/20 text-[#26352A] dark:text-[#A0C878]' : 'bg-red-500/20 text-red-600'}`}>
                  {activeResult.isFeasible ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#26352A] dark:text-[#F2F5ED]">
                      Scenario Simulation Results: {activeResult.scenario.name}
                    </h3>
                    <Badge variant={activeResult.isFeasible ? 'success' : 'danger'} size="sm">
                      {activeResult.isFeasible ? 'FEASIBLE DISPATCH' : 'PHYSICALLY INFEASIBLE'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#788477] mt-0.5">
                    Executed at {activeResult.executedAt} • Grid Model: <strong className="capitalize">{activeResult.gridType || 'Industrial'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Activity className="w-3.5 h-3.5" />}
                  onClick={() => {
                    if (activeResult.gridType === 'domestic') {
                      setGlobalGridType('domestic')
                    } else {
                      setGlobalGridType('industrial')
                    }
                    navigate('/')
                  }}
                >
                  View in Twin Dashboard
                </Button>
                <button
                  onClick={() => setActiveResult(null)}
                  className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500"
                  title="Dismiss Result"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Simulation Engineering Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4 text-center">
              <div className="p-2.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <div className="text-[10px] text-[#788477] font-semibold uppercase">Max Voltage</div>
                <div className={`text-sm font-mono font-bold mt-1 ${activeResult.voltageMaxPu && activeResult.voltageMaxPu > 1.05 ? 'text-red-600' : 'text-[#26352A] dark:text-[#F2F5ED]'}`}>
                  {activeResult.voltageMaxPu?.toFixed(3)} pu
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <div className="text-[10px] text-[#788477] font-semibold uppercase">Min Voltage</div>
                <div className={`text-sm font-mono font-bold mt-1 ${activeResult.voltageMinPu && activeResult.voltageMinPu < 0.95 ? 'text-amber-600' : 'text-[#26352A] dark:text-[#F2F5ED]'}`}>
                  {activeResult.voltageMinPu?.toFixed(3)} pu
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <div className="text-[10px] text-[#788477] font-semibold uppercase">Feeder Loading</div>
                <div className={`text-sm font-mono font-bold mt-1 ${activeResult.feederLoadingMaxPct && activeResult.feederLoadingMaxPct > 100.0 ? 'text-red-600' : 'text-[#26352A] dark:text-[#F2F5ED]'}`}>
                  {activeResult.feederLoadingMaxPct?.toFixed(1)}%
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <div className="text-[10px] text-[#788477] font-semibold uppercase">TX Loading</div>
                <div className="text-sm font-mono font-bold text-[#26352A] dark:text-[#F2F5ED] mt-1">
                  {activeResult.transformerLoadingPct?.toFixed(1) || '0.0'}%
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <div className="text-[10px] text-[#788477] font-semibold uppercase">VUF (Unbalance)</div>
                <div className={`text-sm font-mono font-bold mt-1 ${activeResult.vufPercent && activeResult.vufPercent > 2.0 ? 'text-red-600' : 'text-[#26352A] dark:text-[#F2F5ED]'}`}>
                  {activeResult.vufPercent?.toFixed(1)}%
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <div className="text-[10px] text-[#788477] font-semibold uppercase">Violations</div>
                <div className="text-sm font-mono font-bold text-[#26352A] dark:text-[#F2F5ED] mt-1">
                  <span className={activeResult.initialViolations > 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {activeResult.initialViolations} detected
                  </span>
                </div>
              </div>
            </div>

            {/* Recommended Action Summary */}
            <div className="mt-3.5 p-3 rounded-lg bg-[#DDEB9D]/30 dark:bg-[#A0C878]/15 border border-[#A0C878]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#26352A] dark:text-[#E8F0E6]">Recommended Action:</span>
                <span className="text-[#506052] dark:text-[#C2CCC0] font-mono">{activeResult.recommendedAction}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 self-start sm:self-auto"
                onClick={() => handleSelectAndConfigure(activeResult.scenario)}
              >
                Open in Simulation Setup
              </Button>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="p-3.5 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          {/* Grid Type Tabs */}
          <div className="flex items-center gap-1.5 bg-[#FFFDF6] dark:bg-[#151F17] p-1 rounded-lg border border-[#DDD9C9] dark:border-[#2C3C2E] shrink-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${filterType === 'all' ? 'bg-[#A0C878] text-[#26352A] shadow-xs' : 'text-[#788477] hover:text-[#26352A] dark:hover:text-[#F2F5ED]'}`}
            >
              All Scenarios ({scenarios.length})
            </button>
            <button
              onClick={() => setFilterType('industrial')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all ${filterType === 'industrial' ? 'bg-[#A0C878] text-[#26352A] shadow-xs' : 'text-[#788477] hover:text-[#26352A] dark:hover:text-[#F2F5ED]'}`}
            >
              <Factory className="w-3 h-3" />
              11 kV Industrial
            </button>
            <button
              onClick={() => setFilterType('domestic')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all ${filterType === 'domestic' ? 'bg-[#A0C878] text-[#26352A] shadow-xs' : 'text-[#788477] hover:text-[#26352A] dark:hover:text-[#F2F5ED]'}`}
            >
              <Home className="w-3 h-3" />
              230 V Domestic
            </button>
          </div>

          {/* Tag Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${selectedTag === 'all' ? 'bg-[#26352A] text-[#FFFDF6] dark:bg-[#F2F5ED] dark:text-[#151F17]' : 'bg-[#FFFDF6] dark:bg-[#151F17] text-[#788477] border border-[#DDD9C9] dark:border-[#2C3C2E]'}`}
            >
              All Tags
            </button>
            {allTags.slice(0, 6).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(t)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${selectedTag === t ? 'bg-[#26352A] text-[#FFFDF6] dark:bg-[#F2F5ED] dark:text-[#151F17]' : 'bg-[#FFFDF6] dark:bg-[#151F17] text-[#788477] border border-[#DDD9C9] dark:border-[#2C3C2E] hover:border-[#A0C878]'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Scenario Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredScenarios.map((scenario) => {
            const isSelected = selectedScenario.id === scenario.id
            const isInfeasible = scenario.status === 'infeasible'
            const isCurrentlyRunning = runningScenarioId === scenario.id

            return (
              <div
                key={scenario.id}
                className={`p-5 rounded-xl border flex flex-col justify-between transition-all shadow-xs ${
                  isSelected
                    ? 'bg-[#DDEB9D]/35 dark:bg-[#2D3E2F]/60 border-[#A0C878] ring-1 ring-[#A0C878]'
                    : isInfeasible
                    ? 'bg-red-50/60 dark:bg-red-950/20 border-red-300 dark:border-red-900/60 hover:border-red-400'
                    : 'bg-[#FAF6E9] dark:bg-[#1E2B20] border-[#DDD9C9] dark:border-[#2C3C2E] hover:border-[#A0C878]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {scenario.gridType === 'domestic' ? (
                          <Home className="w-3.5 h-3.5 text-[#506052] dark:text-[#A0C878]" />
                        ) : (
                          <Factory className="w-3.5 h-3.5 text-[#506052] dark:text-[#A0C878]" />
                        )}
                        <h3 className="text-sm font-bold text-[#26352A] dark:text-[#F2F5ED] tracking-tight">
                          {scenario.name}
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-[#788477] dark:text-[#859483] mt-0.5 block">
                        Snapshot: {scenario.simulatedTime} • Model: <span className="capitalize">{scenario.gridType || 'Industrial'}</span>
                      </span>
                    </div>
                    <Badge
                      variant={
                        scenario.status === 'optimal'
                          ? 'success'
                          : scenario.status === 'warning'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {scenario.status.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-xs text-[#506052] dark:text-[#C2CCC0] mt-3 leading-relaxed">
                    {scenario.description}
                  </p>

                  {/* Engineering Tags */}
                  {scenario.tags && scenario.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {scenario.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FFFDF6] dark:bg-[#151F17] text-[#788477] border border-[#DDD9C9] dark:border-[#2C3C2E]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] text-center shadow-xs">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-[#788477] dark:text-[#859483] mb-0.5 font-medium">
                        <Sun className="w-3 h-3 text-[#B09B29]" />
                        <span>Solar</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#B09B29] dark:text-[#D4B838]">
                        {scenario.solarKw} kW
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-[#788477] dark:text-[#859483] mb-0.5 font-medium">
                        <Zap className="w-3 h-3 text-[#A0C878]" />
                        <span>Load</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#26352A] dark:text-[#F2F5ED]">
                        {scenario.loadKw} kW
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-[#788477] dark:text-[#859483] mb-0.5 font-medium">
                        <BatteryMedium className="w-3 h-3 text-[#A0C878]" />
                        <span>SOC</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#26352A] dark:text-[#F2F5ED]">
                        {scenario.batterySocPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Physics Indicators */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#788477] dark:text-[#859483] px-1 font-mono">
                    <span>
                      Est. Vmax: <strong className="text-[#26352A] dark:text-[#F2F5ED]">{scenario.peakVoltagePu || 1.02} pu</strong>
                    </span>
                    <span>
                      Feeder: <strong className="text-[#26352A] dark:text-[#F2F5ED]">{scenario.maxFeederLoadingPct || 65}%</strong>
                    </span>
                    <span>
                      VUF: <strong className="text-[#26352A] dark:text-[#F2F5ED]">{scenario.vufPercent || 0.8}%</strong>
                    </span>
                  </div>

                  {/* Expected Violations Note */}
                  <div className="mt-2.5 flex items-center gap-2 text-xs">
                    {scenario.violationsExpected > 0 ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-amber-700 dark:text-amber-400 font-semibold">
                          {scenario.violationsExpected} Violations Expected (IEEE 1547 / EN 50160)
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#A0C878] shrink-0" />
                        <span className="text-[#26352A] dark:text-[#A0C878] font-semibold">
                          Normal Stable Grid (0 Violations)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#DDD9C9] dark:border-[#2C3C2E] grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs w-full gap-1"
                    onClick={() => handleSelectAndConfigure(scenario)}
                  >
                    <span>Configure</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isCurrentlyRunning}
                    className="text-xs w-full gap-1"
                    onClick={() => handleRunInstantSimulation(scenario)}
                  >
                    {isCurrentlyRunning ? (
                      <>
                        <RotateCw className="w-3 h-3 animate-spin" />
                        <span>Solving...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        <span>Run Sim</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PageContainer>
  )
}

export default ScenariosPage
