import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'highlight' | 'danger' | 'warning' | 'success'
  glowColor?: string // backward compatibility
  isGlass?: boolean // backward compatibility
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  glowColor = 'none',
  isGlass = false,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white dark:bg-[#0D2420] border border-gray-100 dark:border-[#23483F] shadow-sm',
    highlight: 'bg-[#F0FDF4] dark:bg-[#0D2420] border border-emerald-100 dark:border-emerald-800/60 shadow-sm',
    danger: 'bg-red-50/60 dark:bg-[#0D2420] border border-red-100 dark:border-red-800/60 shadow-sm',
    warning: 'bg-amber-50/60 dark:bg-[#0D2420] border border-amber-100 dark:border-amber-800/60 shadow-sm',
    success: 'bg-emerald-50/60 dark:bg-[#0D2420] border border-emerald-100 dark:border-emerald-800/60 shadow-sm',
  }

  // Support backward compatible glowColor mapping
  let activeVariant = variant
  if (glowColor === 'rose') activeVariant = 'danger'
  else if (glowColor === 'amber') activeVariant = 'warning'
  else if (glowColor === 'emerald') activeVariant = 'success'
  else if (glowColor === 'blue') activeVariant = 'highlight'

  return (
    <div
      className={`rounded-2xl ${variantStyles[activeVariant]} transition-colors duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<{
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
  icon?: React.ReactNode
}> = ({ title, subtitle, action, className = '', icon }) => (
  <div className={`p-4 sm:p-5 border-b border-gray-100 dark:border-[#23483F] flex items-center justify-between ${className}`}>
    <div className="flex items-center gap-2.5">
      {icon && <span className="text-emerald-600 dark:text-emerald-400">{icon}</span>}
      <div>
        <h3 className="text-sm font-semibold text-[#14532D] dark:text-emerald-100 tracking-wide uppercase flex items-center gap-2">
          {title}
        </h3>
        {subtitle && <p className="text-xs text-[#6B8178] dark:text-[#6B8E82] mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="flex items-center gap-2">{action}</div>}
  </div>
)

export const CardContent: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className = '' }) => (
  <div className={`p-4 sm:p-5 ${className}`}>{children}</div>
)

export const CardFooter: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className = '' }) => (
<div className={`p-4 sm:p-5 border-t border-gray-100 dark:border-[#23483F] flex items-center justify-between bg-[#F0FDF4] dark:bg-[#0A2018] rounded-b-2xl ${className}`}>
    {children}
  </div>
)
