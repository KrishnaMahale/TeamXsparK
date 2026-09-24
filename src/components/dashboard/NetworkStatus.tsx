import React from 'react'
import { AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { useGridStore } from '../../store/gridStore'
import { Link } from 'react-router-dom'

export const NetworkStatus: React.FC = () => {
  const { violations, violationSummary, selectBusById, selectFeederById } = useGridStore()
  const activeViolations = violations.filter((v) => v.status === 'active')

  const hasCritical = violationSummary.critical > 0
  const hasWarning = violationSummary.warning > 0

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        title="Grid Status"
        subtitle="Active power-flow threshold monitor"
        icon={<AlertCircle className="w-4 h-4 text-blue-400" />}
        action={
          <Badge
            variant={hasCritical ? 'danger' : hasWarning ? 'warning' : 'success'}
            dot={true}
          >
            {hasCritical ? 'Attention Required' : hasWarning ? 'Warning' : 'Normal'}
          </Badge>
        }
      />
      <CardContent className="flex-1 space-y-3 overflow-y-auto">
        {activeViolations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl bg-[#0E172C] border border-[#1E293B]">
            <ShieldCheck className="w-9 h-9 text-emerald-500 mb-2" />
            <span className="text-sm font-semibold text-emerald-400">
              ✓ All Limits Normal
            </span>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              All nodal voltages and branch ampacities are operating within statutory bounds.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-medium">
              <span>{activeViolations.length} Active Issues</span>
              <span className="text-[11px] text-slate-500">Click issue to inspect</span>
            </div>

            {activeViolations.slice(0, 3).map((violation) => {
              const isCritical = violation.severity === 'critical'

              return (
                <div
                  key={violation.id}
                  onClick={() => {
                    if (violation.componentType === 'bus') selectBusById(violation.componentId)
                    else if (violation.componentType === 'feeder') selectFeederById(violation.componentId)
                  }}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    isCritical
                      ? 'bg-[#181829] border-red-800/80 hover:border-red-600'
                      : 'bg-[#1A1E2E] border-amber-800/80 hover:border-amber-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-white font-mono">
                        {violation.componentId}
                      </span>
                      <span className="text-xs text-slate-400 ml-2">
                        {violation.issue}
                      </span>
                    </div>
                    <Badge variant={isCritical ? 'danger' : 'warning'} size="sm">
                      {violation.type.toUpperCase().replace('_', '-')}
                    </Badge>
                  </div>

                  <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-[#1E293B]">
                    <div className="text-xs text-slate-400">
                      Limit: <span className="text-slate-300 font-mono">{violation.formattedLimit}</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-white">
                      {violation.formattedValue}
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="pt-2">
              <Link
                to="/violations"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-blue-400 hover:text-white hover:bg-[#16223F] rounded-lg transition-colors border border-[#1E293B]"
              >
                <span>View All Violations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
