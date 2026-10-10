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
          className={`bg-gradient-to-r from-[#F0FDF4]/95 via-white/95 to-white/90 dark:from-[#0E291C]/95 dark:via-[#122C1F]/90 dark:to-[#0E2419]/80 backdrop-blur-md border border-[#86EFAC]/75 dark:border-[#86EFAC]/30 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center shadow-[0_10px_30px_rgba(16,80,55,0.08),0_2px_8px_rgba(16,80,55,0.04)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] transition-colors ${
            compact ? 'p-3.5 sm:p-4 mb-3.5' : 'p-5 lg:p-6 mb-4.5'
          }`}
        >
          <div className="relative z-10 flex flex-col justify-center">
            {title && (
              <h1
                className={`font-black text-[#064E3B] dark:text-[#F0FDF4] tracking-tight ${
                  compact ? 'text-lg sm:text-xl' : 'text-2xl lg:text-3xl'
                }`}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p
                className={`text-[#375243] dark:text-[#A7F3D0] max-w-3xl leading-relaxed font-medium ${
                  compact ? 'text-xs mt-0.5' : 'text-xs lg:text-sm mt-1'
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div
              className={`relative z-10 flex items-center gap-2 shrink-0 bg-[#F4FAF5]/90 dark:bg-[#0E2419]/90 rounded-xl border border-[#86EFAC]/60 dark:border-[#86EFAC]/25 shadow-2xs backdrop-blur-sm ${
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
