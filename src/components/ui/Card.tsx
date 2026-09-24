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
    default: 'bg-[#111C35] border border-[#1E293B]',
    highlight: 'bg-[#111C35] border border-blue-600/50',
    danger: 'bg-[#111C35] border border-red-700/60',
    warning: 'bg-[#111C35] border border-amber-700/60',
    success: 'bg-[#111C35] border border-emerald-700/60',
  }

  // Support backward compatible glowColor mapping
  let activeVariant = variant
  if (glowColor === 'rose') activeVariant = 'danger'
  else if (glowColor === 'amber') activeVariant = 'warning'
  else if (glowColor === 'emerald') activeVariant = 'success'
  else if (glowColor === 'blue') activeVariant = 'highlight'

  return (
    <div
      className={`rounded-xl ${variantStyles[activeVariant]} transition-colors duration-150 ${className}`}
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
  <div className={`p-4 sm:p-5 border-b border-[#1E293B] flex items-center justify-between ${className}`}>
    <div className="flex items-center gap-2.5">
      {icon && <span className="text-blue-400">{icon}</span>}
      <div>
        <h3 className="text-sm font-semibold text-slate-100 tracking-wide uppercase flex items-center gap-2">
          {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
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
  <div className={`p-4 sm:p-5 border-t border-[#1E293B] flex items-center justify-between bg-[#0E172C] rounded-b-xl ${className}`}>
    {children}
  </div>
)
