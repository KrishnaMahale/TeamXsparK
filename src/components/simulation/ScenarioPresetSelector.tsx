import React, { useState, useRef, useEffect } from 'react'
import { Badge } from '../ui/Badge'
import { Sparkles, ChevronDown, Check, Zap, Battery, Sun, Activity, HelpCircle } from 'lucide-react'
import { useScenarios } from '../../hooks/useScenarios'

interface ScenarioPresetSelectorProps {
  activePresetKey: string
  onSelectPreset: (presetKey: string) => void
  className?: string
}

export const ScenarioPresetSelector: React.FC<ScenarioPresetSelectorProps> = ({
  activePresetKey,
  onSelectPreset,
  className = '',
}) => {
  const { scenarios } = useScenarios()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

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

  const selectedScenario = scenarios.find((s) => s.id === activePresetKey) || scenarios[0]

  const filteredScenarios = scenarios.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      getBadgeLabel(s).toLowerCase().includes(q)
    )
  })

  return (
    <div className={`space-y-2.5 ${className}`} ref={dropdownRef}>
      <div className="flex items-center justify-between text-xs">
        <label className="font-bold text-[#26352A] dark:text-[#F2F5ED] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-[#2E7D32] dark:text-[#A0C878]" />
          Simulation Scenario Preset
        </label>
        <span className="text-[10px] text-[#788477] dark:text-[#859483]">
          Predefined operating conditions
        </span>
      </div>

      {/* Dropdown Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 bg-[#FFFDF6] dark:bg-[#151F17] cursor-pointer shadow-xs ${
            isOpen
              ? 'border-[#A0C878] ring-2 ring-[#A0C878]/30 dark:ring-[#A0C878]/20'
              : 'border-[#DDD9C9] dark:border-[#2C3C2E] hover:border-[#A0C878]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] flex items-center justify-center text-[#26352A] dark:text-[#A0C878] shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] truncate">
                  {selectedScenario?.name || 'Select Preset...'}
                </span>
                {selectedScenario && (
                  <Badge variant={getVariant(selectedScenario.status)} size="sm">
                    {getBadgeLabel(selectedScenario)}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-[#788477] dark:text-[#859483] truncate mt-0.5">
                {selectedScenario?.description || 'Choose a pre-configured grid operational scenario'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedScenario && (
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] text-[#506052] dark:text-[#C2CCC0]">
                <span>PV: {selectedScenario.solarKw}kW</span>
                <span className="text-[#DDD9C9] dark:text-[#2C3C2E]">|</span>
                <span>Load: {selectedScenario.loadKw}kW</span>
                <span className="text-[#DDD9C9] dark:text-[#2C3C2E]">|</span>
                <span>SOC: {selectedScenario.batterySocPercent}%</span>
              </div>
            )}
            <ChevronDown
              className={`w-4 h-4 text-[#788477] transition-transform duration-200 ${
                isOpen ? 'transform rotate-180 text-[#26352A] dark:text-[#F2F5ED]' : ''
              }`}
            />
          </div>
        </button>

        {/* Dropdown Menu Overlay */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-2 bg-[#FFFDF6] dark:bg-[#19241B] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Search filter if more than 4 items */}
            {scenarios.length > 4 && (
              <div className="p-2 border-b border-[#DDD9C9] dark:border-[#2C3C2E] bg-[#FAF6E9]/60 dark:bg-[#151F17]/60">
                <input
                  type="text"
                  placeholder="Filter simulation scenarios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#FFFDF6] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] text-xs text-[#26352A] dark:text-[#F2F5ED] placeholder:text-[#788477] focus:outline-none focus:ring-1 focus:ring-[#A0C878]"
                  autoFocus
                />
              </div>
            )}

            <div className="max-h-72 overflow-y-auto divide-y divide-[#DDD9C9]/50 dark:divide-[#2C3C2E]/50">
              {filteredScenarios.length > 0 ? (
                filteredScenarios.map((s) => {
                  const isSelected = s.id === activePresetKey

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSelectPreset(s.id)
                        setIsOpen(false)
                        setSearchQuery('')
                      }}
                      className={`w-full p-3 text-left transition-colors flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-[#DDEB9D]/35 dark:bg-[#A0C878]/15'
                          : 'hover:bg-[#FAF6E9] dark:hover:bg-[#1E2B20]'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-[#2E7D32] bg-[#2E7D32] dark:border-[#A0C878] dark:bg-[#A0C878] text-white dark:text-[#151F17]'
                              : 'border-[#DDD9C9] dark:border-[#2C3C2E]'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold truncate ${
                              isSelected
                                ? 'text-[#26352A] dark:text-[#F2F5ED]'
                                : 'text-[#26352A] dark:text-[#E8F0E6]'
                            }`}
                          >
                            {s.name}
                          </span>
                          <Badge variant={getVariant(s.status)} size="sm">
                            {getBadgeLabel(s)}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[#788477] dark:text-[#859483] mt-0.5 leading-relaxed line-clamp-1">
                          {s.description}
                        </p>

                        <div className="mt-1.5 flex items-center gap-3 text-[10px] font-mono text-[#506052] dark:text-[#A0B0A2]">
                          <span className="flex items-center gap-1">
                            <Sun className="w-3 h-3 text-amber-600" />
                            PV: {s.solarKw} kW
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-sky-600" />
                            Load: {s.loadKw} kW
                          </span>
                          <span className="flex items-center gap-1">
                            <Battery className="w-3 h-3 text-emerald-600" />
                            SOC: {s.batterySocPercent}%
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="p-4 text-center text-xs text-[#788477]">
                  No matching scenario presets found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Scenario Preview Summary Card */}
      {selectedScenario && (
        <div className="p-3 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[#26352A] dark:text-[#F2F5ED] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A0C878]" />
              Preset Parameters Applied
            </span>
            <span className="text-[10px] font-mono text-[#788477] dark:text-[#859483]">
              Target Time: {selectedScenario.simulatedTime || '12:00'}
            </span>
          </div>

          <p className="text-[11px] text-[#506052] dark:text-[#C2CCC0] leading-relaxed">
            {selectedScenario.description}
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/70 dark:border-[#2C3C2E] text-center">
              <div className="text-[10px] text-[#788477] uppercase font-bold tracking-wider">PV Capacity</div>
              <div className="text-xs font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-0.5">
                {selectedScenario.solarKw} kW
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/70 dark:border-[#2C3C2E] text-center">
              <div className="text-[10px] text-[#788477] uppercase font-bold tracking-wider">Peak Demand</div>
              <div className="text-xs font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-0.5">
                {selectedScenario.loadKw} kW
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9]/70 dark:border-[#2C3C2E] text-center">
              <div className="text-[10px] text-[#788477] uppercase font-bold tracking-wider">Battery SOC</div>
              <div className="text-xs font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-0.5">
                {selectedScenario.batterySocPercent}%
              </div>
            </div>
          </div>

          {selectedScenario.recommendedActionHint && (
            <div className="text-[10px] text-[#788477] dark:text-[#859483] pt-1 flex items-center gap-1.5 border-t border-[#DDD9C9]/50 dark:border-[#2C3C2E]/50">
              <HelpCircle className="w-3 h-3 text-[#A0C878] shrink-0" />
              <span className="truncate">Focus: {selectedScenario.recommendedActionHint}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ScenarioPresetSelector
