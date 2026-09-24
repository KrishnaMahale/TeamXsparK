import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Clock, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'

export const ViolationTimeline: React.FC = () => {
  const { violations, selectBusById, selectFeederById } = useGridStore()

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        title="Violation Timeline"
        subtitle="Chronological sequence of grid events"
        icon={<Clock className="w-4 h-4 text-cyan-400" />}
      />
      <CardContent className="flex-1 overflow-y-auto space-y-3 pr-1">
        {violations.slice(0, 4).map((vio) => {
          const isCritical = vio.severity === 'critical'
          const isResolved = vio.status === 'resolved'

          return (
            <div
              key={vio.id}
              onClick={() => {
                if (vio.componentType === 'bus') selectBusById(vio.componentId)
                if (vio.componentType === 'feeder') selectFeederById(vio.componentId)
              }}
              className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors"
            >
              <div className="shrink-0 mt-0.5">
                {isResolved ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : isCritical ? (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 truncate">
                    {vio.componentName} • {vio.issue}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold">{vio.time}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Observed: <span className={isCritical ? 'text-rose-400' : 'text-slate-300'}>{vio.formattedValue}</span> (Threshold: {vio.formattedLimit})
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
