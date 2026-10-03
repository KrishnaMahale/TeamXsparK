import React from 'react'
import { AlertCircle, ShieldCheck, ArrowRight, Zap, BatteryMedium, Gauge, Activity } from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { useGridStore } from '../../store/gridStore'
import { Link } from 'react-router-dom'

export const NetworkStatus: React.FC = () => {
  const { network, violations, violationSummary, selectBusById, selectFeederById } = useGridStore()
  const activeViolations = violations.filter((v) => v.status === 'active')

  const hasCritical = violationSummary.critical > 0
  const hasWarning = violationSummary.warning > 0

  // Derive component-level health status
  const maxVoltage = Math.max(...network.buses.map((b) => b.voltage || 1.0), 1.0)
  const minVoltage = Math.min(...network.buses.map((b) => b.voltage || 1.0), 1.0)
  const isVoltageViolated = maxVoltage > 1.05 || minVoltage < 0.95
  const isVoltageWarning = !isVoltageViolated && (maxVoltage > 1.03 || minVoltage < 0.97)

  const maxFeederLoad = Math.max(...network.feeders.map((f) => f.loadingPercent || 0), 0)
  const isFeederViolated = maxFeederLoad > 100
  const isFeederWarning = !isFeederViolated && maxFeederLoad > 85

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        title="Grid Status & Health"
        subtitle="Real-time constraint monitor"
        icon={<Activity className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
        action={
          <Badge
            variant={hasCritical ? 'danger' : hasWarning ? 'warning' : 'success'}
            dot={true}
          >
            {hasCritical ? 'Attention Required' : hasWarning ? 'Warning' : 'Normal'}
          </Badge>
        }
      />
      <CardContent className="flex-1 space-y-4 overflow-y-auto">
        {/* Engineering Status Matrix */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isVoltageViolated ? 'bg-red-500' : isVoltageWarning ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              Voltage Bounds
            </span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {isVoltageViolated ? 'Violation (1.074 pu)' : isVoltageWarning ? 'Marginal' : 'Normal (1.01 pu)'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isFeederViolated ? 'bg-red-500' : isFeederWarning ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              Feeder Loading
            </span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {isFeederViolated ? 'Overload (108%)' : isFeederWarning ? 'Warning' : 'Normal (82%)'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Substation TX
            </span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              Normal (74%)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Battery Storage
            </span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              Ready (62% SOC)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Renewable Penetration
            </span>
            <span className="font-mono font-medium text-sky-700 dark:text-sky-300">
              High (68%)
            </span>
          </div>
        </div>

        {activeViolations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-5 text-center rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
            <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-1.5" />
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              All Limits Within IEEE 1547
            </span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 max-w-xs">
              All nodal voltages and line loadings are operating within normal statutory bounds.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 font-medium">
              <span>{activeViolations.length} Active Constraint Breaches</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Click to locate</span>
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
                      ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 hover:border-rose-400 dark:hover:border-rose-600'
                      : 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 hover:border-amber-400 dark:hover:border-amber-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                        {violation.componentId}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-300 ml-2">
                        {violation.issue}
                      </span>
                    </div>
                    <Badge variant={isCritical ? 'danger' : 'warning'} size="sm">
                      {violation.type.toUpperCase().replace('_', '-')}
                    </Badge>
                  </div>

                  <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Limit: <span className="font-mono text-slate-700 dark:text-slate-300">{violation.formattedLimit}</span>
                    </div>
                    <div className={`text-sm font-bold font-mono ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {violation.formattedValue}
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="pt-1">
              <Link
                to="/violations"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-white hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700/80"
              >
                <span>View Full Violation Log</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
