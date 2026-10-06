import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'

interface ThemeToggleProps {
  className?: string
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useUIStore()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`relative inline-flex items-center justify-center p-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#A0C878] ${
        isDark
          ? 'bg-[#1E2B20] border-[#2C3C2E] text-amber-300 hover:bg-[#2D3E2F]'
          : 'bg-[#FAF6E9] border-[#DDD9C9] text-[#26352A] hover:bg-[#DDEB9D]'
      } ${className}`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform duration-200 rotate-0 scale-100" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-200 rotate-0 scale-100" />
      )}
      <span className="sr-only">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  )
}

export default ThemeToggle
