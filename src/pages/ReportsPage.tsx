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
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sun,
  ShieldCheck,
  Activity,
} from 'lucide-react'

export const ReportsPage: React.FC = () => {
  const { network, currentTime, violations, violationSummary } = useGridStore()
  const { input, fullResult, selectedAction } = useSimulationStore()
  const [reportSummary, setReportSummary] = useState<GridReportSummary | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const scenarioName = fullResult?.summary.scenarioName || input.scenarioName

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
      violations: violations.map((v) => ({ id: v.id, issue: v.issue, component: v.componentName, severity: v.severity })),
    })
  }

  const handleExportCsv = () => {
    if (!reportSummary) return
    reportService.exportReportCsv(reportSummary)
  }

  const isSafe = violationSummary.critical === 0

  return (
    <PageContainer
      title="Digital Twin Simulation Reports"
      subtitle="Operational compliance records, mitigation audit, and asset utilization analytics"
      actions={
        <div className="flex items-center gap-3">
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
      {/* 1. Executive Summary Grid */}
      <Card>
        <CardHeader
          title="Executive Audit Summary"
          subtitle={`Scenario: ${scenarioName} • Snapshot: ${currentTime}`}
          icon={<FileText className="w-4 h-4 text-blue-400" />}
          action={<Badge variant={isSafe ? 'success' : 'danger'}>{isSafe ? 'Audit Passed' : 'Violations Logged'}</Badge>}
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg bg-[#0E172C] border border-[#1E293B]">
              <div className="text-[11px] text-slate-400">Scenario</div>
              <div className="text-xs font-bold text-white mt-1 truncate">{scenarioName}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Benchmark</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0E172C] border border-[#1E293B]">
              <div className="text-[11px] text-slate-400">Simulation Time</div>
              <div className="text-xs font-bold font-mono text-white mt-1">{currentTime}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Peak Snapshot</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0E172C] border border-[#1E293B]">
              <div className="text-[11px] text-slate-400">Active Violations</div>
              <div className={`text-xs font-bold font-mono mt-1 ${violations.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {violations.length} Issues
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Constraint Breaches</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0E172C] border border-[#1E293B]">
              <div className="text-[11px] text-slate-400">Actions Tested</div>
              <div className="text-xs font-bold font-mono text-white mt-1">4 Actions</div>
              <div className="text-[10px] text-slate-500 mt-0.5">BESS, Switching, Curtailment</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0E172C] border border-[#1E293B]">
              <div className="text-[11px] text-slate-400">Recommended Action</div>
              <div className="text-xs font-bold text-blue-400 mt-1 truncate">
                {selectedAction?.title || 'Feeder Reconfiguration'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Optimal Feasible</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0E172C] border border-[#1E293B]">
              <div className="text-[11px] text-slate-400">Renewable Used</div>
              <div className="text-xs font-bold font-mono text-emerald-400 mt-1">
                {reportSummary?.renewableUtilizationPercent || 96}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Zero Carbon Yield</div>
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
            icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
          />
          <CardContent className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              Under the active scenario <strong className="text-white">{scenarioName}</strong>, solar PV reverse power injection across Bus 2 and Bus 3 created nodal voltage escalation up to <span className="font-mono text-red-400 font-bold">1.074 pu</span>. Feeder F-02 loading peaked at <span className="font-mono text-red-400 font-bold">108%</span> of thermal ampacity rating.
            </p>
            <p>
              The optimization engine evaluated four corrective dispatch candidates. The tie-line switching action (<span className="text-blue-400 font-medium">Feeder Reconfiguration F-02 → F-03</span>) resolved all critical voltage and loading violations while preserving <span className="text-emerald-400 font-bold">96%</span> renewable utilization.
            </p>
            <div className="p-3 rounded-lg bg-[#0E172C] border border-[#1E293B] text-[11px] text-slate-400">
              <span className="font-bold text-white block mb-0.5">Infeasible Constraint Record:</span>
              A max battery discharge request (-80 kW) was flagged as <strong className="text-red-400">NOT FEASIBLE</strong> due to insufficient battery state-of-charge reserves.
            </div>
          </CardContent>
        </Card>

        {/* Bus Asset Telemetry Audit */}
        <Card>
          <CardHeader
            title="Bus Nodal Telemetry Audit"
            subtitle="Static record of voltage stability per node"
            icon={<Activity className="w-4 h-4 text-blue-400" />}
          />
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#0E172C] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                <tr>
                  <th className="py-2.5 px-3">Node</th>
                  <th className="py-2.5 px-3">Voltage</th>
                  <th className="py-2.5 px-3">Load</th>
                  <th className="py-2.5 px-3">Solar</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B] text-slate-200">
                {network.buses.map((bus) => (
                  <tr key={bus.id} className="hover:bg-[#16223F]">
                    <td className="py-2.5 px-3 font-mono font-bold text-white">{bus.id}</td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      <span className={bus.status === 'critical' ? 'text-red-400' : 'text-emerald-400'}>
                        {bus.voltage.toFixed(3)} pu
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">{bus.loadKw} kW</td>
                    <td className="py-2.5 px-3 font-mono text-amber-400">{bus.solarKw} kW</td>
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
    </PageContainer>
  )
}
