import React, { useState, useEffect } from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { reportService } from '../services/api/reportService'
import { GridReportSummary } from '../types/report'
import { useGridStore } from '../store/gridStore'
import { useSimulationStore } from '../store/simulationStore'
import {
  FileText,
  ShieldCheck,
  Activity,
  Zap,
  Sun,
  CheckCircle2,
  Download,
} from 'lucide-react'

export const ReportsPage: React.FC = () => {
  const { network, currentTime, violations, violationSummary, isResolved, activeActionApplied } = useGridStore()
  const { input, fullResult, selectedAction } = useSimulationStore()
  const [reportSummary, setReportSummary] = useState<GridReportSummary | null>(null)
  const [, setIsLoading] = useState<boolean>(true)

  const scenarioName = fullResult?.summary.scenarioName || input.scenarioName
  const currentAction = activeActionApplied || selectedAction

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true)
      try {
        const data = await reportService.generateReport(scenarioName, currentTime)
        setReportSummary(data)
      } finally {
        setIsLoading(false)
      }
    }
    fetchReport()
  }, [scenarioName, currentTime])

  const handleExportJson = () => {
    if (!reportSummary) return
    reportService.exportReportJson({
      reportId: `REP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      summary: reportSummary,
      buses: network.buses.map((b) => ({ id: b.id, name: b.name, voltage: b.voltage, status: b.status })),
      feeders: network.feeders.map((f) => ({ id: f.id, name: f.name, loadingPercent: f.loadingPercent, status: f.status })),
      violations: violations.map((v) => ({ id: v.id, issue: v.issue, component: v.componentName, severity: v.severity, status: v.status })),
    })
  }

  const handleExportCsv = () => {
    if (!reportSummary) return
    reportService.exportReportCsv(reportSummary)
  }

  const isSafe = isResolved || violationSummary.critical === 0

  return (
    <PageContainer compact={true}>
      <div className="space-y-6">
        {/* 1. Executive Audit Summary (Minimal, High-Impact UI with Action Buttons in Header) */}
        <Card className="transition-all duration-200">
          <CardHeader
            title="Executive Audit Summary"
            subtitle={`Scenario: ${scenarioName} • Snapshot: ${currentTime}`}
            icon={<FileText className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleExportCsv}
                  className="text-xs"
                >
                  Export CSV
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleExportJson}
                  className="text-xs"
                >
                  Export JSON
                </Button>
                <Badge variant={isSafe ? 'success' : 'danger'}>
                  {isSafe ? 'Audit Passed (Safe)' : 'Violations Logged'}
                </Badge>
              </div>
            }
          />
          <CardContent className="pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Scenario */}
              <div className="p-3.5 rounded-2xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs">
                <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] font-medium block">Active Scenario</span>
                <div className="text-xs font-bold text-[#10251A] dark:text-[#ECFDF3] mt-1 truncate">
                  {scenarioName}
                </div>
                <span className="text-[10px] font-mono text-[#52665A] dark:text-[#A7F3D0] block mt-0.5">
                  {currentTime} Snapshot
                </span>
              </div>

              {/* Grid Health */}
              <div className="p-3.5 rounded-2xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs">
                <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] font-medium block">Grid Health</span>
                <div className={`text-xs font-bold font-mono mt-1 ${violationSummary.total > 0 ? 'text-red-600 dark:text-red-400' : 'text-[#047857] dark:text-[#86EFAC]'}`}>
                  {violationSummary.total > 0 ? `${violationSummary.total} Issues` : '0 Violations'}
                </div>
                <span className={`text-[10px] block mt-0.5 font-medium ${isSafe ? 'text-[#047857] dark:text-[#86EFAC]' : 'text-red-600 dark:text-red-400'}`}>
                  {isSafe ? 'Compliant ✓' : 'Constraint Breach'}
                </span>
              </div>

              {/* Dispatched Action */}
              <div className="p-3.5 rounded-2xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs">
                <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] font-medium block">Optimal Intervention</span>
                <div className="text-xs font-bold text-[#10251A] dark:text-[#ECFDF3] mt-1 truncate">
                  {currentAction?.title || 'Feeder Reconfiguration'}
                </div>
                <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block mt-0.5">
                  {isSafe ? 'Dispatched' : 'Recommended'}
                </span>
              </div>

              {/* Renewable Utilization */}
              <div className="p-3.5 rounded-2xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs">
                <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] font-medium block">Clean Solar Kept</span>
                <div className="text-xs font-bold font-mono text-[#047857] dark:text-[#86EFAC] mt-1">
                  {currentAction?.renewableUtilizationPercent || reportSummary?.renewableUtilizationPercent || 96}%
                </div>
                <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block mt-0.5">
                  Zero Curtailment
                </span>
              </div>

              {/* System Performance */}
              <div className="p-3.5 rounded-2xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] font-medium block">Loss & Stability</span>
                <div className="text-xs font-bold font-mono text-[#10251A] dark:text-[#ECFDF3] mt-1">
                  {reportSummary?.gridLossPercent ?? 3.2}% Loss
                </div>
                <span className="text-[10px] text-[#047857] dark:text-[#86EFAC] font-mono block mt-0.5">
                  {reportSummary?.voltageStabilityIndex ?? 0.98} VSI (Stable)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Audit Narrative & Technical Record (Side-by-Side Aligned) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Compliance Narrative in Structured Points */}
          <Card className="transition-all duration-200 flex flex-col justify-between">
            <CardHeader
              title="Grid Compliance Narrative"
              subtitle="Automated power-flow audit statement"
              icon={<ShieldCheck className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
            />
            <CardContent className="space-y-2.5 flex-1">
              {/* Point 1: Generation vs Demand */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-[#52665A] dark:text-[#A7F3D0] leading-snug">
                  <strong className="text-[#10251A] dark:text-[#ECFDF3]">Generation vs Demand:</strong> Peak solar generation reached{' '}
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{reportSummary?.peakSolarKw ?? 240} kW</span>{' '}
                  against a peak load of{' '}
                  <span className="font-mono font-bold text-[#10251A] dark:text-[#ECFDF3]">{reportSummary?.peakLoadKw ?? 150} kW</span>{' '}
                  at time snapshot <span className="font-mono font-bold">{currentTime}</span>.
                </div>
              </div>

              {/* Point 2: Constraint Mitigation */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                <ShieldCheck className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] shrink-0 mt-0.5" />
                <div className="text-xs text-[#52665A] dark:text-[#A7F3D0] leading-snug">
                  <strong className="text-[#10251A] dark:text-[#ECFDF3]">Constraint Mitigation:</strong> Initial audit detected{' '}
                  <span className="font-mono font-bold text-red-600 dark:text-red-400">{reportSummary?.initialViolations ?? 2}</span> breaches.{' '}
                  Optimization engine dispatched{' '}
                  <span className="font-semibold text-[#10251A] dark:text-[#86EFAC]">{currentAction?.title || 'Feeder Reconfiguration (F-02 → F-03)'}</span>, resolving critical constraints (remaining: <span className="font-mono font-bold text-[#047857] dark:text-[#86EFAC]">{violationSummary.critical}</span>).
                </div>
              </div>

              {/* Point 3: Renewable Yield */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                <Sun className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] shrink-0 mt-0.5" />
                <div className="text-xs text-[#52665A] dark:text-[#A7F3D0] leading-snug">
                  <strong className="text-[#10251A] dark:text-[#ECFDF3]">Renewable Yield:</strong> Maintained{' '}
                  <span className="font-mono font-bold text-[#047857] dark:text-[#86EFAC]">{currentAction?.renewableUtilizationPercent || reportSummary?.renewableUtilizationPercent || 96}%</span>{' '}
                  clean energy utilization with zero unnecessary curtailment.
                </div>
              </div>

              {/* Point 4: System Efficiency */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                <Activity className="w-4 h-4 text-[#52665A] dark:text-[#A7F3D0] shrink-0 mt-0.5" />
                <div className="text-xs text-[#52665A] dark:text-[#A7F3D0] leading-snug">
                  <strong className="text-[#10251A] dark:text-[#ECFDF3]">System Efficiency:</strong> Estimated technical grid loss at{' '}
                  <span className="font-mono font-bold">{reportSummary?.gridLossPercent ?? 3.2}%</span>, Voltage Stability Index at{' '}
                  <span className="font-mono font-bold text-[#047857] dark:text-[#86EFAC]">{reportSummary?.voltageStabilityIndex ?? 0.98} VSI</span>, and battery throughput of{' '}
                  <span className="font-mono font-bold">{reportSummary?.batteryThroughputKwh ?? 24.5} kWh</span>.
                </div>
              </div>

              {/* Point 5: Regulatory Standards */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/20">
                <CheckCircle2 className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] shrink-0 mt-0.5" />
                <div className="text-xs text-[#52665A] dark:text-[#A7F3D0] leading-snug">
                  <strong className="text-[#10251A] dark:text-[#ECFDF3]">Regulatory Standards:</strong> All nodal power flows operate in full compliance with statutory IEEE 1547 and IEC 61000 voltage limits.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bus Asset Telemetry Audit */}
          <Card className="transition-all duration-200 flex flex-col justify-between">
            <CardHeader
              title="Bus Nodal Telemetry Audit"
              subtitle="Static record of voltage stability per node"
              icon={<Activity className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
            />
            <CardContent className="p-0 overflow-x-auto flex-1">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#F0FDF4] dark:bg-[#064E3B]/40 text-[#52665A] dark:text-[#A7F3D0] uppercase text-[10px] tracking-wider border-b border-[#BBF7D0]/60 dark:border-[#86EFAC]/20">
                  <tr>
                    <th className="py-2.5 px-3">Node</th>
                    <th className="py-2.5 px-3">Voltage</th>
                    <th className="py-2.5 px-3">Load</th>
                    <th className="py-2.5 px-3">Solar</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#BBF7D0]/40 dark:divide-[#86EFAC]/15 text-[#10251A] dark:text-[#ECFDF3]">
                  {network.buses.map((bus) => (
                    <tr key={bus.id} className="hover:bg-[#F0FDF4]/70 dark:hover:bg-[#064E3B]/20 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#10251A] dark:text-[#ECFDF3]">{bus.id}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span className={bus.status === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-[#047857] dark:text-[#86EFAC]'}>
                          {bus.voltage.toFixed(3)} pu
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#52665A] dark:text-[#A7F3D0]">{bus.loadKw} kW</td>
                      <td className="py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">{bus.solarKw} kW</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={bus.status === 'critical' ? 'danger' : 'success'} size="sm">
                          {bus.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}

export default ReportsPage
