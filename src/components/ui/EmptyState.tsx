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
          ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20'
          : 'border-slate-300 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40'
      } ${className}`}
    >
      <div
        className={`p-3 rounded-full mb-3 ${
          isSuccess
            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        }`}
      >
        {icon || (isSuccess ? <ShieldCheck className="w-7 h-7" /> : <Info className="w-7 h-7" />)}
      </div>
      <h4
        className={`text-sm font-semibold tracking-wide ${
          isSuccess ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'
        }`}
      >
        {title}
      </h4>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
