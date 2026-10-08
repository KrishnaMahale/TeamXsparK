import React, { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  SlidersHorizontal,
  Share2,
  TrendingUp,
  AlertTriangle,
  Wrench,
  Layers,
  FileText,
  Zap,
} from 'lucide-react'
import { useGridStore } from '../../store/gridStore'

export const Sidebar: React.FC = () => {
  const { network, violationSummary } = useGridStore()
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 200)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  const isExpanded = isHovered

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Simulation', path: '/simulation', icon: SlidersHorizontal },
    { name: 'Grid Configurator', path: '/network', icon: Share2 },
    { name: 'Forecast', path: '/forecasts', icon: TrendingUp },
    {
      name: 'Violations',
      path: '/violations',
      icon: AlertTriangle,
      badge:
        violationSummary.critical > 0
          ? violationSummary.critical
          : violationSummary.warning > 0
          ? violationSummary.warning
          : undefined,
      badgeColor:
        violationSummary.critical > 0
          ? 'bg-[#FEE2E2] text-[#991B1B] dark:bg-red-950/70 dark:text-red-300 border border-[#FECACA] dark:border-red-800'
          : 'bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/70 dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800',
    },
    { name: 'Actions', path: '/actions', icon: Wrench },
    { name: 'Scenarios', path: '/scenarios', icon: Layers },
    { name: 'Reports', path: '/reports', icon: FileText },
  ]

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative bg-[#A0C878] dark:bg-[#1A281C] border-r border-[#DDD9C9] dark:border-[#2C3C2E] transition-all duration-300 ease-in-out flex flex-col shrink-0 z-30 select-none h-full ${
        isExpanded ? 'w-56 lg:w-60 shadow-xl' : 'w-16'
      }`}
    >
      {/* Invisible proximity trigger zone extending 48px into page when collapsed so moving close to sidebar opens it */}
      {!isExpanded && (
        <div
          className="absolute top-0 right-0 -mr-12 w-12 h-full pointer-events-auto"
          onMouseEnter={handleMouseEnter}
          aria-hidden="true"
        />
      )}

      {/* Brand Logo & Title */}
      <div
        className={`flex items-center gap-2.5 px-4 py-5 border-b border-[#8FB867] dark:border-[#2C3C2E] ${
          !isExpanded ? 'justify-center' : ''
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-[#26352A] dark:bg-[#263629] flex items-center justify-center shrink-0 shadow-xs">
          <Zap className="w-4.5 h-4.5 text-[#DDEB9D] fill-current" />
        </div>
        {isExpanded && (
          <div className="min-w-0 animate-in fade-in duration-200">
            <div className="text-[13px] font-bold text-[#26352A] dark:text-[#F2F5ED] tracking-tight truncate">
              TeamXsparK
            </div>
            <div className="text-[10px] text-[#3B4E3E] dark:text-[#A4B3A2] font-medium truncate">
              Grid Digital Twin
            </div>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="p-2.5 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isOverview = item.path === '/'
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={isOverview}
              title={!isExpanded ? item.name : undefined}
              aria-label={item.name}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs tracking-wide transition-colors relative mx-0.5 select-none ${
                  !isExpanded ? 'justify-center px-2' : ''
                } ${
                  isActive
                    ? 'bg-[#FFFDF6] dark:bg-[#2D3E2F] text-[#26352A] dark:text-[#F2F5ED] font-bold shadow-xs'
                    : 'text-[#26352A] dark:text-[#C2CCC0] font-medium hover:text-[#18251B] dark:hover:text-[#FFFDF6] hover:bg-[#DDEB9D] dark:hover:bg-[#233325]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0 pointer-events-none" />
              {isExpanded && (
                <span className="flex-1 truncate pointer-events-none animate-in fade-in duration-150">
                  {item.name}
                </span>
              )}
              {isExpanded && item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold pointer-events-none animate-in fade-in duration-150 ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
              {!isExpanded && item.badge !== undefined && (
                <span className="w-2 h-2 rounded-full bg-red-600 absolute top-2 right-2 ring-2 ring-[#A0C878] dark:ring-[#1A281C] pointer-events-none" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Active Grid Indicator */}
      <div className="p-2.5 mb-2 border-t border-[#8FB867] dark:border-[#2C3C2E]">
        {isExpanded ? (
          <div className="p-2.5 rounded-lg bg-[#FFFDF6]/65 dark:bg-[#141C16]/60 border border-[#8FB867] dark:border-[#2C3C2E] space-y-1.5 shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[10px] text-[#3B4E3E] dark:text-[#859483] uppercase font-semibold tracking-wider">
              <span>Active Grid</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  network.gridConnectionStatus === 'islanded'
                    ? 'bg-amber-500'
                    : 'bg-[#2E7D32] dark:bg-[#A0C878]'
                }`}
                title={`Status: ${network.gridConnectionStatus || 'connected'}`}
              />
            </div>
            <div
              className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] truncate flex items-center gap-1.5"
              title={network.name}
            >
              <Zap className="w-3.5 h-3.5 text-[#26352A] dark:text-[#A0C878] shrink-0" />
              <span className="truncate">{network.name || 'Default Grid'}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#3B4E3E] dark:text-[#A4B3A2] pt-0.5 font-medium">
              <span>
                {network.buses?.length ?? 0} Buses • {network.feeders?.length ?? 0} Feeders
              </span>
              <NavLink
                to="/network"
                className="text-[#26352A] dark:text-[#F2F5ED] hover:underline font-semibold"
                title="Manage grid in Grid Configurator"
              >
                Configure
              </NavLink>
            </div>
          </div>
        ) : (
          <NavLink
            to="/network"
            className="w-full flex justify-center p-2 rounded-lg bg-[#FFFDF6]/65 dark:bg-[#141C16]/60 text-[#26352A] dark:text-[#F2F5ED] hover:bg-[#FFFDF6] transition-colors"
            title={`Active Grid: ${network.name || 'Default Grid'} (${network.buses?.length ?? 0} Buses)`}
          >
            <Zap className="w-4 h-4 text-[#26352A] dark:text-[#A0C878]" />
          </NavLink>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
