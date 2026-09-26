import React, { useEffect } from 'react'
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Clock,
} from 'lucide-react'
import { useDomesticStore } from '../../store/domesticStore'

export const DomesticTimeSlider: React.FC = () => {
  const {
    currentTime,
    isPlaying,
    togglePlay,
    stepForward,
    stepBackward,
    setTime,
  } = useDomesticStore()

  const [hoursStr, minsStr] = currentTime.split(':')
  const currentHours = (parseInt(hoursStr, 10) || 12) + (parseInt(minsStr, 10) || 0) / 60

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      stepForward()
    }, 1200)
    return () => clearInterval(interval)
  }, [isPlaying, stepForward])

  const handleSliderChange = (val: number) => {
    const h = Math.floor(val)
    const m = Math.round((val - h) * 60)
    const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    setTime(formatted)
  }

  const getTimePhase = (h: number) => {
    if (h >= 6 && h < 9) return { label: 'Morning Sun', icon: Sun, color: 'text-amber-400' }
    if (h >= 9 && h < 14) return { label: 'Peak Solar Noon', icon: Sun, color: 'text-amber-300' }
    if (h >= 14 && h < 18) return { label: 'Afternoon Generation', icon: Sun, color: 'text-amber-400' }
    if (h >= 18 && h < 22) return { label: 'Evening Peak Demand', icon: Moon, color: 'text-blue-400' }
    return { label: 'Night Baseline', icon: Moon, color: 'text-slate-400' }
  }

  const phase = getTimePhase(currentHours)
  const PhaseIcon = phase.icon

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0E172C] border border-[#1E293B]">
      {/* Playback step buttons */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#111C35] border border-[#1E293B] rounded-lg p-1">
          <button
            onClick={stepBackward}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#16223F] transition-colors"
            title="Previous Hour (-1h)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-amber-600 text-white hover:bg-amber-500'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
            title={isPlaying ? 'Pause Simulation' : 'Play 24h Playback'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Play 24h</span>
              </>
            )}
          </button>

          <button
            onClick={stepForward}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#16223F] transition-colors"
            title="Next Hour (+1h)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Phase badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111C35] border border-[#1E293B]">
          <PhaseIcon className={`w-3.5 h-3.5 ${phase.color}`} />
          <span className="text-[11px] font-medium text-slate-200">{phase.label}</span>
        </div>
      </div>

      {/* Slider */}
      <div className="flex-1 max-w-xl mx-2 flex items-center gap-3">
        <span className="text-[11px] font-mono text-slate-400">06:00</span>
        <input
          type="range"
          min="6"
          max="24"
          step="0.5"
          value={currentHours}
          onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-blue-600"
          aria-label="Domestic Simulation Time Slider"
        />
        <span className="text-[11px] font-mono text-slate-400">24:00</span>
      </div>

      {/* Clock Badge */}
      <div className="flex items-center gap-2 bg-[#111C35] border border-[#1E293B] px-3 py-1.5 rounded-lg shrink-0">
        <Clock className="w-4 h-4 text-blue-400" />
        <span className="text-xs text-slate-400 font-medium">Time:</span>
        <span className="text-sm font-bold font-mono text-white">{currentTime}</span>
      </div>
    </div>
  )
}
