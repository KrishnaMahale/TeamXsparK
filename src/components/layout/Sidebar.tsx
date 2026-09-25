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
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useGridStore } from '../../store/gridStore'

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { violationSummary } = useGridStore()

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
