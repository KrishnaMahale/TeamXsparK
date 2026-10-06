import React from 'react'
import { ShieldCheck, Info } from 'lucide-react'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  variant?: 'neutral' | 'success'
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  variant = 'neutral',
  className = '',
}) => {
  const isSuccess = variant === 'success'

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed transition-colors ${
        isSuccess
          ? 'border-[#A0C878] bg-[#DDEB9D]/30 dark:bg-[#2D3E2F]/40'
          : 'border-[#DDD9C9] dark:border-[#2C3C2E] bg-[#FAF6E9] dark:bg-[#1E2B20]'
      } ${className}`}
    >
      <div
        className={`p-3 rounded-lg mb-3 ${
          isSuccess
            ? 'bg-[#DDEB9D] dark:bg-[#2D3E2F] text-[#26352A] dark:text-[#A0C878]'
            : 'bg-[#F3EEDC] dark:bg-[#263629] text-[#506052] dark:text-[#C2CCC0]'
        }`}
      >
        {icon || (isSuccess ? <ShieldCheck className="w-7 h-7" /> : <Info className="w-7 h-7" />)}
      </div>
      <h4
        className={`text-sm font-bold tracking-wide ${
          isSuccess ? 'text-[#26352A] dark:text-[#F2F5ED]' : 'text-[#26352A] dark:text-[#F2F5ED]'
        }`}
      >
        {title}
      </h4>
      {description && (
        <p className="text-xs text-[#788477] dark:text-[#859483] mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export default EmptyState
