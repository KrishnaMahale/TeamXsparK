import React from 'react'
import { useLocation } from 'react-router-dom'
import {
  Home,
  LayoutDashboard,
  SlidersHorizontal,
  Share2,
  TrendingUp,
  AlertTriangle,
  Wrench,
  FileText,
} from 'lucide-react'

export const Header: React.FC = () => {
  const location = useLocation()

  // Suppress redundant header on Home page
  if (location.pathname === '/' || location.pathname === '/home') {
    return null
  }

  // Resolve active page header title and icon
  const getPageInfo = () => {
    const path = location.pathname
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

  return (
    <header className="relative h-14 px-4 sm:px-6 bg-white/80 dark:bg-[#0E2419]/80 backdrop-blur-md border-b border-[#A7F3D0]/60 dark:border-[#86EFAC]/20 flex items-center justify-between gap-3 shrink-0 z-20 select-none transition-colors duration-200">
      {/* Left: Dynamic Page Title Pill */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#ECFDF3] dark:bg-[#132F21] border border-[#86EFAC]/80 dark:border-[#86EFAC]/35 shadow-xs">
          <PageIcon className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />
          <span className="text-sm font-bold text-[#064E3B] dark:text-white tracking-tight">
            {pageInfo.title}
          </span>
        </div>
      </div>
    </header>
  )
}

export default Header
