import React, { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export const AppShell: React.FC = () => {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  // Reset scroll position on every page transition so content is always visible at the top
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [location.pathname])

  return (
    <div className="relative flex h-screen w-screen overflow-hidden select-none bg-gradient-to-br from-[#E2F3E7] via-[#D9F1E2] to-[#E8F6EE] dark:from-[#04140D] dark:via-[#071F14] dark:to-[#05180F] text-[#10251A] dark:text-[#F0FDF4] p-2 sm:p-3 md:p-3.5 lg:p-4 gap-3 md:gap-4 transition-colors duration-300">
      {/* Ambient Atmospheric Renewable Energy Glows (Underlying Background) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#86EFAC]/25 dark:bg-[#059669]/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-[#34D399]/20 dark:bg-[#047857]/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-[#BBF7D0]/20 dark:bg-[#10B981]/10 blur-2xl pointer-events-none" />

      {/* Left Floating Deep Emerald-Green Glass Sidebar */}
      <Sidebar />

      {/* Right Floating White Main Content Panel (Matching Reference Image) */}
      <div className="flex-1 flex flex-col min-w-0 h-full rounded-[26px] bg-white/95 dark:bg-[#0B1E15]/95 border border-white/90 dark:border-[#86EFAC]/20 shadow-[0_20px_50px_rgba(16,80,55,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] overflow-hidden backdrop-blur-2xl transition-all duration-300 z-10">
        {/* Top Header inside the floating main panel (hidden on simulation, network configurator, forecast, violations, reports, and actions pages) */}
        {!location.pathname.startsWith('/simulation') &&
          !location.pathname.startsWith('/network') &&
          !location.pathname.startsWith('/forecast') &&
          !location.pathname.startsWith('/violations') &&
          !location.pathname.startsWith('/reports') &&
          !location.pathname.startsWith('/actions') && <Header />}

        {/* Dynamic Route Content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col bg-white/60 dark:bg-[#0B1E15]/60"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppShell
