import React from 'react'
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Clock,
} from 'lucide-react'
import { useTimeSimulation } from '../../hooks/useTimeSimulation'

export const SimulationController: React.FC = () => {
  const {
    currentTime,
    currentHours,
    isPlaying,
    speed,
    toggleSpeed,
    handleSliderChange,
    togglePlay,
    stepForward,
    stepBackward,
  } = useTimeSimulation()

  return (
    <div className="w-full flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-4 px-3 sm:px-4 py-2 rounded-xl bg-white/95 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 shadow-xs backdrop-blur-md transition-colors select-none">
      {/* Left: Playback Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={stepBackward}
          className="p-1.5 rounded-lg text-[#425B4C] dark:text-[#A7F3D0] hover:text-[#064E3B] hover:bg-[#BBF7D0]/40 dark:hover:bg-[#064E3B]/60 transition-colors cursor-pointer"
          title="Previous Step (-1 Hour)"
          aria-label="Previous Step"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={togglePlay}
          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            isPlaying
              ? 'bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-400/30'
              : 'bg-[#047857] text-white hover:bg-[#065F46] ring-2 ring-[#047857]/20'
          }`}
          title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          aria-label={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={stepForward}
          className="p-1.5 rounded-lg text-[#425B4C] dark:text-[#A7F3D0] hover:text-[#064E3B] hover:bg-[#BBF7D0]/40 dark:hover:bg-[#064E3B]/60 transition-colors cursor-pointer"
          title="Next Step (+1 Hour)"
          aria-label="Next Step"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Speed Toggle Button (1x / 2x / 4x) */}
        <button
          type="button"
          onClick={toggleSpeed}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer bg-[#F0FDF4] dark:bg-[#064E3B]/50 text-[#047857] dark:text-[#86EFAC] border-[#BBF7D0]/70 dark:border-[#86EFAC]/30 hover:border-[#047857] hover:bg-[#ECFDF3] shadow-2xs"
          title={`Simulation Speed: ${speed}x (Click to cycle 1x → 2x → 4x)`}
          aria-label="Simulation Speed"
        >
          <Gauge className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC]" />
          <span className="font-mono">{speed}x</span>
        </button>
      </div>

      {/* Middle: Horizontal Time Slider Spanning Width */}
      <div className="flex-1 min-w-[140px] flex items-center gap-2 px-1">
        <span className="text-[11px] font-mono font-bold text-[#6B8274] dark:text-[#86EFAC] shrink-0">
          06:00
        </span>
        <input
          type="range"
          min="6"
          max="24"
          step="0.25"
          value={currentHours}
          onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#047857] bg-[#BBF7D0]/70 dark:bg-[#1B3E2D] hover:bg-[#BBF7D0] transition-colors"
          aria-label="Simulation Time Slider"
        />
        <span className="text-[11px] font-mono font-bold text-[#6B8274] dark:text-[#86EFAC] shrink-0">
          24:00
        </span>
      </div>

      {/* Right: Current Time Display Badge */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F0FDF4] dark:bg-[#064E3B]/40 border border-[#BBF7D0]/80 dark:border-[#86EFAC]/30 shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC]" />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[8px] uppercase tracking-wider text-[#6B8274] dark:text-[#A7F3D0] font-black">
              TIME
            </span>
            <span className="text-xs font-black text-[#047857] dark:text-[#86EFAC] font-mono">
              {currentTime}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimulationController
