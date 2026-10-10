import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  SlidersHorizontal,
  Share2,
  TrendingUp,
  AlertTriangle,
  Wrench,
  FileText,
  Zap,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { useGridStore } from '../../store/gridStore'

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const { network, violationSummary } = useGridStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const navItems = [
    { name: 'Home', path: '/home', icon: Home },
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
          ? 'bg-red-500/90 text-white border border-red-300'
          : 'bg-amber-400 text-amber-950 border border-amber-200',
    },
    { name: 'Actions', path: '/actions', icon: Wrench },
    { name: 'Reports', path: '/reports', icon: FileText },
  ]

  const renderSidebarContent = (isExpanded: boolean) => (
    <div
      className={`relative flex flex-col h-full w-full justify-between overflow-hidden select-none transition-all duration-300 ${
        isExpanded ? 'p-4' : 'p-2.5 items-center'
      }`}
    >
      {/* Background Subtle Luminous Energy Waves */}
      <div className="absolute inset-0 pointer-events-none opacity-35 overflow-hidden">
        <svg
          className="absolute -right-12 top-0 h-full w-48 text-[#86EFAC]/40"
          viewBox="0 0 200 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 180 0 C 40 200, 240 450, 60 800"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
          <path
            d="M 120 0 C 10 240, 200 520, 20 800"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.6"
          />
          <circle cx="80" cy="320" r="3" fill="#86EFAC" opacity="0.8" />
          <circle cx="140" cy="560" r="2.5" fill="#BBF7D0" opacity="0.8" />
        </svg>
      </div>

      {/* Top Branding Section */}
      <div className="relative z-10 w-full">
        <div
          onClick={() => window.location.reload()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              window.location.reload()
            }
          }}
          title="TeamXsparK — Click to reload current page"
          className={`flex items-center px-1.5 py-2.5 cursor-pointer group transition-transform active:scale-95 ${
            isExpanded ? 'justify-start gap-3' : 'justify-center'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#86EFAC] to-[#34D399] flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(134,239,172,0.45)] group-hover:shadow-[0_0_24px_rgba(134,239,172,0.65)] transition-shadow">
            <Zap className="w-5 h-5 text-[#064E3B] fill-current" />
          </div>
          <div
            className={`transition-all duration-300 overflow-hidden whitespace-nowrap min-w-0 ${
              isExpanded ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0 pointer-events-none'
            }`}
          >
            <div className="text-[15px] font-extrabold text-white tracking-tight truncate leading-tight">
              TeamXsparK
            </div>
            <div className="text-[11px] text-[#A7F3D0] font-medium truncate tracking-wide">
              Grid Digital Twin
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="mt-5 space-y-1.5 w-full">
          {navItems.map((item) => {
            const Icon = item.icon
            const isHome = item.path === '/home'
            const isCurrentActive =
              location.pathname === item.path ||
              (isHome && (location.pathname === '/' || location.pathname === '/home'))

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={item.name}
                aria-label={item.name}
                className={`flex items-center rounded-xl text-[13px] tracking-wide transition-all duration-200 relative ${
                  isExpanded
                    ? 'justify-between px-3.5 py-2.5'
                    : 'justify-center px-2 py-2.5 w-full'
                } ${
                  isCurrentActive
                    ? 'mint-active-pill font-bold shadow-md'
                    : 'text-white/85 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                <div className={`flex items-center truncate ${isExpanded ? 'gap-3' : 'justify-center'}`}>
                  <Icon className="w-5 h-5 shrink-0" />
                  <span
                    className={`transition-all duration-300 overflow-hidden whitespace-nowrap truncate ${
                      isExpanded ? 'opacity-100 max-w-[130px]' : 'opacity-0 max-w-0 pointer-events-none'
                    }`}
                  >
                    {item.name}
                  </span>
                </div>

                {/* Right side indicators */}
                {isExpanded ? (
                  <div className="flex items-center gap-1.5 shrink-0 transition-opacity duration-200">
                    {item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shadow-xs ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isCurrentActive && (
                      <ChevronRight className="w-4 h-4 text-[#064E3B] shrink-0 stroke-[2.5]" />
                    )}
                  </div>
                ) : (
                  item.badge !== undefined && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-400 border border-white" />
                  )
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* Bottom: Active Grid Card */}
      <div className="relative z-10 pt-4 w-full">
        {isExpanded ? (
          <div className="p-3.5 rounded-2xl bg-[#022318]/70 backdrop-blur-md border border-[#86EFAC]/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] space-y-2 transition-all duration-300 animate-in fade-in">
            <div className="flex items-center justify-between text-[10px] text-[#86EFAC] uppercase font-bold tracking-wider">
              <span>ACTIVE GRID</span>
              <span
                className={`w-2 h-2 rounded-full shadow-[0_0_8px_#4ADE80] ${
                  network.gridConnectionStatus === 'islanded'
                    ? 'bg-amber-400 shadow-[0_0_8px_#FBBF24]'
                    : 'bg-[#4ADE80]'
                }`}
                title={`Status: ${network.gridConnectionStatus || 'connected'}`}
              />
            </div>

            <div
              className="text-xs font-bold text-white truncate flex items-center gap-1.5"
              title={network.name}
            >
              <Zap className="w-3.5 h-3.5 text-[#86EFAC] shrink-0 fill-current" />
              <span className="truncate">{network.name || 'Default 4-Bus Feeder'}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/75 pt-0.5">
              <span className="truncate">
                {network.buses?.length ?? 4} Buses • {network.feeders?.length ?? 5} Feeders
              </span>
              <NavLink
                to="/network"
                onClick={() => setMobileOpen(false)}
                className="text-[#86EFAC] hover:text-white hover:underline font-bold text-[11px] shrink-0 transition-colors ml-1"
                title="Manage grid in Grid Configurator"
              >
                Configure
              </NavLink>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#022318]/70 border border-[#86EFAC]/30 cursor-pointer"
            title={`Active Grid: ${network.name || 'Default 4-Bus Feeder'}`}
            onClick={() => setIsHovered(true)}
          >
            <span
              className={`w-2 h-2 rounded-full mb-1 shadow-[0_0_6px_#4ADE80] ${
                network.gridConnectionStatus === 'islanded' ? 'bg-amber-400' : 'bg-[#4ADE80]'
              }`}
            />
            <Zap className="w-4 h-4 text-[#86EFAC] fill-current" />
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-[#064E3B] text-white shadow-lg border border-[#86EFAC]/40"
        aria-label="Toggle Navigation Menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-3 left-3 z-40 w-64 glass-sidebar-panel transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-[110%]'
        }`}
      >
        {renderSidebarContent(true)}
      </aside>

      {/* Desktop Floating Dynamic Glass Sidebar (Expands smoothly on hover, collapses otherwise) */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden lg:flex glass-sidebar-panel shrink-0 select-none h-full transition-all duration-300 ease-in-out ${
          isHovered ? 'w-60 xl:w-64 shadow-[0_20px_50px_rgba(4,78,59,0.35)]' : 'w-20'
        }`}
      >
        {renderSidebarContent(isHovered)}
      </aside>
    </>
  )
}

export default Sidebar
