import React from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
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
  ShieldCheck,
  MapPin,
} from 'lucide-react'

export const ViolationsPage: React.FC = () => {
  const {
    violations,
    summary,
    viewScope,
    worstTime,
    worstTimestepViolations,
    fullHorizonViolations,
    operatingStateMode,
    setOperatingStateMode,
    hasDispatchedAction,
    activeActionTitle,
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
    <PageContainer compact className="py-2.5 px-3.5 lg:py-3 lg:px-4 flex flex-col flex-1">
      <div className="space-y-3.5 w-full flex-1 flex flex-col pb-4">
        {/* Upshifted Custom Hero Heading Box with Refined Mint Gradient & Depth */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#F0FDF4]/95 via-white/95 to-white/85 dark:from-[#0E291C]/95 dark:via-[#122C1F]/90 dark:to-[#0E2419]/85 backdrop-blur-md border border-[#86EFAC]/75 dark:border-[#86EFAC]/35 p-4 sm:p-5 lg:p-5.5 shadow-[0_10px_30px_rgba(16,80,55,0.08),0_2px_8px_rgba(16,80,55,0.04)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
          {/* Background Visual Layer: Renewable Grid Landscape Seamless Gradient Fade */}
          <div className="header-hero-bg absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <img
              src="/images/hero_grid.jpg"
              alt="Renewable Grid Background"
              className="header-hero-bg-img w-full h-full object-cover object-right lg:object-center opacity-90 dark:opacity-60 transition-opacity"
              loading="eager"
            />
          </div>

          {/* Left: Upshifted Bigger Heading & Subtitle */}
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl lg:text-4xl font-black text-[#064E3B] dark:text-[#F0FDF4] tracking-tight leading-none">
              Grid Health & Violations Log
            </h1>
            <p className="text-xs sm:text-sm text-[#375243] dark:text-[#A7F3D0] font-medium mt-1.5 leading-relaxed max-w-xl">
              {operatingStateMode === 'baseline'
                ? `Authoritative pre-dispatch baseline violations for ${network.name} (${worstTime}) — Exactly matches Actions Page Before-Dispatch state.`
                : `Post-dispatch physical operating state following ${activeActionTitle} for ${network.name} — Exactly matches Actions Page After-Dispatch state.`}
            </p>
          </div>
        </div>

        {/* Scope & State Context Banner with State Toggle */}
        <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#122C1F]/90 border border-[#86EFAC]/70 dark:border-[#86EFAC]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${operatingStateMode === 'baseline' ? 'bg-red-500 animate-pulse' : 'bg-[#16A34A]'}`} />
            <span className="font-bold text-[#10251A] dark:text-white">
              {operatingStateMode === 'baseline'
                ? `Evaluation State: Pre-Dispatch Baseline (${viewScope === 'worst_timestep' ? `Peak ${worstTime}` : '24h Diurnal'})`
                : `Evaluation State: Post-Dispatch (${activeActionTitle})`}
            </span>
            <span className="text-[#BBF7D0] dark:text-[#86EFAC]/30">|</span>
            <span className="text-[#425B4C] dark:text-[#A7F3D0] font-medium">
              {operatingStateMode === 'baseline'
                ? `Matches Actions Page Before-Dispatch Panel (${summary.critical + summary.warning} Active Violations)`
                : `Matches Actions Page After-Dispatch Panel (${summary.critical + summary.warning} Remaining Active, ${summary.resolved} Resolved)`}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasDispatchedAction && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F0FDF4] dark:bg-[#064E3B]/40 border border-[#86EFAC]/60 dark:border-[#86EFAC]/30 font-bold">
                <button
                  type="button"
                  onClick={() => setOperatingStateMode('baseline')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                    operatingStateMode === 'baseline'
                      ? 'bg-[#047857] text-white shadow-2xs'
                      : 'text-[#425B4C] dark:text-[#A7F3D0] hover:bg-[#ECFDF3] dark:hover:bg-[#064E3B]'
                  }`}
                >
                  Pre-Dispatch ({worstTimestepViolations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOperatingStateMode('post_dispatch')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                    operatingStateMode === 'post_dispatch'
                      ? 'bg-[#047857] text-white shadow-2xs'
                      : 'text-[#425B4C] dark:text-[#A7F3D0] hover:bg-[#ECFDF3] dark:hover:bg-[#064E3B]'
                  }`}
                >
                  Post-Dispatch
                </button>
              </div>
            )}
            <span className="font-mono text-[11px] text-[#047857] dark:text-[#86EFAC] font-bold">
              Grid: {network.name} ({network.id})
            </span>
          </div>
        </div>

        {/* 1. Grid Health Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Critical Issues */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md backdrop-blur-md ${
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
                {operatingStateMode === 'baseline'
                  ? `Active at ${worstTime} peak`
                  : 'Remaining active breaches'}
              </div>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>

          {/* Warning Issues */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md backdrop-blur-md">
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
          <div className="p-4 sm:p-5 rounded-2xl bg-[#ECFDF3]/80 dark:bg-[#132F21]/80 border border-[#86EFAC]/70 dark:border-[#86EFAC]/40 flex items-center justify-between shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md backdrop-blur-md">
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
              <div className="text-[11px] text-[#047857] dark:text-[#86EFAC] mt-0.5 font-semibold">
                {operatingStateMode === 'baseline' ? 'Pre-intervention baseline reference' : 'Cleared by corrective action'}
              </div>
            </div>
            <CheckCircle2 className="w-8 h-8 text-[#047857] dark:text-[#86EFAC]" />
          </div>
        </div>

        {/* 2. Filter Bar */}
        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 flex flex-wrap items-center justify-between gap-4 shadow-2xs transition-colors backdrop-blur-md">
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
        <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md shadow-[0_8px_25px_rgba(16,80,55,0.06)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.3)] flex-1 flex flex-col overflow-hidden transition-all duration-300">
          <CardHeader
            title="Active & Historical Violations"
            subtitle="Click any row to synchronize digital twin time and locate asset on schematic"
            icon={<Activity className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
          />
          <CardContent className="p-0 overflow-x-auto flex-1 flex flex-col">
            {violations.length === 0 ? (
              <div className="py-16 px-6 flex-1 flex flex-col items-center justify-center text-center text-[#425B4C] dark:text-[#A7F3D0]">
                <ShieldCheck className="w-12 h-12 text-[#047857] dark:text-[#86EFAC] mx-auto mb-3" />
                <div className="text-base font-bold text-[#10251A] dark:text-white">
                  No Violations Detected on {network.name}
                </div>
                <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] mt-1 font-medium max-w-md">
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
