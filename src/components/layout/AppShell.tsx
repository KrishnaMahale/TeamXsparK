import React from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export const AppShell: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#0A1124] text-slate-100 overflow-hidden select-none">
      {/* Top Header */}
      <Header />

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col bg-[#0A1124]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
