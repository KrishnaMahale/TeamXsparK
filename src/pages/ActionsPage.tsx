import React from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { NetworkDigitalTwin } from '../components/network/NetworkDigitalTwin'
import { SequentialTrajectoryView } from '../components/actions/SequentialTrajectoryView'
import { useCorrectiveActions } from '../hooks/useCorrectiveActions'
import { useGridStore } from '../store/gridStore'
import { useSimulationStore } from '../store/simulationStore'
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
  const [viewMode, setViewMode] = React.useState<'snapshot' | 'sequential'>('snapshot')

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

  const { network, currentTime } = useGridStore()
  const { input } = useSimulationStore()
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
        <div className="rounded-2xl border border-[#BBF7D0]/70 dark:border-[#86EFAC]/20 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md p-3 sm:p-4 shadow-[0_8px_30px_rgba(16,80,55,0.06)]">
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

        {/* View Mode Toggle: Single Snapshot vs Sequential Trajectory Plan (MPC) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-white/80 dark:bg-[#122C1F]/80 backdrop-blur-md border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-xs">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F0FDF4] dark:bg-[#064E3B]/40 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
            <button
              onClick={() => setViewMode('snapshot')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'snapshot'
                  ? 'bg-[#047857] text-white shadow-xs'
                  : 'text-[#52665A] dark:text-[#A7F3D0] hover:text-[#10251A] dark:hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Single-Snapshot Dispatch</span>
            </button>
            <button
              onClick={() => setViewMode('sequential')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'sequential'
                  ? 'bg-[#047857] text-white shadow-xs'
                  : 'text-[#52665A] dark:text-[#A7F3D0] hover:text-[#10251A] dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sequential MPC Trajectory (8+ Steps)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#52665A] dark:text-[#A7F3D0]">
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-[#F0FDF4] dark:bg-[#064E3B]/40 border border-[#BBF7D0]/40">
              Active Strategy: {viewMode === 'snapshot' ? 'Instantaneous Corrective Dispatch' : 'Multi-Step Receding-Horizon Plan'}
            </span>
          </div>
        </div>

        {viewMode === 'sequential' ? (
          <SequentialTrajectoryView
            gridId={network.id}
            gridName={targetGridName}
            simulationDate={input.simulationDate}
            currentTime={currentTime}
          />
        ) : (
          <>
            {/* 2. Action Cards Workspace (Interactive Solution Tabs with Dynamic Grid & Expanding Hover) */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#10251A] dark:text-[#ECFDF3] tracking-tight">
                    Available Constraint Resolution Interventions
                  </h2>
                </div>
              </div>

          {/* Cards Grid: Dynamically fits candidate cards with consistent responsive grid */}
          <div
            className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 items-stretch"
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
                  className={`w-full min-w-0 overflow-hidden relative rounded-2xl border cursor-pointer flex flex-col justify-between transition-all duration-200 ${
                    isHovered
                      ? 'bg-white dark:bg-[#163826] border-[#047857] dark:border-[#86EFAC] ring-2 ring-[#10B981]/40 shadow-lg p-4 z-10 scale-[1.02]'
                      : isOther
                      ? 'bg-white/80 dark:bg-[#122C1F]/80 border-[#BBF7D0]/50 dark:border-[#86EFAC]/15 p-3.5 opacity-85'
                      : isSel
                      ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 border-[#047857] dark:border-[#86EFAC] ring-2 ring-[#10B981]/30 p-3.5 shadow-sm'
                      : 'bg-white/95 dark:bg-[#122C1F]/90 border-[#BBF7D0]/70 dark:border-[#86EFAC]/20 hover:border-[#10B981] p-3.5 shadow-xs'
                  }`}
                >
                  {/* Tab Top / Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={`p-1.5 rounded-xl bg-[#F0FDF4] dark:bg-[#064E3B]/50 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/30 shrink-0 transition-colors ${
                            isHovered || isSel ? 'border-[#047857] dark:border-[#86EFAC]' : ''
                          }`}
                        >
                          {getActionIcon(action.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-[#10251A] dark:text-[#ECFDF3] uppercase tracking-wide truncate">
                              {action.isHybrid ? 'Hybrid Action Plan' : action.title}
                            </h3>
                            {action.isHybrid && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#ECFDF3] text-[#047857] dark:bg-[#064E3B] dark:text-[#86EFAC] border border-[#BBF7D0] dark:border-[#86EFAC]/30 shrink-0">
                                HYBRID
                              </span>
                            )}
                          </div>
                          <span
                            className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] font-mono block truncate"
                            title={action.parameterDelta}
                          >
                            {action.parameterDelta}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={isFeasible ? 'success' : 'danger'}
                        size="sm"
                        className="shrink-0 text-[10px] px-1.5 py-0.5"
                      >
                        {isFeasible ? 'FEASIBLE' : 'INFEASIBLE'}
                      </Badge>
                    </div>

                    {/* Unhovered Glance Target (Fades smoothly, stays in DOM to eliminate any flicker) */}
                    <div
                      className={`mt-2 pt-1.5 border-t border-[#BBF7D0]/50 dark:border-[#86EFAC]/20 flex items-center justify-between text-[10px] text-[#52665A] dark:text-[#A7F3D0] transition-opacity duration-200 ${
                        isHovered ? 'opacity-0 h-0 overflow-hidden mt-0 pt-0 border-transparent' : 'opacity-100'
                      }`}
                    >
                      <span className="truncate">
                        Target:{' '}
                        <strong className="font-mono text-[#047857] dark:text-[#86EFAC] font-bold">
                          {action.expectedVoltagePu} pu
                        </strong>
                      </span>
                      <span className="italic flex items-center gap-0.5 text-[9px] text-[#52665A] dark:text-[#A7F3D0] shrink-0">
                        Details <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    </div>

                    {/* Expanded Solution Information (Displayed when hovered) */}
                    <div
                      className={`transition-all duration-300 ease-out overflow-hidden ${
                        isHovered
                          ? 'max-h-[380px] opacity-100 mt-2.5 pointer-events-auto'
                          : 'max-h-0 opacity-0 mt-0 pointer-events-none'
                      }`}
                    >
                      <p className="text-xs text-[#52665A] dark:text-[#A7F3D0] line-clamp-2 leading-relaxed">
                        {action.description}
                      </p>

                      {/* Constituent action tags for hybrid plans */}
                      {action.isHybrid && action.constituentActions && action.constituentActions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {action.constituentActions.map((c, i) => (
                            <span
                              key={i}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-[#F0FDF4] dark:bg-[#064E3B]/60 border border-[#BBF7D0]/70 dark:border-[#86EFAC]/30 text-[#047857] dark:text-[#86EFAC] font-mono"
                            >
                              {c === 'battery_discharge'
                                ? 'BESS Dispatch'
                                : c === 'solar_curtailment'
                                ? 'Solar Curtailment'
                                : c === 'feeder_reconfiguration'
                                ? 'Feeder Switching'
                                : c}
                            </span>
                          ))}
                        </div>
                      )}

                      {!isFeasible && action.infeasibleReason && (
                        <div className="mt-2 p-2 rounded-lg bg-red-50/90 dark:bg-red-950/70 border border-red-300 dark:border-red-900/80 text-[11px] text-red-700 dark:text-red-300">
                          <span className="font-bold">Constraint Breach: </span>
                          {action.infeasibleReason}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 text-xs">
                        <div className="p-1.5 rounded-lg bg-[#F7FCF9] dark:bg-[#064E3B]/40">
                          <span className="text-[#52665A] dark:text-[#A7F3D0] block text-[10px]">
                            Voltage Target:
                          </span>
                          <span className="font-mono font-bold text-[#047857] dark:text-[#86EFAC] text-[11px]">
                            {action.expectedVoltagePu} pu
                          </span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-[#F7FCF9] dark:bg-[#064E3B]/40">
                          <span className="text-[#52665A] dark:text-[#A7F3D0] block text-[10px] truncate">
                            {monitoredFeederName} Load:
                          </span>
                          <span className="font-mono font-bold text-[#10251A] dark:text-[#ECFDF3] text-[11px]">
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
            <h2 className="text-sm font-bold text-[#10251A] dark:text-[#ECFDF3] tracking-tight">
              Simulation Outcome: {selectedAction?.title || 'Feeder Reconfiguration'}
            </h2>
          </div>

          {/* Selected Infeasible Action Callout */}
          {selectedAction && !selectedAction.isFeasible && (
            <div className="p-3.5 rounded-2xl bg-red-50/90 dark:bg-red-950/70 border border-red-300 dark:border-red-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#10251A] dark:text-[#ECFDF3]">
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
            <div className={`p-4 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border ${beforeViolations > 0 ? 'border-red-300 dark:border-red-900/80' : 'border-[#BBF7D0]/60 dark:border-[#86EFAC]/20'} shadow-[0_8px_30px_rgba(16,80,55,0.06)] flex flex-col justify-between transition-all duration-200`}>
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${beforeViolations > 0 ? 'bg-red-500 animate-pulse' : 'bg-[#10B981]'}`} />
                    <h3 className="text-xs font-bold text-[#10251A] dark:text-[#ECFDF3] uppercase tracking-wider">Before Dispatch</h3>
                  </div>
                  <Badge variant={beforeViolations > 0 ? 'danger' : 'success'} size="sm">
                    {beforeViolations > 0 ? 'Unsafe State' : 'Nominal'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-3">
                  {/* Bus Voltage */}
                  <div className="p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#064E3B]/40 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                    <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block truncate">{monitoredBusName} Voltage</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className={`text-lg font-bold font-mono ${beforeVoltage > 1.05 ? 'text-red-600 dark:text-red-400' : 'text-[#047857] dark:text-[#86EFAC]'}`}>
                        {beforeVoltage.toFixed(3)}
                      </span>
                      <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] font-mono">pu</span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 rounded">
                      +{(beforeVoltage - 1.05).toFixed(3)} pu Over Limit
                    </span>
                  </div>

                  {/* Feeder Loading */}
                  <div className="p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#064E3B]/40 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                    <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block truncate">{monitoredFeederName} Loading</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className={`text-lg font-bold font-mono ${beforeFeederLoading > 100 ? 'text-red-600 dark:text-red-400' : 'text-[#10251A] dark:text-[#ECFDF3]'}`}>
                        {beforeFeederLoading.toFixed(0)}%
                      </span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 rounded">
                      +{beforeFeederLoading - 100}% Thermal Overload
                    </span>
                  </div>

                  {/* Active Violations */}
                  <div className="p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#064E3B]/40 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                    <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block">Active Violations</span>
                    <div className="text-lg font-bold font-mono text-red-600 dark:text-red-400 mt-0.5">
                      {beforeViolations} Active
                    </div>
                    <span className="text-[10px] text-red-600/80 dark:text-red-400/80 block mt-1">
                      Critical Operating State
                    </span>
                  </div>

                  {/* Solar Utilization */}
                  <div className="p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#064E3B]/40 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                    <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block">Solar Generation</span>
                    <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                      {comparisonData.solarUsed?.before ? `${comparisonData.solarUsed.before.toFixed(0)} kW` : '240 kW'}
                    </div>
                    <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block mt-1">
                      100% Full Yield
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AFTER Panel */}
            {(() => {
              const isExecuted = executionResult && executionResult.actionId === selectedAction?.id
              const afterVoltage = isExecuted
                ? executionResult.afterState.b3Voltage
                : (selectedAction?.isFeasible && selectedAction.expectedVoltagePu !== undefined
                  ? selectedAction.expectedVoltagePu
                  : beforeVoltage)
              const afterFeederLoading = isExecuted
                ? executionResult.afterState.f02LoadingPercent
                : (selectedAction?.isFeasible && selectedAction.expectedFeederLoadPercent !== undefined
                  ? selectedAction.expectedFeederLoadPercent
                  : beforeFeederLoading)
              const afterViolations = isExecuted
                ? executionResult.afterState.violationsCount
                : (selectedAction?.isFeasible && selectedAction.remainingViolationsCount !== undefined
                  ? selectedAction.remainingViolationsCount
                  : beforeViolations)
              const isSafe = selectedAction?.isFeasible && afterViolations === 0
              const isPartial = selectedAction?.isFeasible && afterViolations > 0 && afterViolations < beforeViolations

              return (
                <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#047857]/60 dark:border-[#86EFAC]/50 shadow-[0_8px_30px_rgba(16,80,55,0.06)] flex flex-col justify-between transition-all duration-200">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isSafe ? 'bg-[#10B981]' : isPartial ? 'bg-amber-500' : 'bg-red-500'} shadow-xs`} />
                        <h3 className="text-xs font-bold text-[#10251A] dark:text-[#ECFDF3] uppercase tracking-wider">After Dispatch</h3>
                        {isExecuted && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[#ECFDF3] text-[#047857] dark:bg-[#064E3B] dark:text-[#86EFAC]">
                            MEASURED
                          </span>
                        )}
                      </div>
                      <Badge variant={isSafe ? 'success' : isPartial ? 'warning' : 'danger'} size="sm">
                        {isSafe ? 'Grid Safe & Compliant' : isPartial ? 'Partially Resolved' : 'Unresolved'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 mt-3">
                      {/* Resolved Bus Voltage */}
                      <div className="p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#064E3B]/40 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                        <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block truncate">{monitoredBusName} Voltage</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className={`text-lg font-bold font-mono ${afterVoltage > 1.05 || afterVoltage < 0.95 ? 'text-red-600 dark:text-red-400' : 'text-[#047857] dark:text-[#86EFAC]'}`}>
                            {afterVoltage.toFixed(3)}
                          </span>
                          <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] font-mono">pu</span>
                        </div>
                        <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          afterVoltage <= 1.05 && afterVoltage >= 0.95
                            ? 'text-[#047857] dark:text-[#86EFAC] bg-[#ECFDF3] dark:bg-[#064E3B]/50'
                            : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60'
                        }`}>
                          {afterVoltage <= 1.05 && afterVoltage >= 0.95 ? 'Nominal Bandwidth ✓' : 'Out of Bandwidth'}
                        </span>
                      </div>

                      {/* Resolved Feeder Loading */}
                      <div className="p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#064E3B]/40 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                        <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block truncate">{monitoredFeederName} Loading</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className={`text-lg font-bold font-mono ${afterFeederLoading > 100 ? 'text-red-600 dark:text-red-400' : 'text-[#047857] dark:text-[#86EFAC]'}`}>
                            {afterFeederLoading.toFixed(0)}%
                          </span>
                        </div>
                        <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          afterFeederLoading <= 100
                            ? 'text-[#047857] dark:text-[#86EFAC] bg-[#ECFDF3] dark:bg-[#064E3B]/50'
                            : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60'
                        }`}>
                          {afterFeederLoading <= 100 ? 'Below Thermal Limit ✓' : 'Thermal Overload'}
                        </span>
                      </div>

                      {/* Remaining Violations */}
                      <div className="p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#064E3B]/40 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                        <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block">Remaining Violations</span>
                        <div className={`text-lg font-bold font-mono mt-0.5 ${afterViolations === 0 ? 'text-[#047857] dark:text-[#86EFAC]' : 'text-red-600 dark:text-red-400'}`}>
                          {afterViolations} Breaches
                        </div>
                        <span className={`text-[10px] block mt-1 ${isSafe ? 'text-[#047857] dark:text-[#86EFAC]' : isPartial ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isSafe ? 'All Constraints Cleared ✓' : isPartial ? `${afterViolations} Violations Remain` : 'Violation Persists'}
                        </span>
                      </div>

                      {/* Renewable Retained */}
                      <div className="p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#064E3B]/40 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                        <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block">Renewable Kept</span>
                        <div className="text-lg font-bold font-mono text-[#10251A] dark:text-[#ECFDF3] mt-0.5">
                          {selectedAction?.renewableUtilizationPercent ?? 100}%
                        </div>
                        <span className={`text-[10px] block mt-1 ${selectedAction?.id === 'solar_curtailment' ? 'text-amber-600 dark:text-amber-400' : 'text-[#047857] dark:text-[#86EFAC]'}`}>
                          {selectedAction?.id === 'solar_curtailment' ? 'Solar Curtailed' : 'Zero Curtailment'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* 4. Compare Corrective Measures Table (Subtitle Removed, Clear Comparative Columns) */}
        <Card className="transition-all duration-200">
          <CardHeader
            title="Compare Corrective Measures"
            icon={<Wrench className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
          />
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[760px]">
              <thead className="bg-[#F0FDF4] dark:bg-[#064E3B]/40 text-[#52665A] dark:text-[#A7F3D0] uppercase text-[10px] tracking-wider border-b border-[#BBF7D0]/60 dark:border-[#86EFAC]/20">
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
              <tbody className="divide-y divide-[#BBF7D0]/40 dark:divide-[#86EFAC]/15 text-[#10251A] dark:text-[#ECFDF3]">
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
                          ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 font-medium'
                          : 'hover:bg-[#F0FDF4]/70 dark:hover:bg-[#064E3B]/20'
                      }`}
                    >
                      {/* Measure Name & Delta */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-[#F0FDF4] dark:bg-[#064E3B]/50 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shrink-0">
                            {getActionIcon(act.type)}
                          </div>
                          <div>
                            <div className="font-bold text-[#10251A] dark:text-[#ECFDF3] flex items-center gap-1.5">
                              <span>{act.title}</span>
                              {isCurSel && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#047857] text-white dark:bg-[#86EFAC] dark:text-[#064E3B] font-semibold">
                                  Selected
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] font-mono">
                              {act.parameterDelta}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Voltage */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-[11px]">
                          <span className={isVoltHigh ? 'text-red-600 dark:text-red-400' : 'text-[#047857] dark:text-[#86EFAC]'}>
                            {act.expectedVoltagePu.toFixed(3)} pu
                          </span>
                        </div>
                        <span className={`text-[9px] font-medium ${isVoltHigh ? 'text-red-600 dark:text-red-400' : 'text-[#047857] dark:text-[#86EFAC]'}`}>
                          {isVoltHigh ? 'Over Voltage' : 'Nominal ✓'}
                        </span>
                      </td>

                      {/* Feeder Load */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-[11px]">
                          <span className={isLoadHigh ? 'text-red-600 dark:text-red-400' : 'text-[#10251A] dark:text-[#ECFDF3]'}>
                            {act.expectedFeederLoadPercent}%
                          </span>
                        </div>
                        <span className={`text-[9px] font-medium ${isLoadHigh ? 'text-red-600 dark:text-red-400' : 'text-[#047857] dark:text-[#86EFAC]'}`}>
                          {isLoadHigh ? 'Thermal Overload' : 'Safe Margin ✓'}
                        </span>
                      </td>

                      {/* Clean Solar Kept */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-medium text-[11px] text-amber-600 dark:text-amber-400">
                          {act.solarUsedKw} kW
                        </div>
                        <span className="text-[9px] text-[#52665A] dark:text-[#A7F3D0]">
                          {act.id === 'solar_curtailment' ? 'Curtailed' : '100% Kept'}
                        </span>
                      </td>

                      {/* Battery SOC */}
                      <td className="py-3 px-3">
                        <div className={`font-mono font-medium text-[11px] ${act.batterySocPercent <= 20 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-[#52665A] dark:text-[#A7F3D0]'}`}>
                          {act.batterySocPercent}%
                        </div>
                        <span className={`text-[9px] ${act.batterySocPercent <= 20 ? 'text-red-600 dark:text-red-400' : 'text-[#52665A] dark:text-[#A7F3D0]'}`}>
                          {act.batterySocPercent <= 20 ? 'Depleted (≤20%)' : 'Reserve OK'}
                        </span>
                      </td>

                      {/* Violations Remaining */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                            act.remainingViolationsCount === 0
                              ? 'bg-[#ECFDF3] text-[#047857] dark:bg-[#064E3B] dark:text-[#86EFAC]'
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
      </>
    )}
  </div>
</PageContainer>
  )
}

export default ActionsPage
