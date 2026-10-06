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
    primary:
      'bg-[#DDEB9D]/60 dark:bg-[#2D3E2F] text-[#26352A] dark:text-[#DDEB9D] border-[#C9C7B5] dark:border-[#3B4E3E]',
    success:
      'bg-[#DDEB9D]/60 dark:bg-[#2D3E2F] text-[#26352A] dark:text-[#DDEB9D] border-[#C9C7B5] dark:border-[#3B4E3E]',
    warning:
      'bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800',
    danger:
      'bg-red-100/80 dark:bg-red-950/60 text-red-900 dark:text-red-200 border-red-300 dark:border-red-800',
    neutral:
      'bg-[#FAF6E9] dark:bg-[#1E2B20] text-[#506052] dark:text-[#C2CCC0] border-[#DDD9C9] dark:border-[#2C3C2E]',
    purple:
      'bg-[#FAF6E9] dark:bg-[#1E2B20] text-[#26352A] dark:text-[#DDEB9D] border-[#DDD9C9] dark:border-[#2C3C2E]',
  }

  const dotColors = {
    primary: 'bg-[#A0C878]',
    success: 'bg-[#A0C878]',
    warning: 'bg-amber-500',
    danger: 'bg-red-600',
    neutral: 'bg-[#788477]',
    purple: 'bg-[#A0C878]',
  }

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md font-semibold',
    md: 'text-xs px-2.5 py-1 rounded-md font-semibold',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 border tracking-wider uppercase ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}

export default Badge
