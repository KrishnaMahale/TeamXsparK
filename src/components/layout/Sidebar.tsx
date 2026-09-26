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
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useGridStore } from '../../store/gridStore'
import { useDomesticStore } from '../../store/domesticStore'

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { violationSummary } = useGridStore()
  const { gridType, setGridType } = useDomesticStore()

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
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
          ? 'bg-red-600 text-white'
          : 'bg-amber-600 text-white',
    },
    { name: 'Actions', path: '/actions', icon: Wrench },
    { name: 'Scenarios', path: '/scenarios', icon: Layers },
    { name: 'Reports', path: '/reports', icon: FileText },
  ]

  return (
    <aside
      className={`bg-[#0E172C] border-r border-[#1E293B] transition-all duration-200 flex flex-col shrink-0 z-20 select-none ${
        sidebarCollapsed ? 'w-16' : 'w-56 lg:w-60'
      }`}
    >
      {/* Navigation List */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-[#16223F]'
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
                <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Active Model Indicator */}
      <div className="p-3 border-t border-[#1E293B]">
        {!sidebarCollapsed ? (
          <div className="p-2.5 rounded-lg bg-[#111C35] border border-[#1E293B] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
              <span>Active Model</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  gridType === 'domestic' ? 'bg-amber-400' : 'bg-blue-400'
                }`}
              />
            </div>
            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
              {gridType === 'domestic' ? (
                <>
                  <Home className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Domestic Solar</span>
                </>
              ) : (
                <>
                  <Factory className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">Industrial Grid</span>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setGridType(gridType === 'domestic' ? 'industrial' : 'domestic')
              }}
              className="w-full text-center text-[10px] text-blue-400 hover:text-blue-300 hover:underline pt-0.5"
            >
              Switch to {gridType === 'domestic' ? 'Industrial' : 'Domestic'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setGridType(gridType === 'domestic' ? 'industrial' : 'domestic')}
            className="w-full flex justify-center p-2 rounded-lg bg-[#111C35] text-slate-300 hover:text-white"
            title={`Active: ${gridType}. Click to switch.`}
          >
            {gridType === 'domestic' ? (
              <Home className="w-4 h-4 text-amber-400" />
            ) : (
              <Factory className="w-4 h-4 text-blue-400" />
            )}
          </button>
        )}
      </div>

      {/* Collapse/Expand Toggle */}
      <div className="p-3 border-t border-[#1E293B]">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#16223F] rounded-lg transition-colors border border-[#1E293B]"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
