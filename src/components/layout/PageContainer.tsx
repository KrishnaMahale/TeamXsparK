import React from 'react'

export interface PageContainerProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  actions,
  className = '',
}) => {
  return (
    <div className={`p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto w-full ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
          <div>
            {title && (
              <h1 className="text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2.5">
                {title}
              </h1>
            )}
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
