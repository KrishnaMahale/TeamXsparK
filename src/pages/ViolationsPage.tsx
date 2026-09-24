import React from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useViolations } from '../hooks/useViolations'
import { GridViolation } from '../types/violation'
import { useNavigate } from 'react-router-dom'
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
    allViolations,
    summary,
    severityFilter,
    setSeverityFilter,
    statusFilter,
    setStatusFilter,
    handleSelectViolation,
  } = useViolations()

  const navigate = useNavigate()

  const onRowClick = (item: GridViolation) => {
    handleSelectViolation(item)
    navigate('/')
  }

  return (
    <PageContainer
      title="Grid Health & Violations Log"
      subtitle="Chronological log of voltage, line ampacity, and transformer constraint violations"
      actions={
        <Button
          variant="primary"
          size="sm"
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          onClick={() => navigate('/actions')}
        >
          Evaluate Corrective Actions
        </Button>
      }
    >
      {/* 1. Grid Health Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Critical Issues */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          summary.critical > 0
            ? 'bg-[#181829] border-red-800'
            : 'bg-[#111C35] border-[#1E293B]'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Critical Violations
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {summary.critical}
            </div>
            <div className="text-[11px] text-red-400 mt-0.5">Immediate dispatch required</div>
          </div>
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>

        {/* Warning Issues */}
        <div className="p-4 rounded-xl bg-[#111C35] border border-[#1E293B] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Warnings
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {summary.warning}
            </div>
            <div className="text-[11px] text-amber-400 mt-0.5">High reverse power sensitivity</div>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>

        {/* Resolved Issues */}
        <div className="p-4 rounded-xl bg-[#111C35] border border-[#1E293B] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Resolved / Safe
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {summary.resolved}
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5">Cleared by corrective actions</div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="p-4 rounded-xl bg-[#111C35] border border-[#1E293B] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Severity Filter:</span>
          {(['all', 'critical', 'warning'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded text-xs font-medium uppercase transition-colors border ${
                severityFilter === sev
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-[#0E172C] text-slate-400 border-[#1E293B] hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
          <span>Status:</span>
          {(['all', 'active', 'resolved'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded text-xs font-medium uppercase transition-colors border ${
                statusFilter === st
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-[#0E172C] text-slate-400 border-[#1E293B] hover:text-white'
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
          icon={<Activity className="w-4 h-4 text-blue-400" />}
        />
        <CardContent className="p-0 overflow-x-auto">
          {violations.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <div className="text-sm font-bold text-white">No Violations Found</div>
              <p className="text-xs text-slate-500 mt-1">All distribution assets satisfy statutory operating bounds.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead className="bg-[#0E172C] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
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
              <tbody className="divide-y divide-[#1E293B] text-slate-200">
                {violations.map((violation) => {
                  const isCritical = violation.severity === 'critical'
                  return (
                    <tr
                      key={violation.id}
                      onClick={() => onRowClick(violation)}
                      className="hover:bg-[#16223F] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        {violation.time}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{violation.componentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{violation.componentId}</div>
                      </td>
                      <td className="py-3 px-4 font-medium">{violation.issue}</td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={isCritical ? 'text-red-400' : 'text-amber-400'}>
                          {violation.formattedValue}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
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
                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-white font-medium">
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
    </PageContainer>
  )
}
