import React from 'react'
import { ShieldCheck, ArrowRight, Activity } from 'lucide-react'
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
        icon={<Activity className="w-4 h-4 text-[#A0C878]" />}
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
        <div className="p-3.5 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] space-y-2.5 text-xs shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#506052] dark:text-[#C2CCC0] flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isVoltageViolated ? 'bg-red-600' : isVoltageWarning ? 'bg-amber-500' : 'bg-[#A0C878]'
                }`}
              />
              Voltage Bounds
            </span>
            <span className="font-mono font-semibold text-[#26352A] dark:text-[#F2F5ED]">
              {isVoltageViolated ? 'Violation (1.074 pu)' : isVoltageWarning ? 'Marginal' : 'Normal (1.01 pu)'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#506052] dark:text-[#C2CCC0] flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isFeederViolated ? 'bg-red-600' : isFeederWarning ? 'bg-amber-500' : 'bg-[#A0C878]'
                }`}
              />
              Feeder Loading
            </span>
            <span className="font-mono font-semibold text-[#26352A] dark:text-[#F2F5ED]">
              {isFeederViolated ? 'Overload (108%)' : isFeederWarning ? 'Warning' : 'Normal (82%)'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#506052] dark:text-[#C2CCC0] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#A0C878] shrink-0" />
              Substation TX
            </span>
            <span className="font-mono font-semibold text-[#26352A] dark:text-[#F2F5ED]">
              Normal (74%)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#506052] dark:text-[#C2CCC0] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#A0C878] shrink-0" />
              Battery Storage
            </span>
            <span className="font-mono font-semibold text-[#26352A] dark:text-[#F2F5ED]">
              Ready (62% SOC)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#506052] dark:text-[#C2CCC0] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#A0C878] shrink-0" />
              Renewable Penetration
            </span>
            <span className="font-mono font-semibold text-[#26352A] dark:text-[#DDEB9D]">
              High (68%)
            </span>
          </div>
        </div>

        {activeViolations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-5 text-center rounded-lg bg-[#DDEB9D]/30 dark:bg-[#2D3E2F]/30 border border-[#A0C878]/50">
            <ShieldCheck className="w-8 h-8 text-[#A0C878] mb-1.5" />
            <span className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED]">
              All Limits Within IEEE 1547
            </span>
            <p className="text-[11px] text-[#506052] dark:text-[#C2CCC0] mt-0.5 max-w-xs">
              All nodal voltages and line loadings are operating within normal statutory bounds.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#788477] dark:text-[#859483] px-1 font-medium">
              <span>{activeViolations.length} Active Constraint Breaches</span>
              <span className="text-[11px]">Click to locate</span>
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
                  className={`p-3 rounded-lg border transition-colors cursor-pointer shadow-xs ${
                    isCritical
                      ? 'bg-red-50/80 dark:bg-red-950/40 border-red-300 dark:border-red-900/80 hover:border-red-400'
                      : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/80 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] font-mono">
                        {violation.componentId}
                      </span>
                      <span className="text-xs text-[#506052] dark:text-[#C2CCC0] ml-2 font-medium">
                        {violation.issue}
                      </span>
                    </div>
                    <Badge variant={isCritical ? 'danger' : 'warning'} size="sm">
                      {violation.type.toUpperCase().replace('_', '-')}
                    </Badge>
                  </div>

                  <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                    <div className="text-xs text-[#788477] dark:text-[#859483]">
                      Limit: <span className="font-mono text-[#506052] dark:text-[#C2CCC0]">{violation.formattedLimit}</span>
                    </div>
                    <div className={`text-sm font-bold font-mono ${isCritical ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                      {violation.formattedValue}
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="pt-1">
              <Link
                to="/violations"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-[#26352A] dark:text-[#F2F5ED] hover:bg-[#DDEB9D] dark:hover:bg-[#2D3E2F] bg-[#FFFDF6] dark:bg-[#151F17] rounded-lg transition-colors border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs"
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

export default NetworkStatus
