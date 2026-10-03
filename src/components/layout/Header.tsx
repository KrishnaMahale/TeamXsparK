import React from 'react'
import {
  Zap,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Factory,
  Home,
  CheckCircle,
  AlertTriangle,
  Search,
  Bell,
  User,
  LayoutDashboard,
} from 'lucide-react'
import { useTimeSimulation } from '../../hooks/useTimeSimulation'
import { useGridStore } from '../../store/gridStore'
import { useDomesticStore } from '../../store/domesticStore'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
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
  const { gridType, setGridType } = useDomesticStore()
  const navigate = useNavigate()

  const hasCritical = violationSummary.critical > 0
  const hasWarning = violationSummary.warning > 0
  return (
    <header className="h-20 px-6 bg-transparent flex items-center justify-between gap-4 shrink-0 z-30 select-none transition-colors duration-200">
      {/* Left: Page Title */}
      <div className="flex items-center gap-2">
        <LayoutDashboard className="w-5 h-5 text-gray-400" />
        <span className="text-sm font-semibold text-gray-500">
          Dashboard
        </span>
      </div>



      {/* Center: Time Simulation Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Playback step buttons */}
        <div className="flex items-center bg-[#ECFDF5] dark:bg-[#0A2018] border border-[#D1E7DD] dark:border-[#23483F] rounded-lg p-0.5">
          <button
            onClick={stepBackward}
            className="p-1.5 rounded text-[#365A4D] dark:text-[#A7C4B8] hover:text-[#14532D] dark:hover:text-emerald-100 hover:bg-[#D1FAE5] dark:hover:bg-[#183D36] transition-colors"
            title="Previous Hour"
            aria-label="Previous Hour"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
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
            className="p-1.5 rounded text-[#365A4D] dark:text-[#A7C4B8] hover:text-[#14532D] dark:hover:text-emerald-100 hover:bg-[#D1FAE5] dark:hover:bg-[#183D36] transition-colors"
            title="Next Hour"
            aria-label="Next Hour"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Time slider */}
        <div className="hidden lg:flex items-center gap-2 bg-gray-50 border border-gray-100 dark:bg-[#0A2018] dark:border-[#23483F] px-3 py-1.5 rounded-full shadow-sm">
          <span className="text-[11px] font-mono text-gray-500">06:00</span>
          <input
            type="range"
            min="6"
            max="24"
            step="0.25"
            value={currentHours}
            onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            className="w-24 xl:w-36 h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            aria-label="Simulation Time Slider"
          />
          <span className="text-[11px] font-mono text-gray-500">24:00</span>
        </div>

        {/* Time badge */}
        <div className="bg-[#ECFDF5] dark:bg-[#0A2018] border border-[#D1E7DD] dark:border-[#23483F] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-center">
          <div className="text-[10px] uppercase tracking-wider text-[#6B8178] dark:text-[#6B8E82] font-semibold leading-none">Time</div>
          <div className="text-xs font-bold text-[#14532D] dark:text-emerald-100 font-mono mt-0.5">{currentTime}</div>
        </div>
      </div>

      {/* Right: Search, Notifications, Profile */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search"
            className="pl-9 pr-4 py-2 rounded-full bg-white dark:bg-[#0D2420] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 shadow-sm border border-gray-100 dark:border-[#23483F]"
          />
        </div>
        <ThemeToggle />
        <button className="w-9 h-9 rounded-full bg-white dark:bg-[#0D2420] flex items-center justify-center shadow-sm border border-gray-100 dark:border-[#23483F] relative">
          <Bell className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2 border border-white" />
        </button>
        <button className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
          <img src="https://i.pravatar.cc/100?img=1" alt="User Profile" className="w-full h-full object-cover" />
        </button>
      </div>
    </header>
  )
}
