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
      className={`w-9 h-9 rounded-full border border-[#BBF7D0]/60 dark:border-[#86EFAC]/25 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#047857] shadow-2xs cursor-pointer ${
        isDark
          ? 'bg-[#11261B] text-amber-300 hover:bg-[#163826]'
          : 'bg-[#F4FAF5] text-[#425B4C] hover:bg-[#ECFDF3]'
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
