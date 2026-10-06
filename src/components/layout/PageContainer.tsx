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
    <div className={`w-full px-5 py-5 lg:px-6 lg:py-6 min-w-0 flex-1 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-xl p-5 lg:p-6 relative overflow-hidden flex flex-col sm:flex-row justify-between mb-5 gap-4 items-start sm:items-center shadow-xs">
          <div className="relative z-10 flex flex-col justify-center">
            {title && (
              <h1 className="text-2xl lg:text-3xl font-semibold text-[#26352A] dark:text-[#F2F5ED] tracking-tight">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs lg:text-sm text-[#506052] dark:text-[#C2CCC0] mt-1.5 max-w-3xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="relative z-10 flex items-center gap-2.5 shrink-0 bg-[#FFFDF6] dark:bg-[#151F17] p-2 rounded-lg border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs">
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
