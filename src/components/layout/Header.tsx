import React from 'react'
import { useLocation } from 'react-router-dom'
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Search,
  Home,
  LayoutDashboard,
  SlidersHorizontal,
  Share2,
  TrendingUp,
  AlertTriangle,
  Wrench,
  FileText,
} from 'lucide-react'
import { useTimeSimulation } from '../../hooks/useTimeSimulation'
import { ThemeToggle } from '../ui/ThemeToggle'

export const Header: React.FC = () => {
  const location = useLocation()
  const {
    currentTime,
    currentHours,
    isPlaying,
    handleSliderChange,
    togglePlay,
    stepForward,
    stepBackward,
  } = useTimeSimulation()

  // Resolve active page header title and icon
  const getPageInfo = () => {
    const path = location.pathname
    if (path === '/' || path === '/home') {
      return { title: 'Home', icon: Home }
    }
    if (path === '/simulation/results') {
      return { title: 'Simulation Results', icon: SlidersHorizontal }
    }
    if (path.startsWith('/simulation')) {
      return { title: 'Simulation', icon: SlidersHorizontal }
    }
    if (path.startsWith('/network')) {
      return { title: 'Grid Configurator', icon: Share2 }
    }
    if (path.startsWith('/forecast')) {
      return { title: 'Forecast', icon: TrendingUp }
    }
    if (path.startsWith('/violations')) {
      return { title: 'Violations', icon: AlertTriangle }
    }
    if (path.startsWith('/actions')) {
      return { title: 'Actions', icon: Wrench }
    }
    if (path.startsWith('/reports')) {
      return { title: 'Reports', icon: FileText }
    }
    return { title: 'Dashboard', icon: LayoutDashboard }
  }

  const pageInfo = getPageInfo()
  const PageIcon = pageInfo.icon
  const showSimulationController = location.pathname.startsWith('/actions')

  return (
    <header className="h-16 px-4 sm:px-6 bg-white/70 dark:bg-[#0E2419]/70 backdrop-blur-md border-b border-[#105037]/10 dark:border-[#86EFAC]/15 flex items-center justify-between gap-3 shrink-0 z-20 select-none transition-colors duration-200">
      {/* Left: Dynamic Page Title Pill (Matching Reference) */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#ECFDF3] dark:bg-[#132F21] border border-[#A7F3D0]/80 dark:border-[#86EFAC]/30 shadow-2xs">
          <PageIcon className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />
          <span className="text-sm font-bold text-[#10251A] dark:text-white tracking-tight">
            {pageInfo.title}
          </span>
        </div>
      </div>

      {/* Center: Time Simulation Controls (for simulation & actions pages) */}
      {showSimulationController && (
        <div className="flex items-center gap-2 sm:gap-3 bg-[#F4FAF5] dark:bg-[#132F21] px-3 py-1 rounded-xl border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={stepBackward}
              className="p-1 rounded-md text-[#425B4C] dark:text-[#A7F3D0] hover:text-[#064E3B] hover:bg-[#BBF7D0]/40 transition-colors"
              title="Previous Hour"
              aria-label="Previous Hour"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                isPlaying
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-[#047857] text-white hover:bg-[#065F46]'
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
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden md:inline">Play</span>
                </>
              )}
            </button>

            <button
              onClick={stepForward}
              className="p-1 rounded-md text-[#425B4C] dark:text-[#A7F3D0] hover:text-[#064E3B] hover:bg-[#BBF7D0]/40 transition-colors"
              title="Next Hour"
              aria-label="Next Hour"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-2">
            <span className="text-[11px] font-mono text-[#6B8274] dark:text-[#86EFAC]">06:00</span>
            <input
              type="range"
              min="6"
              max="24"
              step="0.25"
              value={currentHours}
              onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
              className="w-24 xl:w-32 h-1.5 rounded-lg appearance-none cursor-pointer accent-[#047857] bg-[#BBF7D0] dark:bg-[#1B3E2D]"
              aria-label="Simulation Time Slider"
            />
            <span className="text-[11px] font-mono text-[#6B8274] dark:text-[#86EFAC]">24:00</span>
          </div>

          <div className="text-center px-2 py-0.5 rounded-md bg-white dark:bg-[#0E2419] border border-[#BBF7D0]/50 shadow-2xs">
            <div className="text-[9px] uppercase tracking-wider text-[#6B8274] font-bold">Time</div>
            <div className="text-xs font-black text-[#047857] dark:text-[#86EFAC] font-mono">{currentTime}</div>
          </div>
        </div>
      )}

      {/* Right: Search Input & Theme Toggle */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Search Bar */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-[#6B8274] dark:text-[#A7F3D0]/70 absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search anything..."
            className="pl-9.5 pr-4 py-1.5 rounded-full bg-[#F4FAF5] dark:bg-[#11261B] text-xs font-medium text-[#10251A] dark:text-white placeholder:text-[#6B8274] focus:outline-none focus:ring-2 focus:ring-[#047857] w-48 lg:w-64 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/25 shadow-2xs transition-all"
          />
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggle />
      </div>
    </header>
  )
}

export default Header
