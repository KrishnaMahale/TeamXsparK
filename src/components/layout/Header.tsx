import React from 'react'
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  LayoutDashboard,
} from 'lucide-react'
import { useTimeSimulation } from '../../hooks/useTimeSimulation'
import { useGridStore } from '../../store/gridStore'
import { ThemeToggle } from '../ui/ThemeToggle'

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

  const hasCritical = violationSummary.critical > 0
  const hasWarning = violationSummary.warning > 0

  return (
    <header className="h-16 px-6 bg-[#FFFDF6] dark:bg-[#151F17] border-b border-[#DDD9C9] dark:border-[#2C3C2E] flex items-center justify-between gap-4 shrink-0 z-30 select-none transition-colors duration-200">
      {/* Left: Page Title */}
      <div className="flex items-center gap-2.5">
        <LayoutDashboard className="w-4.5 h-4.5 text-[#506052] dark:text-[#A0C878]" />
        <span className="text-sm font-bold text-[#26352A] dark:text-[#F2F5ED] tracking-wide">
          Dashboard
        </span>
      </div>

      {/* Center: Time Simulation Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Playback step buttons */}
        <div className="flex items-center bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-lg p-0.5 shadow-xs">
          <button
            onClick={stepBackward}
            className="p-1.5 rounded-md text-[#506052] dark:text-[#C2CCC0] hover:text-[#26352A] dark:hover:text-[#FFFDF6] hover:bg-[#DDEB9D] dark:hover:bg-[#2D3E2F] transition-colors"
            title="Previous Hour"
            aria-label="Previous Hour"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-[#A0C878] text-[#26352A] hover:bg-[#8EB864]'
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
            className="p-1.5 rounded-md text-[#506052] dark:text-[#C2CCC0] hover:text-[#26352A] dark:hover:text-[#FFFDF6] hover:bg-[#DDEB9D] dark:hover:bg-[#2D3E2F] transition-colors"
            title="Next Hour"
            aria-label="Next Hour"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Time slider */}
        <div className="hidden lg:flex items-center gap-2 bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] px-3 py-1.5 rounded-lg shadow-xs">
          <span className="text-[11px] font-mono text-[#788477] dark:text-[#859483]">06:00</span>
          <input
            type="range"
            min="6"
            max="24"
            step="0.25"
            value={currentHours}
            onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            className="w-24 xl:w-36 h-1.5 rounded-lg appearance-none cursor-pointer accent-[#A0C878] bg-[#DDD9C9] dark:bg-[#2C3C2E]"
            aria-label="Simulation Time Slider"
          />
          <span className="text-[11px] font-mono text-[#788477] dark:text-[#859483]">24:00</span>
        </div>

        {/* Time badge */}
        <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] px-2.5 py-1 sm:px-3 sm:py-1 rounded-lg text-center shadow-xs">
          <div className="text-[10px] uppercase tracking-wider text-[#788477] dark:text-[#859483] font-semibold leading-none">Time</div>
          <div className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] font-mono mt-0.5">{currentTime}</div>
        </div>
      </div>

      {/* Right: Search, Notifications, Profile */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#788477] dark:text-[#859483] absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search"
            className="pl-9 pr-4 py-1.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] text-sm text-[#26352A] dark:text-[#F2F5ED] placeholder:text-[#788477] focus:outline-none focus:ring-2 focus:ring-[#A0C878] w-48 lg:w-60 border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs"
          />
        </div>
        <ThemeToggle />
        <button className="w-8.5 h-8.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] flex items-center justify-center border border-[#DDD9C9] dark:border-[#2C3C2E] hover:bg-[#DDEB9D] dark:hover:bg-[#2D3E2F] relative transition-colors shadow-xs">
          <Bell className="w-4 h-4 text-[#506052] dark:text-[#C2CCC0]" />
          {(hasCritical || hasWarning) && (
            <span className="w-2 h-2 rounded-full bg-red-600 absolute top-1.5 right-1.5 ring-1 ring-[#FFFDF6] dark:ring-[#151F17]" />
          )}
        </button>
        <button className="w-8.5 h-8.5 rounded-lg overflow-hidden border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs shrink-0">
          <img src="https://i.pravatar.cc/100?img=1" alt="User Profile" className="w-full h-full object-cover" />
        </button>
      </div>
    </header>
  )
}

export default Header
