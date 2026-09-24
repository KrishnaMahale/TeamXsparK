import React from 'react'

export interface StatusIndicatorProps {
  status: 'online' | 'warning' | 'critical' | 'offline'
  label?: string
  className?: string
  pulse?: boolean
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  className = '',
  pulse = true,
}) => {
  const statusColors = {
    online: 'bg-emerald-400 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    warning: 'bg-amber-400 text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    critical: 'bg-rose-500 text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]',
    offline: 'bg-slate-500 text-slate-500',
  }

  const textColors = {
    online: 'text-emerald-400',
    warning: 'text-amber-400',
    critical: 'text-rose-400 font-semibold',
    offline: 'text-slate-400',
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        {pulse && status !== 'offline' && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              status === 'critical'
                ? 'bg-rose-400'
                : status === 'warning'
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusColors[status]}`} />
      </span>
      {label && <span className={`text-xs tracking-wide uppercase ${textColors[status]}`}>{label}</span>}
    </div>
  )
}
