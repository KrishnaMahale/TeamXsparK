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
    default: 'bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs',
    highlight: 'bg-[#DDEB9D]/30 dark:bg-[#2D3E2F]/50 border border-[#A0C878] dark:border-[#A0C878]/50 shadow-xs',
    danger: 'bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 shadow-xs',
    warning: 'bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 shadow-xs',
    success: 'bg-[#DDEB9D]/40 dark:bg-[#2D3E2F]/40 border border-[#A0C878] dark:border-[#A0C878]/60 shadow-xs',
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
  <div className={`p-4 sm:p-5 border-b border-[#DDD9C9] dark:border-[#2C3C2E] flex items-center justify-between ${className}`}>
    <div className="flex items-center gap-2.5">
      {icon && <span className="text-[#A0C878] shrink-0">{icon}</span>}
      <div>
        <h3 className="text-xs sm:text-sm font-bold text-[#26352A] dark:text-[#F2F5ED] tracking-wide uppercase flex items-center gap-2">
          {title}
        </h3>
        {subtitle && <p className="text-xs text-[#788477] dark:text-[#859483] mt-0.5">{subtitle}</p>}
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
  <div className={`p-4 sm:p-5 border-t border-[#DDD9C9] dark:border-[#2C3C2E] flex items-center justify-between bg-[#F3EEDC] dark:bg-[#18231A] rounded-b-xl ${className}`}>
    {children}
  </div>
)

export default Card
