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
          ? 'bg-[#FEE2E2] text-[#991B1B] dark:bg-red-950/70 dark:text-red-300 border border-[#FECACA] dark:border-red-800'
          : 'bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/70 dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800',
    },
    { name: 'Actions', path: '/actions', icon: Wrench },
    { name: 'Scenarios', path: '/scenarios', icon: Layers },
    { name: 'Reports', path: '/reports', icon: FileText },
  ]

  return (
    <aside
      className={`bg-[#A0C878] dark:bg-[#1A281C] border-r border-[#DDD9C9] dark:border-[#2C3C2E] transition-all duration-200 flex flex-col shrink-0 z-20 select-none h-full ${
        sidebarCollapsed ? 'w-16' : 'w-56 lg:w-60'
      }`}
    >
      {/* Brand Logo & Title */}
      <div className={`flex items-center gap-2.5 px-4 py-5 border-b border-[#8FB867] dark:border-[#2C3C2E] ${sidebarCollapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-[#26352A] dark:bg-[#263629] flex items-center justify-center shrink-0 shadow-xs">
          <Zap className="w-4.5 h-4.5 text-[#DDEB9D] fill-current" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
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
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs tracking-wide transition-colors relative mx-0.5 ${
                  isActive
                    ? 'bg-[#FFFDF6] dark:bg-[#2D3E2F] text-[#26352A] dark:text-[#F2F5ED] font-bold shadow-xs'
                    : 'text-[#26352A] dark:text-[#C2CCC0] font-medium hover:text-[#18251B] dark:hover:text-[#FFFDF6] hover:bg-[#DDEB9D] dark:hover:bg-[#233325]'
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
                <span className="w-2 h-2 rounded-full bg-red-600 absolute top-2 right-2 ring-2 ring-[#A0C878] dark:ring-[#1A281C]" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Active Model Indicator */}
      <div className="p-2.5 mb-2 border-t border-[#8FB867] dark:border-[#2C3C2E]">
        {!sidebarCollapsed ? (
          <div className="p-2.5 rounded-lg bg-[#FFFDF6]/65 dark:bg-[#141C16]/60 border border-[#8FB867] dark:border-[#2C3C2E] space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] text-[#3B4E3E] dark:text-[#859483] uppercase font-semibold tracking-wider">
              <span>Active Model</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  gridType === 'domestic' ? 'bg-[#B09B29]' : 'bg-[#26352A] dark:bg-[#A0C878]'
                }`}
              />
            </div>
            <div className="text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] truncate flex items-center gap-1.5">
              {gridType === 'domestic' ? (
                <>
                  <Home className="w-3.5 h-3.5 text-[#B09B29] shrink-0" />
                  <span className="truncate">Domestic Solar</span>
                </>
              ) : (
                <>
                  <Factory className="w-3.5 h-3.5 text-[#26352A] dark:text-[#A0C878] shrink-0" />
                  <span className="truncate">Industrial Grid</span>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setGridType(gridType === 'domestic' ? 'industrial' : 'domestic')
              }}
              className="w-full text-center text-[10px] text-[#3B4E3E] dark:text-[#A4B3A2] hover:text-[#18251B] dark:hover:text-[#F2F5ED] hover:underline pt-0.5 font-medium"
            >
              Switch to {gridType === 'domestic' ? 'Industrial' : 'Domestic'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setGridType(gridType === 'domestic' ? 'industrial' : 'domestic')}
            className="w-full flex justify-center p-2 rounded-lg bg-[#FFFDF6]/65 dark:bg-[#141C16]/60 text-[#26352A] dark:text-[#F2F5ED] hover:bg-[#FFFDF6]"
            title={`Active: ${gridType}. Click to switch.`}
          >
            {gridType === 'domestic' ? (
              <Home className="w-4 h-4 text-[#B09B29]" />
            ) : (
              <Factory className="w-4 h-4 text-[#26352A] dark:text-[#A0C878]" />
            )}
          </button>
        )}
      </div>

      {/* Collapse/Expand Toggle */}
      <div className="p-2.5 pt-0">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-[#26352A] dark:text-[#C2CCC0] hover:text-[#18251B] dark:hover:text-[#FFFDF6] hover:bg-[#DDEB9D] dark:hover:bg-[#233325] bg-[#FFFDF6]/50 dark:bg-[#141C16]/50 rounded-lg transition-colors border border-[#8FB867] dark:border-[#2C3C2E]"
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

export default Sidebar
