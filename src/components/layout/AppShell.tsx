import React from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export const AppShell: React.FC = () => {
  return (
    <div className="flex h-screen w-screen bg-[#E5E7EB] dark:bg-[#071A17] text-[#14532D] dark:text-[#ECFDF5] overflow-hidden select-none transition-colors duration-200 p-4 gap-4">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Layout Area (Rounded white container) */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0A2018] rounded-[24px] overflow-hidden shadow-sm relative border border-white/50 dark:border-white/5">
        {/* Top Header */}
        <Header />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
