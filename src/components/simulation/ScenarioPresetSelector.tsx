import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Layers, Sparkles } from 'lucide-react'

interface ScenarioPresetSelectorProps {
  activePresetKey: string
  onSelectPreset: (presetKey: string) => void
}

export const ScenarioPresetSelector: React.FC<ScenarioPresetSelectorProps> = ({
  activePresetKey,
  onSelectPreset,
}) => {
  const presets = [
    {
      key: 'HIGH_SOLAR_LOW_LOAD',
      name: 'High Solar + Low Load',
      solar: '250 kW',
      load: '120 kW',
      soc: '62%',
      badge: 'Critical Overvoltage',
      variant: 'danger' as const,
      desc: 'Noon generation peak with low commercial demand.',
    },
    {
      key: 'HIGH_SOLAR',
      name: 'High Solar',
      solar: '240 kW',
      load: '120 kW',
      soc: '62%',
      badge: 'Reverse Flow',
      variant: 'danger' as const,
      desc: 'High midday irradiance causing feeder overload.',
    },
    {
      key: 'EVENING_PEAK',
      name: 'Evening Peak',
      solar: '15 kW',
      load: '175 kW',
      soc: '30%',
      badge: 'High Demand',
      variant: 'warning' as const,
      desc: 'Post-sunset demand surge with zero solar.',
    },
    {
      key: 'NORMAL_DAY',
      name: 'Normal Day',
      solar: '95 kW',
      load: '110 kW',
      soc: '70%',
      badge: 'Optimal',
      variant: 'success' as const,
      desc: 'Balanced distributed generation within safe limits.',
    },
    {
      key: 'EXTREME_INFEASIBLE',
      name: 'Extreme / Infeasible',
      solar: '250 kW',
      load: '80 kW',
      soc: '15%',
      badge: 'Action Infeasible',
      variant: 'danger' as const,
      desc: 'Critical over-voltage with depleted battery (15% SOC).',
    },
  ]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Load Benchmark Preset (Auto-Populates Form)
        </span>
        <span className="text-[11px] text-slate-500">Presets can be modified before running</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {presets.map((p) => {
          const isSelected = activePresetKey === p.key

          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onSelectPreset(p.key)}
              className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#16223F] border-blue-600 text-white'
                  : 'bg-[#111C35] border-[#1E293B] hover:border-slate-600 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-bold text-white leading-tight">{p.name}</span>
                  <Badge variant={p.variant} size="sm">
                    {p.badge}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.desc}</p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-[#1E293B] flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span>PV: {p.solar}</span>
                <span>Load: {p.load}</span>
                <span>SOC: {p.soc}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
