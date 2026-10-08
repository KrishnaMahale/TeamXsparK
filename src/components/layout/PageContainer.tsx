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
          className={`bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-xl relative overflow-hidden flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center shadow-xs ${
            compact ? 'p-3 sm:p-4 mb-3.5' : 'p-5 lg:p-6 mb-5'
          }`}
        >
          <div className="relative z-10 flex flex-col justify-center">
            {title && (
              <h1
                className={`font-bold text-[#26352A] dark:text-[#F2F5ED] tracking-tight ${
                  compact ? 'text-lg sm:text-xl' : 'text-2xl lg:text-3xl font-semibold'
                }`}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p
                className={`text-[#506052] dark:text-[#C2CCC0] max-w-3xl leading-relaxed ${
                  compact ? 'text-xs mt-0.5' : 'text-xs lg:text-sm mt-1.5'
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div
              className={`relative z-10 flex items-center gap-2 shrink-0 bg-[#FFFDF6] dark:bg-[#151F17] rounded-lg border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs ${
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
