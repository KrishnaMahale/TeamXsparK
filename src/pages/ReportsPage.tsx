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
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Activity,
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
    <PageContainer
      title="Digital Twin Simulation Reports"
      subtitle="Operational compliance records, mitigation audit, and asset utilization analytics"
      actions={
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportJson}
          >
            Export JSON
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 1. Executive Summary Grid */}
        <Card>
          <CardHeader
            title="Executive Audit Summary"
            subtitle={`Scenario: ${scenarioName} • Snapshot: ${currentTime}`}
            icon={<FileText className="w-4 h-4 text-[#A0C878]" />}
            action={<Badge variant={isSafe ? 'success' : 'danger'}>{isSafe ? 'Audit Passed (Safe)' : 'Violations Logged'}</Badge>}
          />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs">
                <div className="text-[11px] text-[#788477] dark:text-[#859483] font-medium">Scenario</div>
                <div className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] mt-1 truncate">{scenarioName}</div>
                <div className="text-[10px] text-[#788477] dark:text-[#859483] mt-0.5">Benchmark</div>
              </div>

              <div className="p-3 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs">
                <div className="text-[11px] text-[#788477] dark:text-[#859483] font-medium">Simulation Time</div>
                <div className="text-xs font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-1">{currentTime}</div>
                <div className="text-[10px] text-[#788477] dark:text-[#859483] mt-0.5">Peak Snapshot</div>
              </div>

              <div className="p-3 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs">
                <div className="text-[11px] text-[#788477] dark:text-[#859483] font-medium">Active Violations</div>
                <div className={`text-xs font-bold font-mono mt-1 ${violationSummary.total > 0 ? 'text-red-700 dark:text-red-400' : 'text-[#A0C878]'}`}>
                  {violationSummary.total > 0 ? `${violationSummary.total} Issues` : '0 Issues (Resolved)'}
                </div>
                <div className="text-[10px] text-[#788477] dark:text-[#859483] mt-0.5">{isSafe ? 'Cleared' : 'Constraint Breaches'}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs">
                <div className="text-[11px] text-[#788477] dark:text-[#859483] font-medium">Actions Tested</div>
                <div className="text-xs font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-1">4 Actions</div>
                <div className="text-[10px] text-[#788477] dark:text-[#859483] mt-0.5">BESS, Switching, Curtailment</div>
              </div>

              <div className="p-3 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs">
                <div className="text-[11px] text-[#788477] dark:text-[#859483] font-medium">Applied / Recommended</div>
                <div className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] mt-1 truncate">
                  {currentAction?.title || 'Feeder Reconfiguration'}
                </div>
                <div className="text-[10px] text-[#788477] dark:text-[#859483] mt-0.5">{isSafe ? 'Dispatched' : 'Optimal Feasible'}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs">
                <div className="text-[11px] text-[#788477] dark:text-[#859483] font-medium">Renewable Used</div>
                <div className="text-xs font-bold font-mono text-[#A0C878] mt-1">
                  {currentAction?.renewableUtilizationPercent || reportSummary?.renewableUtilizationPercent || 96}%
                </div>
                <div className="text-[10px] text-[#788477] dark:text-[#859483] mt-0.5">Zero Carbon Yield</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Audit Narrative & Technical Record */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Compliance Narrative */}
          <Card>
            <CardHeader
              title="Grid Compliance Narrative"
              subtitle="Automated power-flow audit statement"
              icon={<ShieldCheck className="w-4 h-4 text-[#A0C878]" />}
            />
            <CardContent className="space-y-3 text-xs text-[#506052] dark:text-[#C2CCC0] leading-relaxed">
              <p>
                Under the active scenario <strong className="text-[#26352A] dark:text-[#F2F5ED]">{scenarioName}</strong> at time snapshot <span className="font-mono text-[#26352A] dark:text-[#F2F5ED] font-bold">{currentTime}</span>, peak solar generation reached <span className="font-mono text-[#B09B29] dark:text-[#D4B838] font-bold">{reportSummary?.peakSolarKw ?? 240} kW</span> against a peak load of <span className="font-mono text-[#26352A] dark:text-[#F2F5ED] font-bold">{reportSummary?.peakLoadKw ?? 150} kW</span>. Initial audit identified <span className="font-mono text-red-700 dark:text-red-400 font-bold">{reportSummary?.initialViolations ?? 2}</span> constraint breaches.
              </p>
              <p>
                The optimization engine evaluated and dispatched <span className="text-[#26352A] dark:text-[#A0C878] font-semibold">{currentAction?.title || 'Feeder Reconfiguration (F-02 → F-03)'}</span>, which cleared critical violations (remaining: <span className="text-[#A0C878] font-bold">{violationSummary.critical}</span>) while preserving <span className="text-[#A0C878] font-bold">{currentAction?.renewableUtilizationPercent || reportSummary?.renewableUtilizationPercent || 96}%</span> renewable utilization.
              </p>
              <div className="p-3.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] text-[11px] text-[#506052] dark:text-[#C2CCC0]">
                <span className="font-bold text-[#26352A] dark:text-[#F2F5ED] block mb-0.5">Asset Utilization Metric:</span>
                Grid loss estimated at <strong className="text-[#26352A] dark:text-[#F2F5ED]">{reportSummary?.gridLossPercent ?? 3.2}%</strong> with Voltage Stability Index (VSI) at <strong className="text-[#A0C878]">{reportSummary?.voltageStabilityIndex ?? 0.98}</strong>. Battery throughput: <strong className="text-[#26352A] dark:text-[#F2F5ED]">{reportSummary?.batteryThroughputKwh ?? 24.5} kWh</strong>.
              </div>
            </CardContent>
          </Card>

          {/* Bus Asset Telemetry Audit */}
          <Card>
            <CardHeader
              title="Bus Nodal Telemetry Audit"
              subtitle="Static record of voltage stability per node"
              icon={<Activity className="w-4 h-4 text-[#A0C878]" />}
            />
            <CardContent className="p-0 overflow-x-auto">
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
                    <tr key={bus.id} className="hover:bg-[#DDEB9D]/30 dark:hover:bg-[#2D3E2F]/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#26352A] dark:text-[#F2F5ED]">{bus.id}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span className={bus.status === 'critical' ? 'text-red-700 dark:text-red-400' : 'text-[#A0C878]'}>
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
