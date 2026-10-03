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
      className={`relative inline-flex items-center justify-center p-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
        isDark
          ? 'bg-slate-800/80 border-slate-700 text-amber-300 hover:bg-slate-700 hover:text-amber-200'
          : 'bg-slate-100 border-slate-200 text-sky-700 hover:bg-slate-200/80 hover:text-sky-800'
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
