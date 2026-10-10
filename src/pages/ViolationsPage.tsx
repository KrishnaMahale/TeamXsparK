import React from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useViolations } from '../hooks/useViolations'
import { GridViolation } from '../types/violation'
import { useNavigate } from 'react-router-dom'
import { useGridStore } from '../store/gridStore'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Filter,
  Activity,
  ArrowRight,
  ShieldCheck,
  MapPin,
} from 'lucide-react'

export const ViolationsPage: React.FC = () => {
  const {
    violations,
    summary,
    viewScope,
    setViewScope,
    worstTime,
    worstTimestepViolations,
    fullHorizonViolations,
    hasFullSimulation,
    severityFilter,
    setSeverityFilter,
    statusFilter,
    setStatusFilter,
    handleSelectViolation,
  } = useViolations()

  const { network } = useGridStore()
  const navigate = useNavigate()

  const onRowClick = (item: GridViolation) => {
    handleSelectViolation(item)
    navigate('/')
  }

  return (
    <PageContainer
      title="Grid Health & Violations Log"
      subtitle={
        viewScope === 'worst_timestep'
          ? `Operating violations at peak stress timestep (${worstTime}) for ${network.name} — Identical baseline used by Corrective Actions`
          : `Full 24-hour diurnal chronological log of all constraint violations across 96 simulation intervals for ${network.name}`
      }
      actions={
        <div className="flex items-center gap-2.5">
          {/* Scope Selector: Aligns Worst Timestep with Actions Page */}
          <div className="flex items-center bg-white/90 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 rounded-xl p-0.5 text-xs font-semibold shadow-2xs">
            <button
              onClick={() => setViewScope('worst_timestep')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewScope === 'worst_timestep'
                  ? 'bg-[#047857] text-white font-bold shadow-xs'
                  : 'text-[#425B4C] dark:text-[#A7F3D0] hover:text-[#064E3B]'
              }`}
            >
              Worst Timestep ({worstTime})
            </button>
            <button
              onClick={() => setViewScope('full_horizon')}
              disabled={!hasFullSimulation}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewScope === 'full_horizon'
                  ? 'bg-[#047857] text-white font-bold shadow-xs'
                  : 'text-[#425B4C] dark:text-[#A7F3D0] hover:text-[#064E3B] disabled:opacity-50'
              }`}
              title={hasFullSimulation ? 'View all violations across 24h simulation' : 'Run 24h simulation to view full horizon'}
            >
              Full Horizon (24h)
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => navigate('/actions')}
          >
            Evaluate Corrective Actions
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Scope Context Banner */}
        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="font-bold text-[#10251A] dark:text-white">
              {viewScope === 'worst_timestep'
                ? `Evaluation Scope: Worst Operating Timestep (${worstTime})`
                : `Evaluation Scope: Full 24-Hour Horizon (96 Timesteps)`}
            </span>
            <span className="text-[#BBF7D0] dark:text-[#86EFAC]/30">|</span>
            <span className="text-[#425B4C] dark:text-[#A7F3D0] font-medium">
              {viewScope === 'worst_timestep'
                ? `Matches Actions Page Before-Dispatch State (${summary.critical} Active Violations)`
                : `${fullHorizonViolations.length} total constraint breaches detected across full diurnal cycle`}
            </span>
          </div>

          <span className="font-mono text-[11px] text-[#047857] dark:text-[#86EFAC] font-bold">
            Grid: {network.name} ({network.id})
          </span>
        </div>

        {/* 1. Grid Health Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Critical Issues */}
          <div
            className={`p-5 rounded-2xl border flex items-center justify-between shadow-xs transition-colors backdrop-blur-md ${
              summary.critical > 0
                ? 'bg-red-50/80 dark:bg-red-950/35 border-red-300 dark:border-red-900/80'
                : 'bg-white/90 dark:bg-[#122C1F]/90 border-[#BBF7D0]/70 dark:border-[#86EFAC]/25'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#425B4C] dark:text-[#A7F3D0]">
                  Critical Violations
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-[#10251A] dark:text-white mt-1">
                {summary.critical}
              </div>
              <div className="text-[11px] text-red-600 dark:text-red-400 mt-0.5 font-semibold">
                {viewScope === 'worst_timestep' ? `Active at ${worstTime} peak` : 'Across diurnal sequence'}
              </div>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>

          {/* Warning Issues */}
          <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between shadow-xs transition-colors backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#425B4C] dark:text-[#A7F3D0]">
                  Warnings
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-[#10251A] dark:text-white mt-1">
                {summary.warning}
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 font-semibold">High reverse power sensitivity</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>

          {/* Resolved Issues */}
          <div className="p-5 rounded-2xl bg-[#ECFDF3]/80 dark:bg-[#132F21]/80 border border-[#86EFAC]/70 dark:border-[#86EFAC]/40 flex items-center justify-between shadow-xs transition-colors backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#425B4C] dark:text-[#A7F3D0]">
                  Resolved / Safe
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-[#10251A] dark:text-white mt-1">
                {summary.resolved}
              </div>
              <div className="text-[11px] text-[#047857] dark:text-[#86EFAC] mt-0.5 font-semibold">Cleared by corrective actions</div>
            </div>
            <CheckCircle2 className="w-8 h-8 text-[#047857] dark:text-[#86EFAC]" />
          </div>
        </div>

        {/* 2. Filter Bar */}
        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 flex flex-wrap items-center justify-between gap-4 shadow-2xs transition-colors">
          <div className="flex items-center gap-2 text-xs font-medium text-[#425B4C] dark:text-[#A7F3D0]">
            <Filter className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />
            <span>Severity:</span>
            {(['all', 'critical', 'warning'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors border cursor-pointer ${
                  severityFilter === sev
                    ? 'bg-[#047857] text-white border-[#047857] shadow-xs'
                    : 'bg-[#F4FAF5] dark:bg-[#0E2419] text-[#425B4C] dark:text-[#A7F3D0] border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 hover:bg-[#ECFDF3]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-[#425B4C] dark:text-[#A7F3D0]">
            <span>Status:</span>
            {(['all', 'active', 'resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors border cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#047857] text-white border-[#047857] shadow-xs'
                    : 'bg-[#F4FAF5] dark:bg-[#0E2419] text-[#425B4C] dark:text-[#A7F3D0] border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 hover:bg-[#ECFDF3]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Violations Table */}
        <Card>
          <CardHeader
            title="Active & Historical Violations"
            subtitle="Click any row to synchronize digital twin time and locate asset on schematic"
            icon={<Activity className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
          />
          <CardContent className="p-0 overflow-x-auto">
            {violations.length === 0 ? (
              <div className="p-12 text-center text-[#425B4C] dark:text-[#A7F3D0]">
                <ShieldCheck className="w-10 h-10 text-[#047857] dark:text-[#86EFAC] mx-auto mb-2" />
                <div className="text-sm font-bold text-[#10251A] dark:text-white">
                  No Violations Detected on {network.name}
                </div>
                <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] mt-1 font-medium">
                  All {network.buses.length} buses and {network.feeders.length} branches satisfy statutory voltage and thermal constraints.
                </p>
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                <thead className="bg-[#F4FAF5] dark:bg-[#0E2419] text-[#425B4C] dark:text-[#A7F3D0] uppercase text-[10px] tracking-wider border-b border-[#BBF7D0]/60 dark:border-[#86EFAC]/20">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Time</th>
                    <th className="py-3.5 px-4 font-bold">Component</th>
                    <th className="py-3.5 px-4 font-bold">Issue Description</th>
                    <th className="py-3.5 px-4 font-bold">Value</th>
                    <th className="py-3.5 px-4 font-bold">Threshold</th>
                    <th className="py-3.5 px-4 font-bold">Severity</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#BBF7D0]/40 dark:divide-[#86EFAC]/15 text-[#10251A] dark:text-[#F0FDF4]">
                  {violations.map((violation) => {
                    const isCritical = violation.severity === 'critical'
                    return (
                      <tr
                        key={violation.id}
                        onClick={() => onRowClick(violation)}
                        className="hover:bg-[#ECFDF3]/60 dark:hover:bg-[#163826]/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-[#10251A] dark:text-white">
                          {violation.time}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#10251A] dark:text-white">{violation.componentName}</div>
                          <div className="text-[10px] text-[#425B4C] dark:text-[#A7F3D0] font-mono">{violation.componentId}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#425B4C] dark:text-[#A7F3D0]">{violation.issue}</td>
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <span className={isCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}>
                            {violation.formattedValue}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#425B4C] dark:text-[#A7F3D0]">
                          {violation.formattedLimit}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={isCritical ? 'danger' : 'warning'} size="sm">
                            {violation.severity}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={violation.status === 'active' ? 'danger' : 'success'} size="sm">
                            {violation.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#047857] dark:text-[#86EFAC] hover:underline font-bold">
                            <MapPin className="w-3 h-3" />
                            Locate
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

export default ViolationsPage
