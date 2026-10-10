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
    default:
      'bg-white/92 dark:bg-[#122C1F]/92 backdrop-blur-md border border-[#86EFAC]/70 dark:border-[#86EFAC]/30 shadow-[0_4px_16px_rgba(16,80,55,0.05),0_1px_3px_rgba(16,80,55,0.03)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.3)] hover:border-[#4ADE80] hover:shadow-[0_8px_24px_rgba(16,80,55,0.08)]',
    highlight:
      'bg-[#ECFDF3]/90 dark:bg-[#163826]/90 backdrop-blur-md border border-[#4ADE80] dark:border-[#86EFAC]/70 shadow-[0_6px_20px_rgba(16,80,55,0.08)]',
    danger:
      'bg-red-50/80 dark:bg-red-950/35 backdrop-blur-md border border-red-300 dark:border-red-900/60 shadow-2xs',
    warning:
      'bg-amber-50/80 dark:bg-amber-950/35 backdrop-blur-md border border-amber-300 dark:border-amber-900/60 shadow-2xs',
    success:
      'bg-emerald-50/80 dark:bg-emerald-950/35 backdrop-blur-md border border-emerald-300 dark:border-emerald-800/60 shadow-2xs',
  }

  // Support backward compatible glowColor mapping
  let activeVariant = variant
  if (glowColor === 'rose') activeVariant = 'danger'
  else if (glowColor === 'amber') activeVariant = 'warning'
  else if (glowColor === 'emerald') activeVariant = 'success'
  else if (glowColor === 'blue') activeVariant = 'highlight'

  return (
    <div
      className={`rounded-2xl ${variantStyles[activeVariant]} transition-all duration-200 ${className}`}
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
  <div className={`p-4 sm:p-5 border-b border-[#A7F3D0]/60 dark:border-[#86EFAC]/22 flex items-center justify-between ${className}`}>
    <div className="flex items-center gap-2.5">
      {icon && <span className="text-[#047857] dark:text-[#86EFAC] shrink-0">{icon}</span>}
      <div>
        <h3 className="text-xs sm:text-sm font-bold text-[#10251A] dark:text-white tracking-wide uppercase flex items-center gap-2">
          {title}
        </h3>
        {subtitle && <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] mt-0.5">{subtitle}</p>}
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
  <div className={`p-4 sm:p-5 border-t border-[#BBF7D0]/60 dark:border-[#86EFAC]/18 flex items-center justify-between bg-[#F4FAF5]/80 dark:bg-[#0E2419]/80 rounded-b-2xl ${className}`}>
    {children}
  </div>
)

export default Card
