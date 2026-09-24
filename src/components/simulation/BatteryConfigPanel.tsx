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
        icon={<BatteryMedium className="w-4 h-4 text-cyan-400" />}
      />
      <CardContent className="space-y-4">
        {/* Visual SOC Bar Gauge */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Initial State of Charge (SOC)</span>
            <span
              className={`font-mono font-bold text-sm ${
                isDepleted ? 'text-rose-400' : 'text-cyan-300'
              }`}
            >
              {config.initialSocPercent}%
            </span>
          </div>

          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isDepleted
                  ? 'bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                  : config.initialSocPercent < 40
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, config.initialSocPercent))}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0% Empty</span>
            <span className="text-rose-400">20% Safe Reserve Floor</span>
            <span>100% Full</span>
          </div>

          {isDepleted && (
            <div className="mt-2 p-2 rounded bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                Battery reserve is below technical minimum (20%). High-rate discharge actions will be <strong>Infeasible</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Technical Param Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block">Capacity (kWh)</span>
            <input
              type="number"
              min="10"
              max="1000"
              value={config.capacityKwh}
              onChange={(e) => onChange({ capacityKwh: parseFloat(e.target.value) || 100 })}
              className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block">Initial SOC (%)</span>
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
              className={`w-full px-2.5 py-1 rounded bg-slate-900 border font-mono text-xs focus:outline-none ${
                isDepleted ? 'border-rose-500 text-rose-300' : 'border-slate-700 text-slate-100 focus:border-cyan-400'
              }`}
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block">Max Charge (kW)</span>
            <input
              type="number"
              min="0"
              max="200"
              value={config.maxChargeKw}
              onChange={(e) => onChange({ maxChargeKw: parseFloat(e.target.value) || 40 })}
              className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block">Max Discharge (kW)</span>
            <input
              type="number"
              min="0"
              max="200"
              value={config.maxDischargeKw}
              onChange={(e) => onChange({ maxDischargeKw: parseFloat(e.target.value) || 40 })}
              className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
