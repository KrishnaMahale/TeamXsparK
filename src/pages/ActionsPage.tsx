import React, { useMemo } from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { NetworkDigitalTwin } from '../components/network/NetworkDigitalTwin'
import { useCorrectiveActions } from '../hooks/useCorrectiveActions'
import { useGridStore } from '../store/gridStore'
import {
  Wrench,
  RotateCcw,
  BatteryMedium,
  Network,
  Sun,
  XCircle,
  Cpu,
  ChevronDown,
  Layers,
} from 'lucide-react'

export const ActionsPage: React.FC = () => {
  const {
    actions,
    selectedAction,
    isRunning,
    executionResult,
    comparisonData,
    selectAction,
    executeAction,
    resetSimulation,
  } = useCorrectiveActions()

  const [hoveredActionId, setHoveredActionId] = React.useState<string | null>(null)

  const { network } = useGridStore()
  const monitoredBusName =
    comparisonData.monitoredBusName ||
    comparisonData.monitoredBusId ||
    network.buses.find((b) => b.status === 'critical')?.name ||
    network.buses[0]?.name ||
    'Critical Bus'
  const monitoredFeederName =
    comparisonData.monitoredFeederName ||
    comparisonData.monitoredFeederId ||
    network.feeders.find((f) => f.status === 'critical')?.name ||
    network.feeders[0]?.name ||
    'Feeder'
  const targetGridName = comparisonData.gridName || network.name || 'Selected Grid'
  const beforeVoltage =
    comparisonData.b3Voltage?.before ??
    network.buses.find((b) => b.status === 'critical')?.voltage ??
    network.buses[0]?.voltage ??
    1.074
  const beforeFeederLoading =
    comparisonData.f02Loading?.before ??
    network.feeders.find((f) => f.status === 'critical')?.loadingPercent ??
    network.feeders[0]?.loadingPercent ??
    108
  const beforeViolations =
    comparisonData.beforeViolationsCount ??
    network.buses.filter((b) => b.status === 'critical').length

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'battery_discharge':
      case 'max_battery_discharge':
        return <BatteryMedium className="w-5 h-5 text-[#A0C878]" />
      case 'feeder_reconfiguration':
        return <Network className="w-5 h-5 text-[#506052] dark:text-[#C2CCC0]" />
      case 'solar_curtailment':
        return <Sun className="w-5 h-5 text-[#B09B29]" />
      case 'hybrid_plan':
        return <Layers className="w-5 h-5 text-[#A0C878]" />
      default:
        return <Wrench className="w-5 h-5 text-[#788477]" />
    }
  }

  return (
    <PageContainer compact={true}>
      <div className="space-y-5">
        {/* 1. Read-Only Digital Twin Simulation for Active Grid */}
        <div className="rounded-xl border border-[#DDD9C9] dark:border-[#2C3C2E] bg-[#FAF6E9] dark:bg-[#1E2B20] p-3 sm:p-4 shadow-xs">
          <NetworkDigitalTwin
            readOnly={true}
            heightClassName="h-[380px] lg:h-[420px]"
            headerRightExtra={
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={resetSimulation}
                className="text-xs"
              >
                Reset Test
              </Button>
            }
          />
        </div>

        {/* 2. Action Cards Workspace (Interactive Solution Tabs with Dynamic Grid & Expanding Hover) */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#26352A] dark:text-[#F2F5ED] tracking-tight">
                Available Constraint Resolution Interventions
              </h2>
            </div>
          </div>

          {/* Cards Grid: Dynamically fits variable number of candidate cards */}
          <div
            className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch transition-all duration-300 ease-out"
            style={{
              gridTemplateColumns:
                hoveredActionId === null
                  ? undefined
                  : actions.map((a) => (a.id === hoveredActionId ? '1.36fr' : '0.88fr')).join(' '),
            }}
            onMouseLeave={() => setHoveredActionId(null)}
          >
            {actions.map((action) => {
              const isSel = selectedAction?.id === action.id
              const isFeasible = action.isFeasible
              const isHovered = hoveredActionId === action.id
              const hasAnyHover = hoveredActionId !== null
              const isOther = hasAnyHover && !isHovered

              return (
                <div
                  key={action.id}
                  onClick={() => selectAction(action)}
                  onMouseEnter={() => setHoveredActionId(action.id)}
                  className={`w-full min-w-0 overflow-hidden relative rounded-xl border cursor-pointer flex flex-col justify-between transition-all duration-300 ease-out ${
                    isHovered
                      ? 'bg-[#FFFDF6] dark:bg-[#18231A] border-[#A0C878] ring-2 ring-[#A0C878]/40 shadow-md p-4 z-20'
                      : isOther
                      ? 'bg-[#FAF6E9]/80 dark:bg-[#1E2B20]/70 border-[#DDD9C9]/80 dark:border-[#2C3C2E]/80 p-3 opacity-80'
                      : isSel
                      ? 'bg-[#DDEB9D]/30 dark:bg-[#2D3E2F]/50 border-[#A0C878] ring-1 ring-[#A0C878] p-3.5 shadow-xs'
                      : 'bg-[#FAF6E9] dark:bg-[#1E2B20] border-[#DDD9C9] dark:border-[#2C3C2E] hover:border-[#A0C878]/70 p-3.5 shadow-xs'
                  }`}
                >
                  {/* Tab Top / Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`p-1.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] shrink-0 transition-colors ${
                            isHovered || isSel ? 'border-[#A0C878]' : ''
                          }`}
                        >
                          {getActionIcon(action.type)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] uppercase tracking-wide truncate">
                            {action.title}
                          </h3>
                          <span className="text-[10px] text-[#788477] dark:text-[#859483] font-mono block truncate">
                            {action.parameterDelta}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={isFeasible ? 'success' : 'danger'}
                        size="sm"
                        className="shrink-0 text-[10px] px-1.5 py-0.5"
                      >
                        {isFeasible ? 'FEASIBLE' : 'NOT FEASIBLE'}
                      </Badge>
                    </div>

                    {/* Unhovered Glance Target (Fades smoothly, stays in DOM to eliminate any flicker) */}
                    <div
                      className={`mt-2 pt-1.5 border-t border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60 flex items-center justify-between text-[10px] text-[#788477] dark:text-[#859483] transition-opacity duration-200 ${
                        isHovered ? 'opacity-0 h-0 overflow-hidden mt-0 pt-0 border-transparent' : 'opacity-100'
                      }`}
                    >
                      <span className="truncate">
                        Target:{' '}
                        <strong className="font-mono text-[#A0C878] font-bold">
                          {action.expectedVoltagePu} pu
                        </strong>
                      </span>
                      <span className="italic flex items-center gap-0.5 text-[9px] text-[#788477] dark:text-[#859483] shrink-0">
                        Hover for details <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    </div>

                    {/* Expanded Solution Information (ONLY displayed when hovered) */}
                    <div
                      className={`transition-all duration-300 ease-out overflow-hidden ${
                        isHovered
                          ? 'max-h-[380px] opacity-100 mt-2.5 pointer-events-auto'
                          : 'max-h-0 opacity-0 mt-0 pointer-events-none'
                      }`}
                    >
                      <p className="text-xs text-[#506052] dark:text-[#C2CCC0] line-clamp-2 leading-relaxed">
                        {action.description}
                      </p>

                      {!isFeasible && action.infeasibleReason && (
                        <div className="mt-2 p-2 rounded-md bg-red-50/90 dark:bg-red-950/70 border border-red-300 dark:border-red-900/80 text-[11px] text-red-700 dark:text-red-300">
                          <span className="font-bold">Constraint Breach: </span>
                          {action.infeasibleReason}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-[#DDD9C9] dark:border-[#2C3C2E] text-xs">
                        <div className="p-1.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20]">
                          <span className="text-[#788477] dark:text-[#859483] block text-[10px]">
                            Voltage Target:
                          </span>
                          <span className="font-mono font-bold text-[#A0C878] text-[11px]">
                            {action.expectedVoltagePu} pu
                          </span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20]">
                          <span className="text-[#788477] dark:text-[#859483] block text-[10px] truncate">
                            {monitoredFeederName} Load:
                          </span>
                          <span className="font-mono font-bold text-[#26352A] dark:text-[#F2F5ED] text-[11px]">
                            {action.expectedFeederLoadPercent}%
                          </span>
                        </div>
                      </div>

                      <div className="pt-2.5">
                        <Button
                          variant={isSel ? 'primary' : 'secondary'}
                          size="sm"
                          className="w-full text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            selectAction(action)
                            executeAction(action.id)
                          }}
                          disabled={isRunning}
                        >
                          {isSel && executionResult ? 'Simulated ✓' : 'Simulate Action'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 3. Before / After Simulation Outcome Section */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#26352A] dark:text-[#F2F5ED] tracking-tight">
              Simulation Outcome: {selectedAction?.title || 'Feeder Reconfiguration'}
            </h2>
          </div>

          {/* Selected Infeasible Action Callout */}
          {selectedAction && !selectedAction.isFeasible && (
            <div className="p-3.5 rounded-xl bg-red-50/90 dark:bg-red-950/70 border border-red-300 dark:border-red-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED]">
                    Action Infeasible: {selectedAction.title}
                  </h4>
                  <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">
                    {selectedAction.infeasibleReason || 'Requested dispatch exceeds physical battery storage limits.'}
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const alt = actions.find((a) => a.isFeasible)
                  if (alt) {
                    selectAction(alt)
                    executeAction(alt.id)
                  }
                }}
                className="shrink-0 text-xs"
              >
                Try Feasible Action
              </Button>
            </div>
          )}

          {/* Side-by-Side BEFORE / AFTER Panels (Minimal, High-Impact UI) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* BEFORE Panel */}
            <div className={`p-4 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border ${beforeViolations > 0 ? 'border-red-300 dark:border-red-900/80' : 'border-[#DDD9C9] dark:border-[#2C3C2E]'} shadow-xs flex flex-col justify-between transition-all duration-200`}>
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-[#DDD9C9] dark:border-[#2C3C2E]">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${beforeViolations > 0 ? 'bg-red-500 animate-pulse' : 'bg-[#A0C878]'}`} />
                    <h3 className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] uppercase tracking-wider">Before Dispatch</h3>
                  </div>
                  <Badge variant={beforeViolations > 0 ? 'danger' : 'success'} size="sm">
                    {beforeViolations > 0 ? 'Unsafe State' : 'Nominal'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-3">
                  {/* Bus Voltage */}
                  <div className="p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/80 dark:border-[#2C3C2E]">
                    <span className="text-[10px] text-[#788477] dark:text-[#859483] block truncate">{monitoredBusName} Voltage</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className={`text-lg font-bold font-mono ${beforeVoltage > 1.05 ? 'text-red-600 dark:text-red-400' : 'text-[#A0C878]'}`}>
                        {beforeVoltage.toFixed(3)}
                      </span>
                      <span className="text-[10px] text-[#788477] dark:text-[#859483] font-mono">pu</span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 rounded">
                      +{(beforeVoltage - 1.05).toFixed(3)} pu Over Limit
                    </span>
                  </div>

                  {/* Feeder Loading */}
                  <div className="p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/80 dark:border-[#2C3C2E]">
                    <span className="text-[10px] text-[#788477] dark:text-[#859483] block truncate">{monitoredFeederName} Loading</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className={`text-lg font-bold font-mono ${beforeFeederLoading > 100 ? 'text-red-600 dark:text-red-400' : 'text-[#26352A] dark:text-[#F2F5ED]'}`}>
                        {beforeFeederLoading.toFixed(0)}%
                      </span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 rounded">
                      +{beforeFeederLoading - 100}% Thermal Overload
                    </span>
                  </div>

                  {/* Active Violations */}
                  <div className="p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/80 dark:border-[#2C3C2E]">
                    <span className="text-[10px] text-[#788477] dark:text-[#859483] block">Active Violations</span>
                    <div className="text-lg font-bold font-mono text-red-600 dark:text-red-400 mt-0.5">
                      {beforeViolations} Active
                    </div>
                    <span className="text-[10px] text-red-600/80 dark:text-red-400/80 block mt-1">
                      Critical Operating State
                    </span>
                  </div>

                  {/* Solar Utilization */}
                  <div className="p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/80 dark:border-[#2C3C2E]">
                    <span className="text-[10px] text-[#788477] dark:text-[#859483] block">Solar Generation</span>
                    <div className="text-lg font-bold font-mono text-[#B09B29] dark:text-[#D4B838] mt-0.5">
                      {comparisonData.solarUsed?.before ? `${comparisonData.solarUsed.before.toFixed(0)} kW` : '240 kW'}
                    </div>
                    <span className="text-[10px] text-[#788477] dark:text-[#859483] block mt-1">
                      100% Full Yield
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AFTER Panel */}
            <div className="p-4 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#A0C878] dark:border-[#A0C878]/70 shadow-xs flex flex-col justify-between transition-all duration-200">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-[#DDD9C9] dark:border-[#2C3C2E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A0C878] shadow-xs" />
                    <h3 className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] uppercase tracking-wider">After Dispatch</h3>
                  </div>
                  <Badge variant={selectedAction?.isFeasible ? 'success' : 'danger'} size="sm">
                    {selectedAction?.isFeasible ? 'Grid Safe & Compliant' : 'Unresolved'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-3">
                  {/* Resolved Bus Voltage */}
                  <div className="p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/80 dark:border-[#2C3C2E]">
                    <span className="text-[10px] text-[#788477] dark:text-[#859483] block truncate">{monitoredBusName} Voltage</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-lg font-bold font-mono text-[#A0C878]">
                        {selectedAction?.isFeasible
                          ? selectedAction.expectedVoltagePu?.toFixed(3)
                          : beforeVoltage.toFixed(3)}
                      </span>
                      <span className="text-[10px] text-[#788477] dark:text-[#859483] font-mono">pu</span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-medium text-[#A0C878] bg-[#A0C878]/15 px-1.5 py-0.5 rounded">
                      Nominal Bandwidth ✓
                    </span>
                  </div>

                  {/* Resolved Feeder Loading */}
                  <div className="p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/80 dark:border-[#2C3C2E]">
                    <span className="text-[10px] text-[#788477] dark:text-[#859483] block truncate">{monitoredFeederName} Loading</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-lg font-bold font-mono text-[#A0C878]">
                        {selectedAction?.isFeasible
                          ? `${selectedAction.expectedFeederLoadPercent}%`
                          : `${beforeFeederLoading.toFixed(0)}%`}
                      </span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-medium text-[#A0C878] bg-[#A0C878]/15 px-1.5 py-0.5 rounded">
                      Below Thermal Limit ✓
                    </span>
                  </div>

                  {/* Remaining Violations */}
                  <div className="p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/80 dark:border-[#2C3C2E]">
                    <span className="text-[10px] text-[#788477] dark:text-[#859483] block">Remaining Violations</span>
                    <div className="text-lg font-bold font-mono text-[#A0C878] mt-0.5">
                      {selectedAction?.isFeasible ? `${selectedAction.remainingViolationsCount ?? 0} Breaches` : `${beforeViolations} Breaches`}
                    </div>
                    <span className="text-[10px] text-[#A0C878] block mt-1">
                      {selectedAction?.isFeasible ? 'All Constraints Cleared ✓' : 'Violation Persists'}
                    </span>
                  </div>

                  {/* Renewable Retained */}
                  <div className="p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/80 dark:border-[#2C3C2E]">
                    <span className="text-[10px] text-[#788477] dark:text-[#859483] block">Renewable Kept</span>
                    <div className="text-lg font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-0.5">
                      {selectedAction?.renewableUtilizationPercent ?? 100}%
                    </div>
                    <span className={`text-[10px] block mt-1 ${selectedAction?.id === 'solar_curtailment' ? 'text-amber-600 dark:text-amber-400' : 'text-[#A0C878]'}`}>
                      {selectedAction?.id === 'solar_curtailment' ? 'Solar Curtailed' : 'Zero Curtailment'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Compare Corrective Measures Table (Subtitle Removed, Clear Comparative Columns) */}
        <Card className="transition-all duration-200">
          <CardHeader
            title="Compare Corrective Measures"
            icon={<Wrench className="w-4 h-4 text-[#A0C878]" />}
          />
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[760px]">
              <thead className="bg-[#F3EEDC] dark:bg-[#18231A] text-[#788477] dark:text-[#859483] uppercase text-[10px] tracking-wider border-b border-[#DDD9C9] dark:border-[#2C3C2E]">
                <tr>
                  <th className="py-3 px-4 font-bold">Intervention Measure</th>
                  <th className="py-3 px-3 font-bold">{monitoredBusName} Voltage</th>
                  <th className="py-3 px-3 font-bold">{monitoredFeederName} Load</th>
                  <th className="py-3 px-3 font-bold">Clean Solar Kept</th>
                  <th className="py-3 px-3 font-bold">Battery SOC</th>
                  <th className="py-3 px-3 font-bold">Violations</th>
                  <th className="py-3 px-3 font-bold">Feasibility</th>
                  <th className="py-3 px-4 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9C9] dark:divide-[#2C3C2E] text-[#26352A] dark:text-[#F2F5ED]">
                {actions.map((act) => {
                  const isCurSel = selectedAction?.id === act.id
                  const isFeas = act.isFeasible
                  const isVoltHigh = act.expectedVoltagePu > 1.05
                  const isLoadHigh = act.expectedFeederLoadPercent > 100

                  return (
                    <tr
                      key={act.id}
                      onClick={() => selectAction(act)}
                      className={`transition-colors cursor-pointer ${
                        isCurSel
                          ? 'bg-[#DDEB9D]/30 dark:bg-[#2D3E2F]/50 font-medium'
                          : 'hover:bg-[#FAF6E9] dark:hover:bg-[#1E2B20]/60'
                      }`}
                    >
                      {/* Measure Name & Delta */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] shrink-0">
                            {getActionIcon(act.type)}
                          </div>
                          <div>
                            <div className="font-bold text-[#26352A] dark:text-[#F2F5ED] flex items-center gap-1.5">
                              <span>{act.title}</span>
                              {isCurSel && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#A0C878] text-[#151F17] font-semibold">
                                  Selected
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#788477] dark:text-[#859483] font-mono">
                              {act.parameterDelta}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Voltage */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-[11px]">
                          <span className={isVoltHigh ? 'text-red-600 dark:text-red-400' : 'text-[#A0C878]'}>
                            {act.expectedVoltagePu.toFixed(3)} pu
                          </span>
                        </div>
                        <span className={`text-[9px] font-medium ${isVoltHigh ? 'text-red-600 dark:text-red-400' : 'text-[#A0C878]'}`}>
                          {isVoltHigh ? 'Over Voltage' : 'Nominal ✓'}
                        </span>
                      </td>

                      {/* Feeder Load */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-[11px]">
                          <span className={isLoadHigh ? 'text-red-600 dark:text-red-400' : 'text-[#26352A] dark:text-[#F2F5ED]'}>
                            {act.expectedFeederLoadPercent}%
                          </span>
                        </div>
                        <span className={`text-[9px] font-medium ${isLoadHigh ? 'text-red-600 dark:text-red-400' : 'text-[#A0C878]'}`}>
                          {isLoadHigh ? 'Thermal Overload' : 'Safe Margin ✓'}
                        </span>
                      </td>

                      {/* Clean Solar Kept */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-medium text-[11px] text-[#B09B29] dark:text-[#D4B838]">
                          {act.solarUsedKw} kW
                        </div>
                        <span className="text-[9px] text-[#788477] dark:text-[#859483]">
                          {act.id === 'solar_curtailment' ? 'Curtailed' : '100% Kept'}
                        </span>
                      </td>

                      {/* Battery SOC */}
                      <td className="py-3 px-3">
                        <div className={`font-mono font-medium text-[11px] ${act.batterySocPercent <= 20 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-[#506052] dark:text-[#C2CCC0]'}`}>
                          {act.batterySocPercent}%
                        </div>
                        <span className={`text-[9px] ${act.batterySocPercent <= 20 ? 'text-red-600 dark:text-red-400' : 'text-[#788477] dark:text-[#859483]'}`}>
                          {act.batterySocPercent <= 20 ? 'Depleted (≤20%)' : 'Reserve OK'}
                        </span>
                      </td>

                      {/* Violations Remaining */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                            act.remainingViolationsCount === 0
                              ? 'bg-[#A0C878]/20 text-[#26352A] dark:text-[#A0C878]'
                              : 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300'
                          }`}
                        >
                          {act.remainingViolationsCount === 0 ? '0 (Cleared ✓)' : `${act.remainingViolationsCount} Active`}
                        </span>
                      </td>

                      {/* Physical Feasibility */}
                      <td className="py-3 px-3">
                        <Badge variant={isFeas ? 'success' : 'danger'} size="sm">
                          {isFeas ? 'FEASIBLE' : 'INFEASIBLE'}
                        </Badge>
                        {!isFeas && act.infeasibleReason && (
                          <div className="text-[9px] text-red-600 dark:text-red-400 mt-0.5 max-w-[140px] truncate" title={act.infeasibleReason}>
                            {act.infeasibleReason}
                          </div>
                        )}
                      </td>

                      {/* Quick Action Button */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant={isCurSel ? 'primary' : 'secondary'}
                          size="sm"
                          className="text-[11px] py-1 px-2.5"
                          onClick={(e) => {
                            e.stopPropagation()
                            selectAction(act)
                            executeAction(act.id)
                          }}
                          disabled={isRunning}
                        >
                          {isCurSel && executionResult ? 'Tested ✓' : 'Simulate'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

export default ActionsPage
