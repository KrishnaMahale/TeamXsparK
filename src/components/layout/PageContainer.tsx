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
    <div className={`p-4 lg:p-6 max-w-[1800px] mx-auto w-full ${className}`}>
      {(title || subtitle || actions) && (
        <div className="bg-[#DCE7DD] dark:bg-[#1A332C] rounded-[24px] p-6 lg:p-8 relative overflow-hidden flex flex-col sm:flex-row justify-between min-h-[180px] shadow-sm mb-6 gap-6 items-start">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-20 dark:opacity-10 pointer-events-none">
            <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-r from-emerald-200 to-transparent blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col justify-center h-full mt-2">
            {title && (
              <h1 className="text-3xl lg:text-4xl font-light text-[#14532D] dark:text-[#ECFDF5] tracking-wide uppercase">
                {title}
              </h1>
            )}
            {subtitle && <p className="text-sm text-[#365A4D] dark:text-[#A7C4B8] mt-3 max-w-2xl leading-relaxed">{subtitle}</p>}
          </div>

          {actions && (
            <div className="relative z-10 flex items-center gap-3 shrink-0 bg-white/40 dark:bg-black/20 backdrop-blur-sm p-3 rounded-2xl border border-white/40 dark:border-white/5">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
