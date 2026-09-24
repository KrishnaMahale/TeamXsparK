import React from 'react'

export interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple'
  size?: 'sm' | 'md'
  className?: string
  dot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'sm',
  className = '',
  dot = false,
}) => {
  const variantStyles = {
    primary: 'bg-blue-950/80 text-blue-300 border-blue-700/60',
    success: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
    warning: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
    danger: 'bg-red-950/80 text-red-300 border-red-700/60',
    neutral: 'bg-[#16223F] text-slate-300 border-[#273859]',
    purple: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
  }

  const dotColors = {
    primary: 'bg-blue-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    neutral: 'bg-slate-400',
    purple: 'bg-purple-400',
  }

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md font-medium',
    md: 'text-xs px-2.5 py-1 rounded-md font-medium',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 border tracking-wide uppercase ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}
