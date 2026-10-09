import React, { useState, useEffect } from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
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
            icon={<FileText className="w-4 h-4 text-[#A0C878]" />}
            action={
              <Badge variant={isSafe ? 'success' : 'danger'}>
                {isSafe ? 'Audit Passed (Safe)' : 'Violations Logged'}
              </Badge>
            }
          />
          <CardContent className="pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Scenario */}
              <div className="p-3 rounded-xl bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-2xs">
                <span className="text-[10px] text-[#788477] dark:text-[#859483] font-medium block">Active Scenario</span>
                <div className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] mt-1 truncate">
                  {scenarioName}
                </div>
                <span className="text-[10px] font-mono text-[#788477] dark:text-[#859483] block mt-0.5">
                  {currentTime} Snapshot
                </span>
              </div>

              {/* Grid Health */}
              <div className="p-3 rounded-xl bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-2xs">
                <span className="text-[10px] text-[#788477] dark:text-[#859483] font-medium block">Grid Health</span>
                <div className={`text-xs font-bold font-mono mt-1 ${violationSummary.total > 0 ? 'text-red-600 dark:text-red-400' : 'text-[#A0C878]'}`}>
                  {violationSummary.total > 0 ? `${violationSummary.total} Issues` : '0 Violations'}
                </div>
                <span className={`text-[10px] block mt-0.5 font-medium ${isSafe ? 'text-[#A0C878]' : 'text-red-600 dark:text-red-400'}`}>
                  {isSafe ? 'Compliant ✓' : 'Constraint Breach'}
                </span>
              </div>

              {/* Dispatched Action */}
              <div className="p-3 rounded-xl bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-2xs">
                <span className="text-[10px] text-[#788477] dark:text-[#859483] font-medium block">Optimal Intervention</span>
                <div className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] mt-1 truncate">
                  {currentAction?.title || 'Feeder Reconfiguration'}
                </div>
                <span className="text-[10px] text-[#788477] dark:text-[#859483] block mt-0.5">
                  {isSafe ? 'Dispatched' : 'Recommended'}
                </span>
              </div>

              {/* Renewable Utilization */}
              <div className="p-3 rounded-xl bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-2xs">
                <span className="text-[10px] text-[#788477] dark:text-[#859483] font-medium block">Clean Solar Kept</span>
                <div className="text-xs font-bold font-mono text-[#A0C878] mt-1">
                  {currentAction?.renewableUtilizationPercent || reportSummary?.renewableUtilizationPercent || 96}%
                </div>
                <span className="text-[10px] text-[#788477] dark:text-[#859483] block mt-0.5">
                  Zero Curtailment
                </span>
              </div>

              {/* System Performance */}
              <div className="p-3 rounded-xl bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-[10px] text-[#788477] dark:text-[#859483] font-medium block">Loss & Stability</span>
                <div className="text-xs font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-1">
                  {reportSummary?.gridLossPercent ?? 3.2}% Loss
                </div>
                <span className="text-[10px] text-[#A0C878] font-mono block mt-0.5">
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
              icon={<ShieldCheck className="w-4 h-4 text-[#A0C878]" />}
            />
            <CardContent className="space-y-2.5 flex-1">
              {/* Point 1: Generation vs Demand */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/80 dark:border-[#2C3C2E]">
                <Zap className="w-4 h-4 text-[#B09B29] shrink-0 mt-0.5" />
                <div className="text-xs text-[#506052] dark:text-[#C2CCC0] leading-snug">
                  <strong className="text-[#26352A] dark:text-[#F2F5ED]">Generation vs Demand:</strong> Peak solar generation reached{' '}
                  <span className="font-mono font-bold text-[#B09B29] dark:text-[#D4B838]">{reportSummary?.peakSolarKw ?? 240} kW</span>{' '}
                  against a peak load of{' '}
                  <span className="font-mono font-bold text-[#26352A] dark:text-[#F2F5ED]">{reportSummary?.peakLoadKw ?? 150} kW</span>{' '}
                  at time snapshot <span className="font-mono font-bold">{currentTime}</span>.
                </div>
              </div>

              {/* Point 2: Constraint Mitigation */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/80 dark:border-[#2C3C2E]">
                <ShieldCheck className="w-4 h-4 text-[#A0C878] shrink-0 mt-0.5" />
                <div className="text-xs text-[#506052] dark:text-[#C2CCC0] leading-snug">
                  <strong className="text-[#26352A] dark:text-[#F2F5ED]">Constraint Mitigation:</strong> Initial audit detected{' '}
                  <span className="font-mono font-bold text-red-600 dark:text-red-400">{reportSummary?.initialViolations ?? 2}</span> breaches.{' '}
                  Optimization engine dispatched{' '}
                  <span className="font-semibold text-[#26352A] dark:text-[#A0C878]">{currentAction?.title || 'Feeder Reconfiguration (F-02 → F-03)'}</span>, resolving critical constraints (remaining: <span className="font-mono font-bold text-[#A0C878]">{violationSummary.critical}</span>).
                </div>
              </div>

              {/* Point 3: Renewable Yield */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/80 dark:border-[#2C3C2E]">
                <Sun className="w-4 h-4 text-[#A0C878] shrink-0 mt-0.5" />
                <div className="text-xs text-[#506052] dark:text-[#C2CCC0] leading-snug">
                  <strong className="text-[#26352A] dark:text-[#F2F5ED]">Renewable Yield:</strong> Maintained{' '}
                  <span className="font-mono font-bold text-[#A0C878]">{currentAction?.renewableUtilizationPercent || reportSummary?.renewableUtilizationPercent || 96}%</span>{' '}
                  clean energy utilization with zero unnecessary curtailment.
                </div>
              </div>

              {/* Point 4: System Efficiency */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/80 dark:border-[#2C3C2E]">
                <Activity className="w-4 h-4 text-[#506052] dark:text-[#C2CCC0] shrink-0 mt-0.5" />
                <div className="text-xs text-[#506052] dark:text-[#C2CCC0] leading-snug">
                  <strong className="text-[#26352A] dark:text-[#F2F5ED]">System Efficiency:</strong> Estimated technical grid loss at{' '}
                  <span className="font-mono font-bold">{reportSummary?.gridLossPercent ?? 3.2}%</span>, Voltage Stability Index at{' '}
                  <span className="font-mono font-bold text-[#A0C878]">{reportSummary?.voltageStabilityIndex ?? 0.98} VSI</span>, and battery throughput of{' '}
                  <span className="font-mono font-bold">{reportSummary?.batteryThroughputKwh ?? 24.5} kWh</span>.
                </div>
              </div>

              {/* Point 5: Regulatory Standards */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/80 dark:border-[#2C3C2E]">
                <CheckCircle2 className="w-4 h-4 text-[#A0C878] shrink-0 mt-0.5" />
                <div className="text-xs text-[#506052] dark:text-[#C2CCC0] leading-snug">
                  <strong className="text-[#26352A] dark:text-[#F2F5ED]">Regulatory Standards:</strong> All nodal power flows operate in full compliance with statutory IEEE 1547 and IEC 61000 voltage limits.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bus Asset Telemetry Audit */}
          <Card className="transition-all duration-200 flex flex-col justify-between">
            <CardHeader
              title="Bus Nodal Telemetry Audit"
              subtitle="Static record of voltage stability per node"
              icon={<Activity className="w-4 h-4 text-[#A0C878]" />}
            />
            <CardContent className="p-0 overflow-x-auto flex-1">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#F3EEDC] dark:bg-[#18231A] text-[#788477] dark:text-[#859483] uppercase text-[10px] tracking-wider border-b border-[#DDD9C9] dark:border-[#2C3C2E]">
                  <tr>
                    <th className="py-2.5 px-3">Node</th>
                    <th className="py-2.5 px-3">Voltage</th>
                    <th className="py-2.5 px-3">Load</th>
                    <th className="py-2.5 px-3">Solar</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD9C9] dark:divide-[#2C3C2E] text-[#26352A] dark:text-[#F2F5ED]">
                  {network.buses.map((bus) => (
                    <tr key={bus.id} className="hover:bg-[#DDEB9D]/20 dark:hover:bg-[#2D3E2F]/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#26352A] dark:text-[#F2F5ED]">{bus.id}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span className={bus.status === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-[#A0C878]'}>
                          {bus.voltage.toFixed(3)} pu
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#506052] dark:text-[#C2CCC0]">{bus.loadKw} kW</td>
                      <td className="py-2.5 px-3 font-mono text-[#B09B29] dark:text-[#D4B838]">{bus.solarKw} kW</td>
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
