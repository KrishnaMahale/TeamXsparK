import React, { useMemo } from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useCorrectiveActions } from '../hooks/useCorrectiveActions'
import { ActionComparisonRow } from '../types/action'
import {
  Wrench,
  RotateCcw,
  BatteryMedium,
  Network,
  Sun,
  XCircle,
} from 'lucide-react'

export const ActionsPage: React.FC = () => {
  const {
    actions,
    selectedAction,
    isRunning,
    executionResult,
    selectAction,
    executeAction,
    resetSimulation,
  } = useCorrectiveActions()

  const comparisonRows: ActionComparisonRow[] = useMemo(() => {
    return actions.map((a) => ({
      actionId: a.id,
      actionTitle: a.title,
      voltage: `${a.expectedVoltagePu.toFixed(3)} pu`,
      feederLoading: `${a.expectedFeederLoadPercent}%`,
      solarUsed: `${a.solarUsedKw} kW`,
      batterySoc: `${a.batterySocPercent}%`,
      violationsRemaining: a.remainingViolationsCount,
      isFeasible: a.isFeasible,
      infeasibleNote: !a.isFeasible ? a.infeasibleReason : undefined,
    }))
  }, [actions])

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'battery_discharge':
      case 'max_battery_discharge':
        return <BatteryMedium className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      case 'feeder_reconfiguration':
        return <Network className="w-5 h-5 text-sky-600 dark:text-sky-400" />
      case 'solar_curtailment':
        return <Sun className="w-5 h-5 text-amber-500" />
      default:
        return <Wrench className="w-5 h-5 text-slate-500 dark:text-slate-400" />
    }
  }

  return (
    <PageContainer
      title="Corrective Actions"
      subtitle="Evaluate available interventions against current network constraints and compare outcomes"
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={resetSimulation}
          >
            Reset Test
          </Button>
        </div>
      }
    >
      {/* 1. Action Cards Workspace (4 Action Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => {
          const isSel = selectedAction?.id === action.id
          const isFeasible = action.isFeasible

          return (
            <div
              key={action.id}
              onClick={() => selectAction(action)}
              className={`p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between shadow-sm ${
                isSel
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400'
                  : 'bg-white dark:bg-[#0D2420] border-[#D1E7DD] dark:border-[#23483F] hover:border-emerald-300 dark:hover:border-emerald-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-[#ECFDF5] dark:bg-[#0A2018] border border-[#D1E7DD] dark:border-[#23483F]">
                      {getActionIcon(action.type)}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#14532D] dark:text-emerald-100 uppercase tracking-wide">
                        {action.title}
                      </h3>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {action.parameterDelta}
                      </span>
                    </div>
                  </div>

                  <Badge variant={isFeasible ? 'success' : 'danger'} size="sm">
                    {isFeasible ? 'FEASIBLE' : 'NOT FEASIBLE'}
                  </Badge>
                </div>

                <p className="text-xs text-[#365A4D] dark:text-[#A7C4B8] mt-3 line-clamp-2 leading-relaxed">
                  {action.description}
                </p>

                {!isFeasible && action.infeasibleReason && (
                  <div className="mt-2.5 p-2 rounded bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-[11px] text-red-700 dark:text-red-300">
                    <span className="font-bold">Constraint Breach: </span>
                    {action.infeasibleReason}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#D1E7DD] dark:border-[#23483F] text-xs">
                  <div>
                    <span className="text-[#6B8178] dark:text-[#6B8E82] block text-[10px]">Voltage Target:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {action.expectedVoltagePu} pu
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B8178] dark:text-[#6B8E82] block text-[10px]">F-02 Loading:</span>
                    <span className="font-mono font-bold text-[#14532D] dark:text-emerald-200">
                      {action.expectedFeederLoadPercent}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
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
          )
        })}
      </div>

      {/* 2. Before / After Comparison Section (Prominent Panels) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#14532D] dark:text-emerald-100 tracking-tight flex items-center gap-2">
            <span>Simulation Outcome: {selectedAction?.title || 'Feeder Reconfiguration'}</span>
            <Badge variant={selectedAction?.isFeasible ? 'success' : 'danger'} size="sm">
              {selectedAction?.isFeasible ? 'Action Tested' : 'Constraint Failure'}
            </Badge>
          </h2>
          <span className="text-xs text-[#6B8178] dark:text-[#6B8E82]">
            Comparing pre-dispatch grid status with post-dispatch telemetry
          </span>
        </div>

        {/* Selected Infeasible Action Callout */}
        {selectedAction && !selectedAction.isFeasible && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Action Infeasible: {selectedAction.title}
                </h4>
                <p className="text-xs text-red-700 dark:text-red-200 mt-0.5">
                  Requested discharge (-80 kW) exceeds available battery storage reserves. Battery operating constraints do not permit this dispatch.
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
              className="shrink-0"
            >
              Try Feasible Action
            </Button>
          </div>
        )}

        {/* Side-by-Side BEFORE / AFTER Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* BEFORE Panel */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#0D2420] border border-rose-300 dark:border-rose-800/80 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#D1E7DD] dark:border-[#23483F]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">Before Dispatch</h3>
              </div>
              <Badge variant="danger">Unsafe</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Bus B3 Voltage</div>
                <div className="text-xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">1.074 pu</div>
                <div className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-0.5">+0.024 pu over limit (1.050)</div>
              </div>

              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Feeder F-02 Loading</div>
                <div className="text-xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">108%</div>
                <div className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-0.5">+8% above rated ampacity</div>
              </div>

              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Active Violations</div>
                <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">2 Violations</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Critical severity</div>
              </div>

              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Solar Utilization</div>
                <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">240 kW</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">100% Generation</div>
              </div>
            </div>
          </div>

          {/* AFTER Panel */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#0D2420] border border-emerald-300 dark:border-emerald-800/80 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#D1E7DD] dark:border-[#23483F]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">After Dispatch</h3>
              </div>
              <Badge variant={selectedAction?.isFeasible ? 'success' : 'danger'}>
                {selectedAction?.isFeasible ? 'Grid Safe' : 'Unresolved'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Bus B3 Voltage</div>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {selectedAction?.isFeasible ? `${selectedAction?.expectedVoltagePu || '1.038'} pu` : '1.074 pu'}
                </div>
                <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Within IEEE 1547 (0.95 - 1.05)</div>
              </div>

              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Feeder F-02 Loading</div>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {selectedAction?.isFeasible ? `${selectedAction?.expectedFeederLoadPercent || '92'}%` : '108%'}
                </div>
                <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Below 100% thermal rating</div>
              </div>

              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Remaining Violations</div>
                <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {selectedAction?.isFeasible ? '0 Violations' : '2 Violations'}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">All constraints cleared</div>
              </div>

              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Renewable Utilization</div>
                <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                  {selectedAction?.renewableUtilizationPercent || 96}%
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {selectedAction?.id === 'solar_curtailment' ? 'Trade-off: 12% Curtailed' : 'Clean energy maintained'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Comparison Matrix Table */}
      <Card>
        <CardHeader
          title="Compare Corrective Actions"
          subtitle="Multi-criteria ranking of voltage relief, thermal loading, and renewable utilization"
          icon={<Wrench className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
        />
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[700px]">
            <thead className="bg-[#ECFDF5] dark:bg-[#0A2018] text-[#6B8178] dark:text-[#6B8E82] uppercase text-[10px] tracking-wider border-b border-[#D1E7DD] dark:border-[#23483F]">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">B3 Voltage</th>
                <th className="py-3 px-4">Feeder Load</th>
                <th className="py-3 px-4">Renewable Used</th>
                <th className="py-3 px-4">Battery SOC</th>
                <th className="py-3 px-4">Violations</th>
                <th className="py-3 px-4">Feasibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1E7DD] dark:divide-[#23483F] text-[#14532D] dark:text-emerald-100">
              {comparisonRows.map((row) => (
                <tr key={row.actionId} className="hover:bg-[#ECFDF5] dark:hover:bg-[#183D36] transition-colors">
                  <td className="py-3 px-4 font-bold text-[#14532D] dark:text-emerald-100">
                    <div>{row.actionTitle}</div>
                    {row.infeasibleNote && (
                      <div className="text-[10px] text-red-600 dark:text-red-400 font-normal">{row.infeasibleNote}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium">
                    <span className={row.voltage.includes('1.07') ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                      {row.voltage}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className={parseInt(row.feederLoading) > 100 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-[#14532D] dark:text-emerald-200'}>
                      {row.feederLoading}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-yellow-600 dark:text-yellow-400">{row.solarUsed}</td>
                  <td className="py-3 px-4 font-mono text-[#365A4D] dark:text-[#A7C4B8]">{row.batterySoc}</td>
                  <td className="py-3 px-4 font-mono">
                    <span className={row.violationsRemaining === 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-red-600 dark:text-red-400'}>
                      {row.violationsRemaining}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={row.isFeasible ? 'success' : 'danger'} size="sm">
                      {row.isFeasible ? 'FEASIBLE' : 'INFEASIBLE'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
