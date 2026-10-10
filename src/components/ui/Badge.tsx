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
      'bg-[#ECFDF3] dark:bg-[#132F21] text-[#047857] dark:text-[#86EFAC] border-[#86EFAC]/60 dark:border-[#86EFAC]/30 shadow-2xs',
    success:
      'bg-[#ECFDF3] dark:bg-[#132F21] text-[#047857] dark:text-[#86EFAC] border-[#86EFAC]/60 dark:border-[#86EFAC]/30 shadow-2xs',
    warning:
      'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300/80 dark:border-amber-800 shadow-2xs',
    danger:
      'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-300/80 dark:border-red-800 shadow-2xs',
    neutral:
      'bg-[#F4FAF5] dark:bg-[#0E2419] text-[#425B4C] dark:text-[#A7F3D0] border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs',
    purple:
      'bg-[#ECFDF3] dark:bg-[#132F21] text-[#047857] dark:text-[#86EFAC] border-[#86EFAC]/60 shadow-2xs',
  }

  const dotColors = {
    primary: 'bg-[#16A34A]',
    success: 'bg-[#16A34A]',
    warning: 'bg-amber-500',
    danger: 'bg-red-600',
    neutral: 'bg-[#6B8274]',
    purple: 'bg-[#16A34A]',
  }

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-full font-bold',
    md: 'text-xs px-2.5 py-1 rounded-full font-bold',
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
