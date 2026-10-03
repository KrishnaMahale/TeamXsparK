import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { BatteryStorageConfig } from '../../types/simulation'
import { BatteryMedium, AlertTriangle } from 'lucide-react'

interface BatteryConfigPanelProps {
  config: BatteryStorageConfig
  onChange: (updates: Partial<BatteryStorageConfig>) => void
}

export const BatteryConfigPanel: React.FC<BatteryConfigPanelProps> = ({ config, onChange }) => {
  const isDepleted = config.initialSocPercent <= 20

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Battery Energy Storage System (BESS)"
        subtitle="Configure electrochemical storage capacity, state-of-charge, and power constraints"
        icon={<BatteryMedium className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
      />
      <CardContent className="space-y-4">
        {/* Visual SOC Bar Gauge */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Initial State of Charge (SOC)</span>
            <span
              className={`font-mono font-bold text-sm ${
                isDepleted ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {config.initialSocPercent}%
            </span>
          </div>

          <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-600">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isDepleted
                  ? 'bg-red-500 dark:bg-red-500'
                  : config.initialSocPercent < 40
                  ? 'bg-amber-500 dark:bg-amber-400'
                  : 'bg-emerald-500 dark:bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, config.initialSocPercent))}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <span>0% Empty</span>
            <span className="text-red-600 dark:text-red-400">20% Safe Reserve Floor</span>
            <span>100% Full</span>
          </div>

          {isDepleted && (
            <div className="mt-2 p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>
                Battery reserve is below technical minimum (20%). High-rate discharge actions will be <strong>Infeasible</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Technical Param Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Capacity (kWh)</span>
            <input
              type="number"
              min="10"
              max="1000"
              value={config.capacityKwh}
              onChange={(e) => onChange({ capacityKwh: parseFloat(e.target.value) || 100 })}
              className="w-full px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Initial SOC (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={config.initialSocPercent}
              onChange={(e) =>
                onChange({
                  initialSocPercent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                })
              }
              className={`w-full px-2.5 py-1 rounded bg-white dark:bg-slate-900 border font-mono text-xs focus:outline-none focus:ring-1 ${
                isDepleted ? 'border-red-400 dark:border-red-500 text-red-600 dark:text-red-400' : 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500'
              }`}
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Max Charge (kW)</span>
            <input
              type="number"
              min="0"
              max="200"
              value={config.maxChargeKw}
              onChange={(e) => onChange({ maxChargeKw: parseFloat(e.target.value) || 40 })}
              className="w-full px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Max Discharge (kW)</span>
            <input
              type="number"
              min="0"
              max="200"
              value={config.maxDischargeKw}
              onChange={(e) => onChange({ maxDischargeKw: parseFloat(e.target.value) || 40 })}
              className="w-full px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
