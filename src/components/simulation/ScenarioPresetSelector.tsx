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
    if (s.id === 'STORM_CLOUD_RAMP') return 'Solar Ramp Drop'
    if (s.id === 'EV_CHARGING_SURGE') return 'EV Fleet Surge'
    if (s.id === 'PHASE_UNBALANCE_PEAK') return 'Phase Unbalance'
    if (s.id === 'NIGHT_QUIET') return 'Nocturnal Baseload'
    return s.status ? s.status.toUpperCase() : 'Benchmark'
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
        <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Load Benchmark Preset (Auto-Populates Form)
        </span>
        <span className="text-[11px] text-gray-500">Presets loaded from database • can be modified</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3">
        {scenarios.map((p) => {
          const isSelected = activePresetKey === p.id

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPreset(p.id)}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between shadow-sm cursor-pointer ${isSelected
                ? 'bg-[#DDEB9D]/30 dark:bg-[#A0C878]/15 border-[#A0C878] dark:border-[#A0C878] ring-1 ring-[#A0C878] text-[#26352A] dark:text-[#E8F0E6]'
                : 'bg-[#FAF6E9] dark:bg-[#1E2B20] border-[#DDD9C9] dark:border-[#2A3A2C] hover:border-[#A0C878] text-[#506052] dark:text-[#A0B0A2]'
                }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-bold text-[#26352A] dark:text-[#E8F0E6] leading-tight">{p.name}</span>
                  <Badge variant={getVariant(p.status)} size="sm">
                    {getBadgeLabel(p)}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#788477] mt-1 line-clamp-2 leading-relaxed">{p.description}</p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-[#DDD9C9]/60 dark:border-[#2A3A2C] flex items-center justify-between text-[10px] font-mono text-[#506052] dark:text-[#A0B0A2]">
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
