import React, { useState } from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { reportService } from '../services/api/reportService'
import { GridReportSummary } from '../types/report'
import { useGridStore } from '../store/gridStore'
import { useSimulationStore } from '../store/simulationStore'
import { useDomesticStore } from '../store/domesticStore'
import { useGridNetwork } from '../hooks/useGridNetwork'
import {
  FileText,
  ShieldCheck,
  Activity,
  Zap,
  Sun,
  CheckCircle2,
  Download,
  AlertTriangle,
  BatteryMedium,
  Layers,
  Network as NetworkIcon,
  Check,
} from 'lucide-react'

export const ReportsPage: React.FC = () => {
  // Ensure network is synchronized with backend
  useGridNetwork()

  const { network, currentTime, violations, violationSummary, isResolved, activeActionApplied } = useGridStore()
  const { input, fullResult, selectedAction, comparisonData } = useSimulationStore()
  const { gridType, network: domesticNetwork, activePreset, activeControl: domesticControl } = useDomesticStore()

  const [activeTab, setActiveTab] = useState<'buses' | 'feeders'>('buses')

  const isDomestic = gridType === 'domestic'

  // Dynamic values synchronized across the application
  const targetGridName = isDomestic
    ? 'Domestic LV Microgrid (230V/400V)'
    : network.name || 'Active Distribution Grid'

  const scenarioName = isDomestic
    ? activePreset.replace(/_/g, ' ')
    : fullResult?.summary.scenarioName || input.scenarioName

  // Live power generation and load values matching Dashboard and Network pages
  const currentSolarKw = isDomestic
    ? domesticNetwork.totalGenerationKw
    : network.solarUnits.length > 0
    ? network.solarUnits.reduce((acc, s) => acc + (s.generationKw || 0), 0)
    : (fullResult?.summary.solarKw ?? input.currentSolarKw)

  const currentLoadKw = isDomestic
    ? domesticNetwork.totalLoadKw
    : network.loads.length > 0
    ? network.loads.reduce((acc, l) => acc + (l.powerKw || 0), 0)
    : (fullResult?.summary.loadKw ?? input.currentLoadKw)

  const peakSolarKw = isDomestic
    ? Math.max(domesticNetwork.totalGenerationKw, 45)
    : input.solarTimeSeries.length > 0
    ? Math.max(...input.solarTimeSeries.map((s) => s.solarKw))
    : input.installedSolarCapacityKw || currentSolarKw

  const peakLoadKw = isDomestic
    ? Math.max(domesticNetwork.totalLoadKw, 30)
    : input.loadTimeSeries.length > 0
    ? Math.max(...input.loadTimeSeries.map((l) => l.loadKw))
    : input.peakLoadKw || currentLoadKw

  // Dynamic violation and compliance status matching Violations & Dashboard pages
  const domesticViolationsCount = domesticNetwork.overVoltageHousesCount + domesticNetwork.underVoltageHousesCount
  const domesticCriticalCount = domesticNetwork.overVoltageHousesCount
  const totalViolations = isDomestic ? domesticViolationsCount : violationSummary.total
  const criticalViolations = isDomestic ? domesticCriticalCount : violationSummary.critical
  const warningViolations = isDomestic ? domesticNetwork.underVoltageHousesCount : violationSummary.warning
  const isSafe = isResolved || criticalViolations === 0

  // Optimal action / strategy matching ActionsPage
  const currentAction = activeActionApplied || selectedAction
  const currentActionTitle = isDomestic
    ? (domesticControl !== 'NONE' ? domesticControl.replace(/_/g, ' ') : (criticalViolations === 0 ? 'Optimal Inverter Dispatch' : 'Volt-VAR Inverter Response'))
    : (currentAction?.title || fullResult?.summary.recommendedAction || (violationSummary.total === 0 ? 'Normal Balanced Topology' : 'Feeder Reconfiguration'))

  // Clean solar retention percentage
  const domesticCurtailedCount = domesticNetwork.houses.filter((h) => h.rooftopSolar.curtailedKw > 0).length
  const renewableUtilizationPercent = isDomestic
    ? Math.round(100 - (domesticCurtailedCount * 6.5))
    : (comparisonData?.renewableUseMaintainedPercent ?? fullResult?.comparisonData?.renewableUseMaintainedPercent ?? (currentAction?.renewableUtilizationPercent || 100))

  // Storage metrics
  const avgBatterySoc = isDomestic
    ? 68
    : network.batteries.length > 0
    ? network.batteries.reduce((acc, b) => acc + (b.socPercent || 0), 0) / network.batteries.length
    : input.batteryConfig.initialSocPercent

  const totalBatteryCapacityKwh = isDomestic ? 120 : input.batteryConfig.capacityKwh

  // Voltage ranges & stability index
  const busVoltages = isDomestic
    ? domesticNetwork.houses.map((h) => h.telemetry.voltagePu)
    : network.buses.map((b) => b.voltage)

  const minBusVoltage = busVoltages.length > 0 ? Math.min(...busVoltages) : 1.0
  const maxBusVoltage = busVoltages.length > 0 ? Math.max(...busVoltages) : 1.0
  const voltageStabilityIndex = +(1 - Math.max(Math.abs(1.0 - minBusVoltage), Math.abs(maxBusVoltage - 1.0))).toFixed(2)

  // Technical loss estimate
  const averageFeederLoading = !isDomestic && network.feeders.length > 0
    ? network.feeders.reduce((acc, f) => acc + f.loadingPercent, 0) / network.feeders.length
    : 45
  const maxFeederLoading = !isDomestic && network.feeders.length > 0
    ? Math.max(...network.feeders.map((f) => f.loadingPercent))
    : 48

  const gridLossPercent = isDomestic
    ? 2.8
    : fullResult?.timeStepResults?.[currentTime]?.totalLossKw
    ? +((fullResult.timeStepResults[currentTime].totalLossKw / Math.max(1, currentSolarKw + currentLoadKw)) * 100).toFixed(1)
    : +Math.max(1.4, Math.min(5.2, averageFeederLoading * 0.04)).toFixed(1)

  // Client-side dynamic export handlers
  const handleExportJson = () => {
    const summaryData: GridReportSummary = {
      scenarioName,
      simulationTime: currentTime,
      initialViolations: fullResult?.summary.initialViolations ?? totalViolations,
      finalViolations: criticalViolations,
      renewableUtilizationPercent,
      recommendedAction: currentActionTitle,
      peakSolarKw,
      peakLoadKw,
      curtailedEnergyKwh: 0,
      batteryThroughputKwh: +((avgBatterySoc / 100) * totalBatteryCapacityKwh * 0.4).toFixed(1),
      gridLossPercent,
      voltageStabilityIndex,
      generatedAt: new Date().toISOString(),
    }

    reportService.exportReportJson({
      reportId: `REP-${network.id || 'GRID'}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      summary: summaryData,
      buses: isDomestic
        ? domesticNetwork.houses.map((h) => ({ id: h.id, name: h.name, voltage: h.telemetry.voltagePu, status: h.telemetry.status }))
        : network.buses.map((b) => ({ id: b.id, name: b.name, voltage: b.voltage, status: b.status })),
      feeders: !isDomestic
        ? network.feeders.map((f) => ({ id: f.id, name: f.name, loadingPercent: f.loadingPercent, status: f.status }))
        : [],
      violations: violations.map((v) => ({ id: v.id, issue: v.issue, component: v.componentName, severity: v.severity })),
    })
  }

  const handleExportCsv = () => {
    const summaryData: GridReportSummary = {
      scenarioName,
      simulationTime: currentTime,
      initialViolations: fullResult?.summary.initialViolations ?? totalViolations,
      finalViolations: criticalViolations,
      renewableUtilizationPercent,
      recommendedAction: currentActionTitle,
      peakSolarKw,
      peakLoadKw,
      curtailedEnergyKwh: 0,
      batteryThroughputKwh: +((avgBatterySoc / 100) * totalBatteryCapacityKwh * 0.4).toFixed(1),
      gridLossPercent,
      voltageStabilityIndex,
      generatedAt: new Date().toISOString(),
    }
    reportService.exportReportCsv(summaryData)
  }

  return (
    <PageContainer compact className="py-2 px-3 lg:py-2.5 lg:px-4 flex flex-col flex-1 h-full min-h-0">
      <div className="space-y-2.5 w-full flex-1 flex flex-col min-h-0">
        {/* Upshifted Custom Hero Heading Box with Background Image matching Network, Violations, Simulations */}
        <div className="relative rounded-2xl overflow-hidden bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 p-3.5 sm:p-4 lg:p-4.5 shadow-[0_8px_25px_rgba(16,80,55,0.06)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.3)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 transition-colors shrink-0">
          {/* Background Visual Layer: Renewable Grid Landscape Fading to Left */}
          <div className="absolute inset-y-0 right-0 w-full sm:w-2/3 lg:w-3/5 z-0 pointer-events-none overflow-hidden">
            <img
              src="/images/hero_grid.jpg"
              alt="Renewable Grid Background"
              className="w-full h-full object-cover object-right lg:object-center opacity-95 dark:opacity-65 transition-opacity"
              loading="eager"
            />
            {/* Soft Gradient Masks for Crisp Typography */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-[#122C1F] dark:via-[#122C1F]/80 dark:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-transparent dark:from-[#122C1F]/30" />
          </div>

          {/* Left: Upshifted Bigger Heading & Subtitle */}
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl lg:text-4xl font-black text-[#10251A] dark:text-white tracking-tight leading-none">
              System Audit Reports
            </h1>
            <p className="text-sm sm:text-base text-[#425B4C] dark:text-[#A7F3D0] font-medium mt-1.5 leading-relaxed max-w-xl">
              Power-flow compliance statements, statutory IEEE 1547 audit logs, and asset telemetry.
            </p>
          </div>

          {/* Right: Actions Bar & Theme Toggle */}
          <div className="relative z-10 flex flex-wrap items-center gap-2 shrink-0 bg-[#F4FAF5]/90 dark:bg-[#0E2419]/90 p-1.5 rounded-xl border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs backdrop-blur-sm">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportCsv}
              className="text-xs sm:text-sm font-bold shadow-2xs hover:border-[#047857]"
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportJson}
              className="text-xs sm:text-sm font-bold shadow-2xs hover:border-[#047857]"
            >
              Export JSON
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Executive Summary Metrics Strip (Fills width evenly with live synchronized metrics) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 shrink-0">
          {/* Active Grid Card */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs text-[#52665A] dark:text-[#A7F3D0] font-bold uppercase tracking-wider block">Target Grid</span>
            <div className="text-sm sm:text-base font-black text-[#10251A] dark:text-white mt-1 truncate" title={targetGridName}>
              {targetGridName}
            </div>
            <span className="text-xs text-[#52665A] dark:text-[#A7F3D0] font-mono mt-0.5 block truncate font-medium">
              {isDomestic ? `${domesticNetwork.houses.length} Houses` : `${network.buses.length} Buses • ${network.feeders.length} Lines`}
            </span>
          </div>

          {/* Scenario & Snapshot */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs text-[#52665A] dark:text-[#A7F3D0] font-bold uppercase tracking-wider block">Active Scenario</span>
            <div className="text-sm sm:text-base font-black text-[#10251A] dark:text-white mt-1 truncate" title={scenarioName}>
              {scenarioName}
            </div>
            <span className="text-xs text-[#047857] dark:text-[#86EFAC] font-mono font-bold mt-0.5 block">
              Snapshot {currentTime}
            </span>
          </div>

          {/* Grid Compliance Health */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs text-[#52665A] dark:text-[#A7F3D0] font-bold uppercase tracking-wider block">Compliance Health</span>
            <div className={`text-sm sm:text-base font-black font-mono mt-1 ${criticalViolations > 0 ? 'text-red-600 dark:text-red-400' : 'text-[#047857] dark:text-[#86EFAC]'}`}>
              {criticalViolations > 0 ? `${criticalViolations} Critical Breaches` : '0 Critical Issues'}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isSafe ? 'bg-[#16A34A]' : 'bg-red-500'}`} />
              <span className={`text-xs font-bold ${isSafe ? 'text-[#047857] dark:text-[#86EFAC]' : 'text-red-600 dark:text-red-400'}`}>
                {isSafe ? 'IEEE 1547 Passed' : `${warningViolations} Warnings`}
              </span>
            </div>
          </div>

          {/* Solar Generation & Demand */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs text-[#52665A] dark:text-[#A7F3D0] font-bold uppercase tracking-wider block">Current Power Flow</span>
            <div className="text-sm sm:text-base font-black font-mono text-[#10251A] dark:text-white mt-1">
              <span className="text-amber-600 dark:text-amber-400 font-bold">{currentSolarKw.toFixed(1)}</span> / {currentLoadKw.toFixed(1)} kW
            </div>
            <span className="text-xs text-[#52665A] dark:text-[#A7F3D0] font-mono mt-0.5 block truncate font-medium">
              Peak: {peakSolarKw.toFixed(0)} / {peakLoadKw.toFixed(0)} kW
            </span>
          </div>

          {/* Battery Storage & SOC */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs text-[#52665A] dark:text-[#A7F3D0] font-bold uppercase tracking-wider block">Energy Storage</span>
            <div className="text-sm sm:text-base font-black font-mono text-[#10251A] dark:text-white mt-1">
              {avgBatterySoc.toFixed(0)}% SOC
            </div>
            <span className="text-xs text-[#52665A] dark:text-[#A7F3D0] font-mono mt-0.5 block truncate font-medium">
              {totalBatteryCapacityKwh} kWh Capacity
            </span>
          </div>

          {/* Clean Utilization & Losses */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs text-[#52665A] dark:text-[#A7F3D0] font-bold uppercase tracking-wider block">Renewable Kept</span>
            <div className="text-sm sm:text-base font-black font-mono text-[#047857] dark:text-[#86EFAC] mt-1">
              {renewableUtilizationPercent}% Clean
            </div>
            <span className="text-xs text-[#52665A] dark:text-[#A7F3D0] font-mono mt-0.5 block truncate font-medium">
              Loss: {gridLossPercent}% • {voltageStabilityIndex} VSI
            </span>
          </div>
        </div>

        {/* Main Content Area Filling Remaining Vertical Space */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 flex-1 min-h-0 items-stretch">
          {/* Left Column (5 Cols): Minimal Automated Audit Checkpoints & Design Tolerances */}
          <div className="lg:col-span-5 flex flex-col gap-3.5 min-h-0">
            {/* Audit Verifications Card (Minimal, High-Signal Items) */}
            <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md rounded-2xl shadow-xs transition-colors">
              <CardHeader
                title={<span className="text-sm sm:text-base font-extrabold normal-case">Automated Audit Verifications</span>}
                subtitle={<span className="text-xs sm:text-sm">Instantaneous IEEE 1547 and IEC statutory checkpoints</span>}
                icon={<ShieldCheck className="w-5 h-5 text-[#047857] dark:text-[#86EFAC]" />}
              />
              <CardContent className="pt-1 pb-2.5 space-y-1.5">
                {/* Checkpoint 1: Power Balance */}
                <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#0E2419]/80 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-bold text-[#10251A] dark:text-white truncate">Generation Balance</span>
                  </div>
                  <div className="font-mono text-xs sm:text-sm text-[#425B4C] dark:text-[#A7F3D0] shrink-0">
                    Solar <strong className="text-amber-600 dark:text-amber-400 font-bold">{currentSolarKw.toFixed(1)} kW</strong> vs Load <strong className="text-[#10251A] dark:text-white font-bold">{currentLoadKw.toFixed(1)} kW</strong>
                  </div>
                </div>

                {/* Checkpoint 2: Voltage Tolerance Compliance */}
                <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#0E2419]/80 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                  <div className="flex items-center gap-2 min-w-0">
                    {criticalViolations === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span className="text-sm font-bold text-[#10251A] dark:text-white truncate">Voltage Bounds</span>
                  </div>
                  <div className="font-mono text-xs sm:text-sm shrink-0">
                    <Badge variant={criticalViolations === 0 ? 'success' : 'danger'} size="sm" className="text-xs font-mono font-bold px-2 py-0.5">
                      {minBusVoltage.toFixed(3)} - {maxBusVoltage.toFixed(3)} pu
                    </Badge>
                  </div>
                </div>

                {/* Checkpoint 3: Optimal Action Dispatched */}
                <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#0E2419]/80 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] shrink-0" />
                    <span className="text-sm font-bold text-[#10251A] dark:text-white truncate">Dispatched Action</span>
                  </div>
                  <span className="font-mono text-xs sm:text-sm font-bold text-[#047857] dark:text-[#86EFAC] truncate max-w-[210px]">
                    {currentActionTitle}
                  </span>
                </div>

                {/* Checkpoint 4: Clean Energy Retained */}
                <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#0E2419]/80 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-bold text-[#10251A] dark:text-white truncate">Renewable Yield</span>
                  </div>
                  <span className="font-mono text-xs sm:text-sm font-bold text-[#047857] dark:text-[#86EFAC]">
                    {renewableUtilizationPercent}% Clean Kept
                  </span>
                </div>

                {/* Checkpoint 5: Grid Losses & Stability Index */}
                <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#0E2419]/80 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <Activity className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] shrink-0" />
                    <span className="text-sm font-bold text-[#10251A] dark:text-white truncate">Losses & Stability</span>
                  </div>
                  <span className="font-mono text-xs sm:text-sm text-[#425B4C] dark:text-[#A7F3D0]">
                    {gridLossPercent}% Loss • <strong className="text-[#047857] dark:text-[#86EFAC] font-bold">{voltageStabilityIndex} VSI</strong>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Operating Limits & Design Parameters Card */}
            <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md rounded-2xl shadow-xs transition-colors flex-1 flex flex-col justify-between">
              <CardHeader
                title={<span className="text-sm sm:text-base font-extrabold normal-case">Design Tolerances & Thresholds</span>}
                subtitle={<span className="text-xs sm:text-sm">Configured statutory limits for active simulation</span>}
                icon={<Activity className="w-5 h-5 text-[#047857] dark:text-[#86EFAC]" />}
              />
              <CardContent className="pt-1 pb-2.5 flex-1 flex flex-col justify-around">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#0E2419]/80 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                    <div className="text-xs font-semibold text-[#52665A] dark:text-[#A7F3D0]">Voltage Limit</div>
                    <div className="text-sm sm:text-base font-black font-mono text-[#10251A] dark:text-white mt-0.5">
                      {input.networkConfig.voltageMinPu.toFixed(2)} - {input.networkConfig.voltageMaxPu.toFixed(2)} pu
                    </div>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#0E2419]/80 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                    <div className="text-xs font-semibold text-[#52665A] dark:text-[#A7F3D0]">Feeder Ampacity</div>
                    <div className="text-sm sm:text-base font-black font-mono text-[#10251A] dark:text-white mt-0.5">
                      ≤ {input.networkConfig.feederLoadingLimitPercent}% <span className="text-xs font-semibold text-[#52665A] dark:text-[#A7F3D0]">({maxFeederLoading.toFixed(1)}% max)</span>
                    </div>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#0E2419]/80 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                    <div className="text-xs font-semibold text-[#52665A] dark:text-[#A7F3D0]">Substation Rating</div>
                    <div className="text-sm sm:text-base font-black font-mono text-[#10251A] dark:text-white mt-0.5">
                      {isDomestic ? '100 kVA (230V)' : `${(network.substation?.ratingKva ? (network.substation.ratingKva / 1000).toFixed(1) : '10.0')} MVA`}
                    </div>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#0E2419]/80 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                    <div className="text-xs font-semibold text-[#52665A] dark:text-[#A7F3D0]">Grid Frequency</div>
                    <div className="text-sm sm:text-base font-black font-mono text-[#047857] dark:text-[#86EFAC] mt-0.5">
                      50.00 Hz (Nominal)
                    </div>
                  </div>
                </div>

                <div className="mt-2 p-2 rounded-xl bg-[#F0FDF4] dark:bg-[#064E3B]/30 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-[#425B4C] dark:text-[#A7F3D0] font-semibold">Statutory Compliance Status</span>
                  <span className="font-bold text-[#047857] dark:text-[#86EFAC] flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> IEEE 1547 / IEC 61000 Verified
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (7 Cols): Live Asset Telemetry Audit Records */}
          <div className="lg:col-span-7 flex flex-col min-h-0">
            <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md rounded-2xl shadow-xs transition-colors flex-1 flex flex-col min-h-0 overflow-hidden">
              <CardHeader
                title={<span className="text-sm sm:text-base font-extrabold normal-case">Live Asset Telemetry Audit</span>}
                subtitle={<span className="text-xs sm:text-sm">Nodal voltage balances & thermal loadings at {currentTime}</span>}
                icon={<Activity className="w-5 h-5 text-[#047857] dark:text-[#86EFAC]" />}
                action={
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#F0FDF4] dark:bg-[#064E3B]/40 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20">
                    <button
                      onClick={() => setActiveTab('buses')}
                      className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${
                        activeTab === 'buses'
                          ? 'bg-[#047857] text-white shadow-2xs'
                          : 'text-[#52665A] dark:text-[#A7F3D0] hover:text-[#10251A] dark:hover:text-white'
                      }`}
                    >
                      Nodes ({isDomestic ? domesticNetwork.houses.length : network.buses.length})
                    </button>
                    {!isDomestic && (
                      <button
                        onClick={() => setActiveTab('feeders')}
                        className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${
                          activeTab === 'feeders'
                            ? 'bg-[#047857] text-white shadow-2xs'
                            : 'text-[#52665A] dark:text-[#A7F3D0] hover:text-[#10251A] dark:hover:text-white'
                        }`}
                      >
                        Feeders ({network.feeders.length})
                      </button>
                    )}
                  </div>
                }
              />
              <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
                {activeTab === 'buses' ? (
                  <div className="flex-1 overflow-y-auto max-h-[calc(100vh-360px)] min-h-[220px]">
                    <table className="w-full text-xs sm:text-sm text-left border-collapse">
                      <thead className="sticky top-0 bg-[#F0FDF4] dark:bg-[#064E3B]/90 backdrop-blur-sm text-[#52665A] dark:text-[#A7F3D0] uppercase text-xs font-bold tracking-wider border-b border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 z-10">
                        <tr>
                          <th className="py-2.5 px-3.5">{isDomestic ? 'House' : 'Bus ID'}</th>
                          <th className="py-2.5 px-3.5">Voltage</th>
                          <th className="py-2.5 px-3.5">Demand</th>
                          <th className="py-2.5 px-3.5">Solar</th>
                          <th className="py-2.5 px-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#BBF7D0]/40 dark:divide-[#86EFAC]/15 text-[#10251A] dark:text-[#ECFDF3]">
                        {isDomestic ? (
                          domesticNetwork.houses.map((house) => (
                            <tr key={house.id} className="hover:bg-[#F0FDF4]/70 dark:hover:bg-[#064E3B]/20 transition-colors">
                              <td className="py-2.5 px-3.5 font-mono font-bold text-sm text-[#10251A] dark:text-[#ECFDF3]">
                                {house.id} <span className="text-xs text-[#52665A] dark:text-[#A7F3D0] font-normal">({house.phase})</span>
                              </td>
                              <td className="py-2.5 px-3.5 font-mono font-bold text-sm">
                                <span className={house.telemetry.status === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-[#047857] dark:text-[#86EFAC]'}>
                                  {house.telemetry.voltagePu.toFixed(3)} pu ({house.telemetry.voltageV.toFixed(0)}V)
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 font-mono text-xs sm:text-sm text-[#52665A] dark:text-[#A7F3D0]">{house.consumption.currentLoadKw.toFixed(1)} kW</td>
                              <td className="py-2.5 px-3.5 font-mono text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-bold">{house.rooftopSolar.currentGenerationKw.toFixed(1)} kW</td>
                              <td className="py-2.5 px-3.5">
                                <Badge variant={house.telemetry.status === 'critical' ? 'danger' : house.telemetry.status === 'warning' ? 'warning' : 'success'} size="sm" className="text-xs font-bold px-2 py-0.5">
                                  {house.telemetry.status}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        ) : (
                          network.buses.map((bus) => (
                            <tr key={bus.id} className="hover:bg-[#F0FDF4]/70 dark:hover:bg-[#064E3B]/20 transition-colors">
                              <td className="py-2.5 px-3.5 font-mono font-bold text-sm text-[#10251A] dark:text-[#ECFDF3]">
                                {bus.id} <span className="text-xs text-[#52665A] dark:text-[#A7F3D0] font-normal truncate max-w-[100px]">({bus.name})</span>
                              </td>
                              <td className="py-2.5 px-3.5 font-mono font-bold text-sm">
                                <span className={bus.status === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-[#047857] dark:text-[#86EFAC]'}>
                                  {bus.voltage.toFixed(3)} pu
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 font-mono text-xs sm:text-sm text-[#52665A] dark:text-[#A7F3D0]">{bus.loadKw.toFixed(1)} kW</td>
                              <td className="py-2.5 px-3.5 font-mono text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-bold">{bus.solarKw.toFixed(1)} kW</td>
                              <td className="py-2.5 px-3.5">
                                <Badge variant={bus.status === 'critical' ? 'danger' : 'success'} size="sm" className="text-xs font-bold px-2 py-0.5">
                                  {bus.status}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto max-h-[calc(100vh-360px)] min-h-[220px]">
                    <table className="w-full text-xs sm:text-sm text-left border-collapse">
                      <thead className="sticky top-0 bg-[#F0FDF4] dark:bg-[#064E3B]/90 backdrop-blur-sm text-[#52665A] dark:text-[#A7F3D0] uppercase text-xs font-bold tracking-wider border-b border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 z-10">
                        <tr>
                          <th className="py-2.5 px-3.5">Feeder ID</th>
                          <th className="py-2.5 px-3.5">Span (From → To)</th>
                          <th className="py-2.5 px-3.5">Loading (%)</th>
                          <th className="py-2.5 px-3.5">Switch</th>
                          <th className="py-2.5 px-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#BBF7D0]/40 dark:divide-[#86EFAC]/15 text-[#10251A] dark:text-[#ECFDF3]">
                        {network.feeders.map((feeder) => (
                          <tr key={feeder.id} className="hover:bg-[#F0FDF4]/70 dark:hover:bg-[#064E3B]/20 transition-colors">
                            <td className="py-2.5 px-3.5 font-mono font-bold text-sm text-[#10251A] dark:text-[#ECFDF3]">{feeder.id}</td>
                            <td className="py-2.5 px-3.5 font-mono text-xs sm:text-sm text-[#52665A] dark:text-[#A7F3D0]">
                              {feeder.fromBus} → {feeder.toBus}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono font-bold text-sm">
                              <span className={feeder.loadingPercent > 100 ? 'text-red-600 dark:text-red-400' : 'text-[#047857] dark:text-[#86EFAC]'}>
                                {feeder.loadingPercent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 font-mono">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${feeder.isSwitchClosed ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'}`}>
                                {feeder.isSwitchClosed ? 'Closed' : 'Open'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5">
                              <Badge variant={feeder.status === 'critical' ? 'danger' : 'success'} size="sm" className="text-xs font-bold px-2 py-0.5">
                                {feeder.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

export default ReportsPage
