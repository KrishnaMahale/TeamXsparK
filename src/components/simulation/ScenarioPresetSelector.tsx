import React from 'react'
import { Badge } from '../ui/Badge'
import { Sparkles } from 'lucide-react'
import { useScenarios } from '../../hooks/useScenarios'

interface ScenarioPresetSelectorProps {
  activePresetKey: string
  onSelectPreset: (presetKey: string) => void
}

export const ScenarioPresetSelector: React.FC<ScenarioPresetSelectorProps> = ({
  activePresetKey,
  onSelectPreset,
}) => {
  const { scenarios } = useScenarios()

  const getVariant = (status: string) => {
    switch (status) {
      case 'optimal':
        return 'success' as const
      case 'warning':
        return 'warning' as const
      default:
        return 'danger' as const
    }
  }

  const getBadgeLabel = (s: any) => {
    if (s.id === 'HIGH_SOLAR_LOW_LOAD') return 'Critical Overvoltage'
    if (s.id === 'HIGH_SOLAR') return 'Reverse Flow'
    if (s.id === 'EVENING_PEAK') return 'High Demand'
    if (s.id === 'NORMAL_DAY') return 'Optimal'
    if (s.id === 'EXTREME_INFEASIBLE') return 'Action Infeasible'
    return s.status ? s.status.toUpperCase() : 'Benchmark'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Load Benchmark Preset (Auto-Populates Form)
        </span>
        <span className="text-[11px] text-slate-500">Presets loaded from database • can be modified</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {scenarios.map((p) => {
          const isSelected = activePresetKey === p.id

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPreset(p.id)}
              className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#16223F] border-blue-600 text-white'
                  : 'bg-[#111C35] border-[#1E293B] hover:border-slate-600 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-bold text-white leading-tight">{p.name}</span>
                  <Badge variant={getVariant(p.status)} size="sm">
                    {getBadgeLabel(p)}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.description}</p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-[#1E293B] flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span>PV: {p.solarKw} kW</span>
                <span>Load: {p.loadKw} kW</span>
                <span>SOC: {p.batterySocPercent}%</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

