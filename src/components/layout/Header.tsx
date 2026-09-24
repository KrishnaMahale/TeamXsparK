import React from 'react'
import {
  Zap,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
} from 'lucide-react'
import { useTimeSimulation } from '../../hooks/useTimeSimulation'
import { useGridStore } from '../../store/gridStore'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'

export const Header: React.FC = () => {
  const {
    currentTime,
    currentHours,
    isPlaying,
    handleSliderChange,
    togglePlay,
    stepForward,
    stepBackward,
  } = useTimeSimulation()
  const { violationSummary } = useGridStore()
  const navigate = useNavigate()

  const hasCritical = violationSummary.critical > 0
  const hasWarning = violationSummary.warning > 0

  return (
    <header className="h-16 px-4 lg:px-6 bg-[#0E172C] border-b border-[#1E293B] flex items-center justify-between gap-4 shrink-0 z-30 select-none">
      {/* Left: Logo & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-white fill-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-wide truncate">
              Renewable Grid Twin
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#16223F] border border-[#273859] text-blue-400 font-mono">
              DIGITAL TWIN
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate hidden sm:block">
            Distribution Grid Simulation & Optimization
          </p>
        </div>
      </div>

      {/* Center: Time Simulation Controls */}
      <div className="flex items-center gap-3">
        {/* Playback step buttons */}
        <div className="flex items-center bg-[#111C35] border border-[#1E293B] rounded-lg p-1">
          <button
            onClick={stepBackward}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#16223F] transition-colors"
            title="Previous Hour"
            aria-label="Previous Hour"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-amber-600 text-white hover:bg-amber-500'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
            title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
            aria-label={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Play</span>
              </>
            )}
          </button>

          <button
            onClick={stepForward}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#16223F] transition-colors"
            title="Next Hour"
            aria-label="Next Hour"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Time slider */}
        <div className="hidden lg:flex items-center gap-2 bg-[#111C35] border border-[#1E293B] px-3 py-1.5 rounded-lg">
          <span className="text-[11px] font-mono text-slate-400">06:00</span>
          <input
            type="range"
            min="6"
            max="24"
            step="0.25"
            value={currentHours}
            onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            className="w-28 xl:w-36 h-1.5 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-blue-600"
            aria-label="Simulation Time Slider"
          />
          <span className="text-[11px] font-mono text-slate-400">24:00</span>
        </div>

        {/* Time badge */}
        <div className="bg-[#111C35] border border-[#1E293B] px-3 py-1.5 rounded-lg text-center">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold leading-none">Time</div>
          <div className="text-xs font-bold text-white font-mono mt-0.5">{currentTime}</div>
        </div>
      </div>

      {/* Right: Simulation Status & Action */}
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 bg-[#111C35] border border-[#1E293B] px-3 py-1.5 rounded-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              hasCritical
                ? 'bg-red-500'
                : hasWarning
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
          />
          <span className="text-xs font-medium text-slate-200">
            {hasCritical
              ? `${violationSummary.critical} Violations`
              : hasWarning
              ? `${violationSummary.warning} Warnings`
              : 'Grid Safe'}
          </span>
        </div>

        {/* New Simulation Button */}
        <Button
          variant="primary"
          size="sm"
          leftIcon={<PlusCircle className="w-4 h-4" />}
          onClick={() => navigate('/simulation')}
          className="whitespace-nowrap"
        >
          New Simulation
        </Button>
      </div>
    </header>
  )
}
