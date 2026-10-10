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
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed transition-colors backdrop-blur-md ${
        isSuccess
          ? 'border-[#86EFAC] bg-[#ECFDF3]/80 dark:bg-[#132F21]/80'
          : 'border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/80 dark:bg-[#122C1F]/80'
      } ${className}`}
    >
      <div
        className={`p-3 rounded-xl mb-3 ${
          isSuccess
            ? 'bg-[#86EFAC]/30 dark:bg-[#163826] text-[#047857] dark:text-[#86EFAC]'
            : 'bg-[#F4FAF5] dark:bg-[#0E2419] text-[#425B4C] dark:text-[#A7F3D0]'
        }`}
      >
        {icon || (isSuccess ? <ShieldCheck className="w-7 h-7" /> : <Info className="w-7 h-7" />)}
      </div>
      <h4 className="text-sm font-bold tracking-wide text-[#10251A] dark:text-white">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] mt-1 max-w-sm font-medium">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export default EmptyState
