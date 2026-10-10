import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Badge } from './Badge'

export interface AnimatedSelectOption {
  value: string
  label: string
  subtext?: string
  badge?: {
    text: string
    variant?: 'success' | 'warning' | 'danger' | 'neutral'
  }
  icon?: React.ReactNode
}

export interface AnimatedSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: AnimatedSelectOption[]
  placeholder?: string
  size?: 'sm' | 'md'
  direction?: 'up' | 'down' | 'auto'
  className?: string
  menuClassName?: string
}

export const AnimatedSelect: React.FC<AnimatedSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  size = 'md',
  direction = 'auto',
  className = '',
  menuClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const [computedUp, setComputedUp] = useState(false)

  useEffect(() => {
    if (isOpen && direction === 'auto' && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      if (spaceBelow < 240 && rect.top > spaceBelow) {
        setComputedUp(true)
      } else {
        setComputedUp(false)
      }
    }
  }, [isOpen, direction])

  const isSmall = size === 'sm'
  const isUp = direction === 'up' || (direction === 'auto' && computedUp)

  return (
    <div className={`relative ${isOpen ? 'z-[90]' : 'z-10'} ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between text-left rounded-xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.99] ${
          isSmall
            ? 'h-9 px-3 py-1.5 text-xs font-semibold'
            : 'h-10 px-3.5 py-2 text-xs sm:text-sm font-bold'
        } ${
          isOpen
            ? 'border-[#047857] dark:border-[#86EFAC] ring-2 ring-[#047857]/30 dark:ring-[#86EFAC]/30 bg-white dark:bg-[#163826] shadow-[0_4px_16px_rgba(4,120,87,0.18)]'
            : 'border-[#86EFAC]/75 dark:border-[#86EFAC]/40 bg-white/92 dark:bg-[#132F21]/90 hover:border-[#047857]/80 dark:hover:border-[#86EFAC]/70 hover:bg-white dark:hover:bg-[#163826] shadow-[0_2px_8px_rgba(16,80,55,0.05)] hover:shadow-[0_4px_14px_rgba(4,120,87,0.10)]'
        } text-[#10251A] dark:text-[#ECFDF3] backdrop-blur-md`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          {selectedOption?.icon && (
            <span className="text-[#047857] dark:text-[#86EFAC] shrink-0">
              {selectedOption.icon}
            </span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <Badge
              variant={selectedOption.badge.variant || 'neutral'}
              size="sm"
              className="shrink-0 text-[10px] py-0 px-1.5"
            >
              {selectedOption.badge.text}
            </Badge>
          )}
        </div>

        <div className="shrink-0 flex items-center text-[#047857] dark:text-[#86EFAC]">
          <ChevronDown
            className={`${
              isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'
            } transition-transform duration-300 ease-out ${
              isOpen ? 'rotate-180 text-[#047857] dark:text-[#86EFAC]' : ''
            }`}
          />
        </div>
      </button>

      {/* Animated Dropdown Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute z-[100] left-0 right-0 max-h-60 overflow-y-auto p-1.5 rounded-xl bg-white/98 dark:bg-[#122C1F]/95 backdrop-blur-xl border border-[#86EFAC]/80 dark:border-[#86EFAC]/40 shadow-[0_12px_36px_rgba(4,120,87,0.22)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.65)] ${
            isUp
              ? 'bottom-full mb-1.5 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200 ease-out'
              : 'top-full mt-1.5 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 ease-out'
          } ${menuClassName}`}
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2.5 text-xs transition-all duration-150 cursor-pointer mb-0.5 last:mb-0 ${
                  isSelected
                    ? 'bg-[#ECFDF3] dark:bg-[#163826] text-[#047857] dark:text-[#86EFAC] font-bold shadow-2xs'
                    : 'text-[#10251A] dark:text-[#ECFDF3] hover:bg-[#F4FAF5] dark:hover:bg-[#183B28] hover:translate-x-1 hover:text-[#047857] dark:hover:text-[#86EFAC]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {option.icon && (
                    <span className="text-[#047857] dark:text-[#86EFAC] shrink-0">
                      {option.icon}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="truncate">{option.label}</span>
                      {option.badge && (
                        <Badge
                          variant={option.badge.variant || 'neutral'}
                          size="sm"
                          className="shrink-0 text-[9.5px] py-0 px-1.5"
                        >
                          {option.badge.text}
                        </Badge>
                      )}
                    </div>
                    {option.subtext && (
                      <p className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] truncate mt-0.5 font-normal">
                        {option.subtext}
                      </p>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] shrink-0 animate-in zoom-in-50 duration-150" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
