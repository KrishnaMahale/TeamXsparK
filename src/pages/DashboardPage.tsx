import React, { useEffect } from 'react'
import { Network2D } from '../components/network/Network2D'
import { NetworkStatus } from '../components/dashboard/NetworkStatus'
import { ComponentDetailsPanel } from '../components/dashboard/BusDetails'
import { useSimulationStore } from '../store/simulationStore'
import { useGridStore } from '../store/gridStore'
import { useDomesticStore } from '../store/domesticStore'
import { GridTypeSwitcher } from '../components/layout/GridTypeSwitcher'
import { DomesticDashboardView } from '../components/domestic/DomesticDashboardView'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import {
  Activity,
  Clock,
  Sun,
  TrendingDown,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const { input, fullResult, isRunning, selectedAction, comparisonData, fetchActions } = useSimulationStore()
  const { currentTime, network, violationSummary, selectedComponent, isResolved, activeActionApplied, fetchNetwork } = useGridStore()
  const { gridType } = useDomesticStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchNetwork()
    fetchActions()
  }, [fetchNetwork, fetchActions])

  // Calculate live power values directly from digital twin network assets
  const currentSolarKw = network.solarUnits.length > 0
    ? network.solarUnits.reduce((acc, s) => acc + (s.generationKw || 0), 0)
    : (fullResult?.summary.solarKw ?? input.currentSolarKw)
  const currentLoadKw = network.loads.length > 0
    ? network.loads.reduce((acc, l) => acc + (l.powerKw || 0), 0)
    : (fullResult?.summary.loadKw ?? input.currentLoadKw)
  const scenarioName = fullResult?.summary.scenarioName || input.scenarioName

  const hasCritical = violationSummary.critical > 0
  const hasWarning = violationSummary.warning > 0

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto w-full min-w-0">
      {/* 0. Primary Grid Type Switcher: Industrial vs Domestic Rooftop Solar */}
      <GridTypeSwitcher />

      {gridType === 'domestic' ? (
        <DomesticDashboardView />
      ) : (
        <>
          {/* 1. Header Bar: Scenario & Action Shortcuts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#111C35] border border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                Scenario: {scenarioName}
              </h2>
              <Badge variant={hasCritical ? 'danger' : 'success'} size="sm">
                {hasCritical ? 'Violations Active' : 'Normal / Grid Safe'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Time-series AC power flow model • 11 kV radial distribution feeder
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            onClick={() => navigate('/simulation')}
          >
            Configure Scenario
          </Button>
          <Button
            variant={hasCritical ? 'primary' : 'secondary'}
            size="sm"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => navigate('/actions')}
          >
            {hasCritical ? 'Resolve Violations' : 'Review Actions'}
          </Button>
        </div>
      </div>

      {/* 2. Top Summary Cards (4 small clean cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Simulation Status */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Simulation Status</div>
              <div className="text-lg font-bold text-white mt-1">
                {isRunning ? 'CALCULATING' : hasCritical ? 'ATTENTION' : 'SAFE'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {hasCritical ? `${violationSummary.critical} critical issues` : '0 Issues • Within IEEE 1547'}
              </div>
            </div>
            <div className={`p-2.5 rounded-lg ${hasCritical ? 'bg-red-950/80 text-red-400 border border-red-800' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'}`}>
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Current Time */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Simulation Time</div>
              <div className="text-lg font-bold text-white font-mono mt-1">{currentTime}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Scrub in top header</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#16223F] text-blue-400 border border-[#273859]">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Solar Generation */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Solar Generation</div>
              <div className="text-lg font-bold text-amber-400 font-mono mt-1">{currentSolarKw} kW</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Capacity: {input.installedSolarCapacityKw} kW</div>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800">
              <Sun className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Load Demand */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Load Demand</div>
              <div className="text-lg font-bold text-blue-400 font-mono mt-1">{currentLoadKw} kW</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Peak Load: {input.peakLoadKw} kW</div>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-800">
              <TrendingDown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Digital Twin & Grid Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Large Contained Digital Twin (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Digital Twin Network Schematic
              </span>
              <span className="text-[11px] text-slate-500 font-mono">(4 Buses • 3 Feeders • 1 BESS)</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Click any component to inspect telemetry
            </span>
          </div>

          <Network2D />
        </div>

        {/* Right: Grid Status & Selected Component (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <NetworkStatus />
          {selectedComponent ? (
            <ComponentDetailsPanel />
          ) : (
            <Card>
              <CardContent className="p-5 text-center text-slate-400">
                <div className="text-xs font-medium text-slate-300">Component Telemetry</div>
                <p className="text-xs text-slate-500 mt-1">
                  Select Bus B3, Feeder F-02, Solar, or Battery on the schematic to inspect voltage, current, and temperature limits.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 4. Bottom Section: Quick Action & Before/After Snapshot */}
      <div className="p-5 rounded-xl bg-[#111C35] border border-[#1E293B] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
            hasCritical
              ? 'bg-red-600/20 border-red-500/40 text-red-400'
              : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
          }`}>
            {hasCritical ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                Optimization Engine: {activeActionApplied?.title || selectedAction?.title || 'Feeder Reconfiguration (F-02 → F-03)'}
              </h3>
              <Badge variant={hasCritical ? 'primary' : 'success'} size="sm">
                {hasCritical ? 'Recommended' : 'Dispatched & Resolved ✓'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {hasCritical
                ? 'Resolves Bus B3 over-voltage (1.074 pu → 1.038 pu) and Feeder F-02 overload (108% → 92%) by transferring 40 kW of solar surplus to tie-line F-03 while maintaining 96% renewable utilization.'
                : 'All voltage and thermal constraints successfully cleared. Distribution grid operating within IEEE 1547 parameters.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            onClick={() => navigate('/actions')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {hasCritical ? 'Resolve Violations' : 'Review Action Results'}
          </Button>
        </div>
      </div>
        </>
      )}
    </div>
  )
}
