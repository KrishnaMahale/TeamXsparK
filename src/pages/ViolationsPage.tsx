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
  Cpu,
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
          <div className="flex items-center bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-lg p-0.5 text-xs font-semibold">
            <button
              onClick={() => setViewScope('worst_timestep')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewScope === 'worst_timestep'
                  ? 'bg-[#A0C878] text-[#26352A] shadow-xs'
                  : 'text-[#506052] dark:text-[#C2CCC0] hover:text-[#26352A]'
              }`}
            >
              Worst Timestep ({worstTime})
            </button>
            <button
              onClick={() => setViewScope('full_horizon')}
              disabled={!hasFullSimulation}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewScope === 'full_horizon'
                  ? 'bg-[#A0C878] text-[#26352A] shadow-xs'
                  : 'text-[#506052] dark:text-[#C2CCC0] hover:text-[#26352A] disabled:opacity-50'
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
        <div className="p-3 rounded-xl bg-[#FFFDF6] dark:bg-[#18231A] border border-[#DDD9C9] dark:border-[#2C3C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#A0C878] animate-pulse" />
            <span className="font-semibold text-[#26352A] dark:text-[#F2F5ED]">
              {viewScope === 'worst_timestep'
                ? `Evaluation Scope: Worst Operating Timestep (${worstTime})`
                : `Evaluation Scope: Full 24-Hour Horizon (96 Timesteps)`}
            </span>
            <span className="text-[#DDD9C9] dark:text-[#2C3C2E]">|</span>
            <span className="text-[#788477] dark:text-[#859483]">
              {viewScope === 'worst_timestep'
                ? `Matches Actions Page Before-Dispatch State (${summary.critical} Active Violations)`
                : `${fullHorizonViolations.length} total constraint breaches detected across full diurnal cycle`}
            </span>
          </div>

          <span className="font-mono text-[11px] text-[#A0C878] font-bold">
            Grid: {network.name} ({network.id})
          </span>
        </div>

        {/* 1. Grid Health Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Critical Issues */}
          <div
            className={`p-5 rounded-xl border flex items-center justify-between shadow-xs transition-colors ${
              summary.critical > 0
                ? 'bg-red-50/80 dark:bg-red-950/40 border-red-300 dark:border-red-900/80'
                : 'bg-[#FAF6E9] dark:bg-[#1E2B20] border-[#DDD9C9] dark:border-[#2C3C2E]'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#506052] dark:text-[#C2CCC0]">
                  Critical Violations
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-1">
                {summary.critical}
              </div>
              <div className="text-[11px] text-red-700 dark:text-red-400 mt-0.5 font-medium">
                {viewScope === 'worst_timestep' ? `Active at ${worstTime} peak` : 'Across diurnal sequence'}
              </div>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>

          {/* Warning Issues */}
          <div className="p-5 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] flex items-center justify-between shadow-xs transition-colors">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#506052] dark:text-[#C2CCC0]">
                  Warnings
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-1">
                {summary.warning}
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 font-medium">High reverse power sensitivity</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>

          {/* Resolved Issues */}
          <div className="p-5 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] flex items-center justify-between shadow-xs transition-colors">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A0C878]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#506052] dark:text-[#C2CCC0]">
                  Resolved / Safe
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-1">
                {summary.resolved}
              </div>
              <div className="text-[11px] text-[#A0C878] mt-0.5 font-medium">Cleared by corrective actions</div>
            </div>
            <CheckCircle2 className="w-8 h-8 text-[#A0C878]" />
          </div>
        </div>

        {/* 2. Filter Bar */}
        <div className="p-3.5 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] flex flex-wrap items-center justify-between gap-4 shadow-xs transition-colors">
          <div className="flex items-center gap-2 text-xs font-medium text-[#506052] dark:text-[#C2CCC0]">
            <Filter className="w-4 h-4 text-[#A0C878]" />
            <span>Severity:</span>
            {(['all', 'critical', 'warning'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition-colors border ${
                  severityFilter === sev
                    ? 'bg-[#A0C878] text-[#26352A] border-[#A0C878] shadow-xs'
                    : 'bg-[#FFFDF6] dark:bg-[#151F17] text-[#506052] dark:text-[#C2CCC0] border-[#DDD9C9] dark:border-[#2C3C2E] hover:bg-[#DDEB9D]/40'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-[#506052] dark:text-[#C2CCC0]">
            <span>Status:</span>
            {(['all', 'active', 'resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition-colors border ${
                  statusFilter === st
                    ? 'bg-[#A0C878] text-[#26352A] border-[#A0C878] shadow-xs'
                    : 'bg-[#FFFDF6] dark:bg-[#151F17] text-[#506052] dark:text-[#C2CCC0] border-[#DDD9C9] dark:border-[#2C3C2E] hover:bg-[#DDEB9D]/40'
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
            icon={<Activity className="w-4 h-4 text-[#A0C878]" />}
          />
          <CardContent className="p-0 overflow-x-auto">
            {violations.length === 0 ? (
              <div className="p-12 text-center text-[#788477] dark:text-[#859483]">
                <ShieldCheck className="w-10 h-10 text-[#A0C878] mx-auto mb-2" />
                <div className="text-sm font-bold text-[#26352A] dark:text-[#F2F5ED]">
                  No Violations Detected on {network.name}
                </div>
                <p className="text-xs text-[#788477] dark:text-[#859483] mt-1">
                  All {network.buses.length} buses and {network.feeders.length} branches satisfy statutory voltage and thermal constraints.
                </p>
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                <thead className="bg-[#F3EEDC] dark:bg-[#18231A] text-[#788477] dark:text-[#859483] uppercase text-[10px] tracking-wider border-b border-[#DDD9C9] dark:border-[#2C3C2E]">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Component</th>
                    <th className="py-3 px-4">Issue Description</th>
                    <th className="py-3 px-4">Value</th>
                    <th className="py-3 px-4">Threshold</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD9C9] dark:divide-[#2C3C2E] text-[#26352A] dark:text-[#F2F5ED]">
                  {violations.map((violation) => {
                    const isCritical = violation.severity === 'critical'
                    return (
                      <tr
                        key={violation.id}
                        onClick={() => onRowClick(violation)}
                        className="hover:bg-[#DDEB9D]/30 dark:hover:bg-[#2D3E2F]/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[#26352A] dark:text-[#F2F5ED]">
                          {violation.time}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#26352A] dark:text-[#F2F5ED]">{violation.componentName}</div>
                          <div className="text-[10px] text-[#788477] dark:text-[#859483] font-mono">{violation.componentId}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#506052] dark:text-[#C2CCC0]">{violation.issue}</td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className={isCritical ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}>
                            {violation.formattedValue}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#788477] dark:text-[#859483]">
                          {violation.formattedLimit}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={isCritical ? 'danger' : 'warning'} size="sm">
                            {violation.severity}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={violation.status === 'active' ? 'danger' : 'success'} size="sm">
                            {violation.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#26352A] dark:text-[#A0C878] hover:underline font-semibold">
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
