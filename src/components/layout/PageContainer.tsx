import React from 'react'

export interface PageContainerProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
  compact?: boolean
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  actions,
  className = '',
  compact = false,
}) => {
  return (
    <div className={`w-full ${compact ? 'px-4 py-4 lg:px-5 lg:py-5' : 'px-5 py-5 lg:px-6 lg:py-6'} min-w-0 flex-1 ${className}`}>
      {(title || subtitle || actions) && (
        <div
          className={`bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center shadow-[0_8px_25px_rgba(16,80,55,0.06)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.3)] transition-colors ${
            compact ? 'p-3.5 sm:p-4 mb-4' : 'p-5 lg:p-6 mb-5'
          }`}
        >
          <div className="relative z-10 flex flex-col justify-center">
            {title && (
              <h1
                className={`font-extrabold text-[#10251A] dark:text-white tracking-tight ${
                  compact ? 'text-lg sm:text-xl' : 'text-2xl lg:text-3xl'
                }`}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p
                className={`text-[#425B4C] dark:text-[#A7F3D0] max-w-3xl leading-relaxed font-medium ${
                  compact ? 'text-xs mt-0.5' : 'text-xs lg:text-sm mt-1.5'
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div
              className={`relative z-10 flex items-center gap-2 shrink-0 bg-[#F4FAF5] dark:bg-[#0E2419] rounded-xl border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs ${
                compact ? 'p-1.5' : 'p-2'
              }`}
            >
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

export default PageContainer
