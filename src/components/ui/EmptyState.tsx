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
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed ${
        isSuccess
          ? 'border-emerald-500/30 bg-emerald-950/10'
          : 'border-slate-800 bg-slate-900/30'
      } ${className}`}
    >
      <div
        className={`p-3 rounded-full mb-3 ${
          isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
        }`}
      >
        {icon || (isSuccess ? <ShieldCheck className="w-8 h-8" /> : <Info className="w-8 h-8" />)}
      </div>
      <h4
        className={`text-sm font-semibold tracking-wide ${
          isSuccess ? 'text-emerald-300' : 'text-slate-200'
        }`}
      >
        {title}
      </h4>
      {description && <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
