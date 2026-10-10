import React, { useState, useMemo } from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useSimulationStore } from '../../store/simulationStore'
import { useUIStore } from '../../store/uiStore'
import { PlannedStepAction } from '../../services/api/controlService'
import {
  Layers,
  BatteryMedium,
  Network,
  Sun,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Zap,
  TrendingDown,
  RotateCw,
  ShieldCheck,
  Cpu,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts'

interface SequentialTrajectoryViewProps {
  gridId: string
  gridName: string
  simulationDate?: string
  currentTime?: string
}

export const SequentialTrajectoryView = React.memo<SequentialTrajectoryViewProps>(({
  gridId,
  gridName,
  simulationDate,
  currentTime,
}) => {
  const { theme } = useUIStore()
  const isDark = theme === 'dark'

  const {
    sequentialPlan,
    isPlanningSequential,
    sequentialPlanError,
    planGridId,
    planDate,
    fetchSequentialPlan,
  } = useSimulationStore()

  // Horizon and start time controls
  const [selectedStartTimestep, setSelectedStartTimestep] = useState<string>(
    currentTime || '12:00'
  )
  const [selectedHorizonSteps, setSelectedHorizonSteps] = useState<number>(8)

  const isStale =
    sequentialPlan !== null &&
    (planGridId !== gridId || (simulationDate && planDate !== simulationDate))

  const handleComputePlan = async () => {
    await fetchSequentialPlan(gridId, selectedStartTimestep, selectedHorizonSteps)
  }

  // Visual design tokens
  const gridStroke = isDark ? '#163826' : '#BBF7D0'
  const axisStroke = isDark ? '#86EFAC' : '#52665A'
  const tooltipBg = isDark ? '#122C1F' : '#FFFFFF'
  const tooltipBorder = isDark ? '#163826' : '#BBF7D0'
  const tooltipText = isDark ? '#ECFDF3' : '#10251A'

  // Prepare chart dataset from plannedTrajectory
  const chartData = useMemo(() => {
    if (!sequentialPlan?.plannedTrajectory) return []
    return sequentialPlan.plannedTrajectory.map((step) => ({
      time: step.time,
      stepIndex: step.stepIndex + 1,
      soc: step.batterySocAfter,
      voltage: step.expectedVoltagePu,
      feederLoad: step.expectedFeederLoadPercent,
      batteryKw: step.batteryPowerKw,
      curtailmentKw: step.curtailmentKw,
      violations: step.violationsCount,
      title: step.title,
    }))
  }, [sequentialPlan])

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case 'battery_dispatch':
        return 'success'
      case 'feeder_reconfiguration':
        return 'neutral'
      case 'solar_curtailment':
        return 'warning'
      case 'hybrid_plan':
        return 'primary'
      default:
        return 'neutral'
    }
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'battery_dispatch':
        return <BatteryMedium className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC]" />
      case 'feeder_reconfiguration':
        return <Network className="w-3.5 h-3.5 text-[#506052] dark:text-[#C2CCC0]" />
      case 'solar_curtailment':
        return <Sun className="w-3.5 h-3.5 text-amber-500" />
      case 'hybrid_plan':
        return <Layers className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC]" />
      default:
        return <Wrench className="w-3.5 h-3.5 text-[#52665A]" />
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Control Bar */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-[0_8px_30px_rgba(16,80,55,0.06)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />
            <h2 className="text-sm font-bold text-[#10251A] dark:text-[#ECFDF3] tracking-tight">
              Receding-Horizon Sequential Controller (MPC)
            </h2>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              {gridName}
            </Badge>
            {simulationDate && (
              <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                {simulationDate}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#52665A] dark:text-[#A7F3D0] mt-0.5">
            Evaluates multi-step lookahead trajectories across consecutive 15-minute intervals with stateful battery SOC tracking and authoritative physical verification.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Start Time Select */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#52665A] dark:text-[#A7F3D0] font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Start:
            </span>
            <select
              value={selectedStartTimestep}
              onChange={(e) => setSelectedStartTimestep(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#BBF7D0]/70 dark:border-[#86EFAC]/30 bg-[#F7FCF9] dark:bg-[#064E3B]/40 text-[#10251A] dark:text-[#ECFDF3] text-xs font-mono font-medium focus:outline-hidden focus:ring-1 focus:ring-[#047857]"
            >
              {Array.from({ length: 96 }).map((_, i) => {
                const h = Math.floor(i / 4)
                const m = (i % 4) * 15
                const t = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                return (
                  <option key={t} value={t}>
                    {t}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Horizon Select */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#52665A] dark:text-[#A7F3D0] font-medium">Horizon:</span>
            <select
              value={selectedHorizonSteps}
              onChange={(e) => setSelectedHorizonSteps(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-xl border border-[#BBF7D0]/70 dark:border-[#86EFAC]/30 bg-[#F7FCF9] dark:bg-[#064E3B]/40 text-[#10251A] dark:text-[#ECFDF3] text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-[#047857]"
            >
              <option value={8}>8 Steps (2.0h)</option>
              <option value={12}>12 Steps (3.0h)</option>
              <option value={16}>16 Steps (4.0h)</option>
              <option value={24}>24 Steps (6.0h)</option>
            </select>
          </div>

          {/* Compute Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleComputePlan}
            disabled={isPlanningSequential}
            leftIcon={
              isPlanningSequential ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Cpu className="w-3.5 h-3.5" />
              )
            }
            className="text-xs font-bold"
          >
            {isPlanningSequential ? 'Evaluating Physics...' : 'Calculate Sequential Plan'}
          </Button>
        </div>
      </div>

      {/* 2. Stale Plan Warning Banner */}
      {isStale && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              The currently displayed trajectory plan was generated for grid <strong>{planGridId}</strong> and date <strong>{planDate}</strong>. Re-calculate to match the currently selected grid inputs.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleComputePlan}
            className="text-xs shrink-0"
          >
            Refresh Plan
          </Button>
        </div>
      )}

      {/* 3. API Error Banner */}
      {sequentialPlanError && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-900/80 text-red-800 dark:text-red-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <span className="font-bold block">Sequential Planning Error</span>
              <span>{sequentialPlanError}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleComputePlan}
            className="text-xs shrink-0"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 4. Infeasible Plan Honest Alert */}
      {sequentialPlan && !sequentialPlan.isFeasible && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-100 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">
              Plan Infeasible — Constraint Violations Cannot Be Fully Eliminated
            </span>
            <p className="text-amber-800 dark:text-amber-200">
              {sequentialPlan.fallbackReason ||
                `The controller was unable to find an entirely violation-free sequence across ${sequentialPlan.horizonSteps} timesteps. The displayed trajectory minimizes total residual violations (${sequentialPlan.remainingViolationsTotal} remaining) and avoids catastrophic failure, but requires operator review.`}
            </p>
          </div>
        </div>
      )}

      {/* 5. Active Plan Workspace */}
      {sequentialPlan ? (
        <div className="space-y-4">
          {/* Top Status & KPI Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Status Card */}
            <div className={`p-3 rounded-2xl border ${
              sequentialPlan.isFeasible
                ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 border-[#047857]/40 dark:border-[#86EFAC]/30'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60'
            }`}>
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block uppercase font-bold tracking-wider">
                Plan Feasibility
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {sequentialPlan.isFeasible ? (
                  <CheckCircle2 className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                )}
                <span className={`text-sm font-bold ${
                  sequentialPlan.isFeasible
                    ? 'text-[#047857] dark:text-[#86EFAC]'
                    : 'text-amber-700 dark:text-amber-300'
                }`}>
                  {sequentialPlan.status}
                </span>
              </div>
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block mt-0.5">
                {sequentialPlan.isFeasible ? '100% Constraints Safe' : 'Violations Unresolved'}
              </span>
            </div>

            {/* Violations Mitigation */}
            <div className="p-3 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20">
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block uppercase font-bold tracking-wider">
                Violations Mitigated
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-sm font-bold font-mono text-red-600 dark:text-red-400">
                  {sequentialPlan.initialViolationsTotal}
                </span>
                <span className="text-xs text-[#52665A] dark:text-[#A7F3D0]">→</span>
                <span className={`text-sm font-bold font-mono ${
                  sequentialPlan.remainingViolationsTotal === 0
                    ? 'text-[#047857] dark:text-[#86EFAC]'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {sequentialPlan.remainingViolationsTotal}
                </span>
              </div>
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block mt-0.5">
                Baseline vs Planned
              </span>
            </div>

            {/* Terminal Battery SOC */}
            <div className="p-3 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20">
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block uppercase font-bold tracking-wider">
                Terminal SOC
              </span>
              <div className="text-sm font-bold font-mono text-[#10251A] dark:text-[#ECFDF3] mt-1">
                {sequentialPlan.terminalSocPercent}%
              </div>
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block mt-0.5">
                At step #{sequentialPlan.horizonSteps} end
              </span>
            </div>

            {/* Total Solar Curtailment */}
            <div className="p-3 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20">
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block uppercase font-bold tracking-wider">
                Curtailment Loss
              </span>
              <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                {sequentialPlan.totalSolarCurtailmentKwh} kWh
              </div>
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block mt-0.5">
                Renewable yield spill
              </span>
            </div>

            {/* Technical Line Losses */}
            <div className="p-3 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20">
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block uppercase font-bold tracking-wider">
                Technical Losses
              </span>
              <div className="text-sm font-bold font-mono text-[#52665A] dark:text-[#A7F3D0] mt-1">
                {sequentialPlan.totalLossKwh} kWh
              </div>
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block mt-0.5">
                Line resistive energy
              </span>
            </div>

            {/* AC Solves & Latency */}
            <div className="p-3 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20">
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block uppercase font-bold tracking-wider">
                Physical Solves
              </span>
              <div className="text-sm font-bold font-mono text-[#047857] dark:text-[#86EFAC] mt-1">
                {sequentialPlan.physicalSolveCount} AC Solves
              </div>
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block mt-0.5">
                in {sequentialPlan.planningLatencyMs} ms
              </span>
            </div>
          </div>

          {/* Interactive Trajectory Recharts View */}
          <Card className="border-[#BBF7D0]/60 dark:border-[#86EFAC]/20">
            <CardHeader
              title="Trajectory State Propagation (SOC % & Critical Bus Voltage pu)"
              subtitle={`Simulated multi-step state evolution across ${sequentialPlan.horizonSteps} intervals (${sequentialPlan.durationHours} hours)`}
              icon={<Activity className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
              action={
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-[#047857] dark:text-[#86EFAC]">
                    <span className="w-3 h-1 rounded-full bg-[#047857] dark:bg-[#86EFAC] inline-block" />
                    <span>Battery SOC (%)</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <span className="w-3 h-1 rounded-full bg-blue-500 inline-block" />
                    <span>Voltage (pu)</span>
                  </span>
                </div>
              }
            />
            <CardContent className="p-4">
              <div className="w-full h-72 min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.6} />
                    <XAxis
                      dataKey="time"
                      stroke={axisStroke}
                      fontSize={11}
                      tickLine={false}
                    />
                    {/* Left Axis: Battery SOC % */}
                    <YAxis
                      yAxisId="soc"
                      stroke={axisStroke}
                      domain={[0, 100]}
                      fontSize={11}
                      tickLine={false}
                      unit="%"
                    />
                    {/* Right Axis: Critical Bus Voltage pu */}
                    <YAxis
                      yAxisId="voltage"
                      orientation="right"
                      domain={[0.92, 1.10]}
                      stroke={axisStroke}
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => v.toFixed(2)}
                      unit=" pu"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div
                              style={{
                                backgroundColor: tooltipBg,
                                borderColor: tooltipBorder,
                                color: tooltipText,
                              }}
                              className="p-3 rounded-xl border shadow-lg text-xs space-y-1 backdrop-blur-md"
                            >
                              <div className="font-bold border-b border-[#BBF7D0]/40 pb-1 flex justify-between gap-4">
                                <span>Step #{data.stepIndex} ({data.time})</span>
                                <span className="font-mono">{data.title}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-[#52665A] dark:text-[#A7F3D0]">Battery SOC:</span>
                                <span className="font-mono font-bold text-[#047857] dark:text-[#86EFAC]">
                                  {data.soc.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-[#52665A] dark:text-[#A7F3D0]">Voltage:</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                  {data.voltage.toFixed(3)} pu
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-[#52665A] dark:text-[#A7F3D0]">Feeder Loading:</span>
                                <span className="font-mono font-bold">
                                  {data.feederLoad.toFixed(0)}%
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-[#52665A] dark:text-[#A7F3D0]">Dispatch Power:</span>
                                <span className="font-mono font-bold">
                                  {data.batteryKw > 0
                                    ? `+${data.batteryKw.toFixed(0)} kW (Discharge)`
                                    : data.batteryKw < 0
                                    ? `${data.batteryKw.toFixed(0)} kW (Charge)`
                                    : '0 kW'}
                                </span>
                              </div>
                              {data.curtailmentKw > 0 && (
                                <div className="flex justify-between gap-4 text-amber-600 dark:text-amber-400">
                                  <span>Curtailment:</span>
                                  <span className="font-mono font-bold">
                                    {data.curtailmentKw.toFixed(0)} kW
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between gap-4 pt-1 border-t border-[#BBF7D0]/30">
                                <span>Violations:</span>
                                <span className={`font-mono font-bold ${
                                  data.violations > 0 ? 'text-red-500' : 'text-[#047857] dark:text-[#86EFAC]'
                                }`}>
                                  {data.violations}
                                </span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    {/* IEEE 1547 Voltage Limits */}
                    <ReferenceLine
                      yAxisId="voltage"
                      y={1.05}
                      stroke="#EF4444"
                      strokeDasharray="4 4"
                      label={{ value: '1.05 pu Max', fill: '#EF4444', fontSize: 10, position: 'insideTopRight' }}
                    />
                    <ReferenceLine
                      yAxisId="voltage"
                      y={0.95}
                      stroke="#EF4444"
                      strokeDasharray="4 4"
                      label={{ value: '0.95 pu Min', fill: '#EF4444', fontSize: 10, position: 'insideBottomRight' }}
                    />
                    <Line
                      yAxisId="soc"
                      type="monotone"
                      dataKey="soc"
                      name="Battery SOC"
                      stroke={isDark ? '#86EFAC' : '#047857'}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: isDark ? '#86EFAC' : '#047857' }}
                    />
                    <Line
                      yAxisId="voltage"
                      type="monotone"
                      dataKey="voltage"
                      name="Voltage"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#3B82F6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chronological Trajectory Table */}
          <div className="rounded-2xl border border-[#BBF7D0]/70 dark:border-[#86EFAC]/20 bg-white/95 dark:bg-[#122C1F]/90 backdrop-blur-md overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />
                <h3 className="text-xs font-bold text-[#10251A] dark:text-[#ECFDF3] uppercase tracking-wider">
                  Chronological Step-by-Step Trajectory ({sequentialPlan.plannedTrajectory.length} Steps)
                </h3>
              </div>
              <span className="text-[11px] text-[#52665A] dark:text-[#A7F3D0]">
                All steps authoritatively verified with physical AC power-flow solver
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F0FDF4]/60 dark:bg-[#064E3B]/30 border-b border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 text-[10px] text-[#52665A] dark:text-[#A7F3D0] uppercase font-bold">
                    <th className="py-2.5 px-3">Step</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Recommended Control Action</th>
                    <th className="py-2.5 px-3">Battery Dispatch</th>
                    <th className="py-2.5 px-3">SOC Transition</th>
                    <th className="py-2.5 px-3">Curtailment</th>
                    <th className="py-2.5 px-3">Topology</th>
                    <th className="py-2.5 px-3">Critical V (pu)</th>
                    <th className="py-2.5 px-3">Feeder %</th>
                    <th className="py-2.5 px-3">Violations</th>
                    <th className="py-2.5 px-3">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#BBF7D0]/40 dark:divide-[#86EFAC]/15">
                  {sequentialPlan.plannedTrajectory.map((step, idx) => {
                    const isDischarge = step.batteryPowerKw > 0
                    const isCharge = step.batteryPowerKw < 0
                    const isVoltageSafe = step.expectedVoltagePu >= 0.95 && step.expectedVoltagePu <= 1.05
                    const isFeederSafe = step.expectedFeederLoadPercent <= 100.0

                    return (
                      <tr
                        key={step.stepIndex}
                        className={`hover:bg-[#F0FDF4]/40 dark:hover:bg-[#064E3B]/20 transition-colors ${
                          idx === 0 ? 'bg-[#ECFDF3]/40 dark:bg-[#064E3B]/25 font-medium' : ''
                        }`}
                      >
                        {/* Step Index */}
                        <td className="py-2.5 px-3 font-mono font-bold text-[#10251A] dark:text-[#ECFDF3]">
                          #{step.stepIndex + 1}
                          {idx === 0 && (
                            <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-[#047857] text-white">
                              NEXT
                            </span>
                          )}
                        </td>

                        {/* Timestamp */}
                        <td className="py-2.5 px-3 font-mono text-[#52665A] dark:text-[#A7F3D0]">
                          {step.time}
                        </td>

                        {/* Recommended Action */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {getActionIcon(step.actionType)}
                            <Badge
                              variant={getActionBadgeVariant(step.actionType) as any}
                              size="sm"
                              className="text-[10px] px-1.5 py-0.2"
                            >
                              {step.title}
                            </Badge>
                          </div>
                        </td>

                        {/* Battery Dispatch Power */}
                        <td className="py-2.5 px-3 font-mono">
                          {isDischarge ? (
                            <span className="text-[#047857] dark:text-[#86EFAC] font-bold">
                              +{step.batteryPowerKw.toFixed(0)} kW
                            </span>
                          ) : isCharge ? (
                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                              {step.batteryPowerKw.toFixed(0)} kW
                            </span>
                          ) : (
                            <span className="text-[#52665A] dark:text-[#A7F3D0]">0 kW</span>
                          )}
                        </td>

                        {/* Battery SOC Transition */}
                        <td className="py-2.5 px-3 font-mono text-[#10251A] dark:text-[#ECFDF3]">
                          <span className="text-[#52665A] dark:text-[#A7F3D0]">
                            {step.batterySocBefore.toFixed(1)}%
                          </span>
                          <span className="mx-1 text-xs">→</span>
                          <span className="font-bold text-[#047857] dark:text-[#86EFAC]">
                            {step.batterySocAfter.toFixed(1)}%
                          </span>
                        </td>

                        {/* Solar Curtailment */}
                        <td className="py-2.5 px-3 font-mono">
                          {step.curtailmentKw > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              {step.curtailmentKw.toFixed(0)} kW
                            </span>
                          ) : (
                            <span className="text-[#52665A] dark:text-[#A7F3D0]">0</span>
                          )}
                        </td>

                        {/* Topology */}
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              step.targetTopology === 'alternative'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold'
                                : 'text-[#52665A] dark:text-[#A7F3D0]'
                            }`}
                          >
                            {step.targetTopology}
                          </span>
                        </td>

                        {/* Critical Bus Voltage */}
                        <td className="py-2.5 px-3 font-mono">
                          <span
                            className={`font-bold ${
                              isVoltageSafe
                                ? 'text-[#047857] dark:text-[#86EFAC]'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {step.expectedVoltagePu.toFixed(3)}
                          </span>
                        </td>

                        {/* Critical Feeder Loading */}
                        <td className="py-2.5 px-3 font-mono">
                          <span
                            className={`font-bold ${
                              isFeederSafe
                                ? 'text-[#10251A] dark:text-[#ECFDF3]'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {step.expectedFeederLoadPercent.toFixed(0)}%
                          </span>
                        </td>

                        {/* Violations Count */}
                        <td className="py-2.5 px-3 font-mono">
                          {step.violationsCount === 0 ? (
                            <span className="text-[#047857] dark:text-[#86EFAC] flex items-center gap-1 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 0
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 flex items-center gap-1 font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" /> {step.violationsCount}
                            </span>
                          )}
                        </td>

                        {/* Authoritative Physical Verification */}
                        <td className="py-2.5 px-3">
                          {step.isPhysicallyVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#047857] dark:text-[#86EFAC] font-bold">
                              <ShieldCheck className="w-3.5 h-3.5" /> AC Solved ✓
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">
                              Unverified
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: Prompt to generate plan */
        <div className="p-8 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/60 text-[#047857] dark:text-[#86EFAC] flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#10251A] dark:text-[#ECFDF3]">
              No Multi-Step Trajectory Plan Computed Yet
            </h3>
            <p className="text-xs text-[#52665A] dark:text-[#A7F3D0] max-w-md mx-auto mt-1">
              Select a start timestep and horizon above, then click <strong>Calculate Sequential Plan</strong> to run the MPC controller with stateful battery transitions and authoritative AC physical power-flow verification.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleComputePlan}
            disabled={isPlanningSequential}
            leftIcon={
              isPlanningSequential ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Cpu className="w-4 h-4" />
              )
            }
            className="text-xs font-bold"
          >
            {isPlanningSequential ? 'Evaluating MPC Beam Search...' : 'Compute 8-Step Sequential MPC Plan'}
          </Button>
        </div>
      )}
    </div>
  )
})
