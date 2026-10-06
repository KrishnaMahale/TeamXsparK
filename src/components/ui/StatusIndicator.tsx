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
  pulse = false,
}) => {
  const statusColors = {
    online: 'bg-[#A0C878]',
    warning: 'bg-amber-500',
    critical: 'bg-red-600',
    offline: 'bg-[#788477]',
  }

  const textColors = {
    online: 'text-[#26352A] dark:text-[#A0C878] font-semibold',
    warning: 'text-amber-700 dark:text-amber-400 font-semibold',
    critical: 'text-red-700 dark:text-red-400 font-bold',
    offline: 'text-[#788477] dark:text-[#859483]',
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2 w-2">
        {pulse && status !== 'offline' && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${
              status === 'critical'
                ? 'bg-red-500'
                : status === 'warning'
                ? 'bg-amber-400'
                : 'bg-[#A0C878]'
            }`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColors[status]}`} />
      </span>
      {label && <span className={`text-xs tracking-wider uppercase ${textColors[status]}`}>{label}</span>}
    </div>
  )
}

export default StatusIndicator
