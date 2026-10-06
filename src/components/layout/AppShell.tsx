import React from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export const AppShell: React.FC = () => {
  return (
    <div className="flex h-screen w-screen bg-[#FFFDF6] dark:bg-[#151F17] text-[#26352A] dark:text-[#F2F5ED] overflow-hidden select-none transition-colors duration-200">
      {/* Left Sidebar - Integrated into Shell */}
      <Sidebar />

      {/* Main Full-Screen Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#FFFDF6] dark:bg-[#151F17]">
        {/* Top Header */}
        <Header />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col bg-[#FFFDF6] dark:bg-[#151F17]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppShell
