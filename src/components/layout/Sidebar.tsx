import React from 'react'
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
  ChevronLeft,
  ChevronRight,
  Factory,
  Home,
  Zap,
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useGridStore } from '../../store/gridStore'
import { useDomesticStore } from '../../store/domesticStore'

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { violationSummary } = useGridStore()
  const { gridType, setGridType } = useDomesticStore()

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Simulation', path: '/simulation', icon: SlidersHorizontal },
    { name: 'Network', path: '/network', icon: Share2 },
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
          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
    },
    { name: 'Actions', path: '/actions', icon: Wrench },
    { name: 'Scenarios', path: '/scenarios', icon: Layers },
    { name: 'Reports', path: '/reports', icon: FileText },
  ]

  return (
    <aside
      className={`bg-[#2D2D2D] dark:bg-[#0D2420] rounded-[24px] transition-all duration-200 flex flex-col shrink-0 z-20 select-none shadow-md my-auto h-[96%] ${
        sidebarCollapsed ? 'w-16' : 'w-56 lg:w-60'
      }`}
    >
      {/* Brand Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-5 ${sidebarCollapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-[#3F433E] flex items-center justify-center shrink-0">
          <Zap className="w-4.5 h-4.5 text-[#9FE870] fill-current" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-white tracking-tight truncate">
              TeamXsparK
            </div>
            <div className="text-[10px] text-gray-400 truncate">Grid Digital Twin</div>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="p-2.5 space-y-0.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-medium tracking-wide transition-colors relative mx-1 ${
                  isActive
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span className="flex-1 truncate">{item.name}</span>}
              {!sidebarCollapsed && item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
              {sidebarCollapsed && item.badge !== undefined && (
                <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2 ring-2 ring-[#2D2D2D] dark:ring-[#0D2420]" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Active Model Indicator */}
      <div className="p-2.5 mb-2">
        {!sidebarCollapsed ? (
          <div className="p-2.5 rounded-lg bg-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
              <span>Active Model</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  gridType === 'domestic' ? 'bg-yellow-500' : 'bg-teal-500'
                }`}
              />
            </div>
            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
              {gridType === 'domestic' ? (
                <>
                  <Home className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                  <span className="truncate">Domestic Solar</span>
                </>
              ) : (
                <>
                  <Factory className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  <span className="truncate">Industrial Grid</span>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setGridType(gridType === 'domestic' ? 'industrial' : 'domestic')
              }}
              className="w-full text-center text-[10px] text-gray-400 hover:text-white hover:underline pt-0.5"
            >
              Switch to {gridType === 'domestic' ? 'Industrial' : 'Domestic'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setGridType(gridType === 'domestic' ? 'industrial' : 'domestic')}
            className="w-full flex justify-center p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white"
            title={`Active: ${gridType}. Click to switch.`}
          >
            {gridType === 'domestic' ? (
              <Home className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            ) : (
              <Factory className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            )}
          </button>
        )}
      </div>

      {/* Collapse/Expand Toggle */}
      <div className="p-2.5 mt-auto">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 py-3 px-3 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors bg-white/5"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
