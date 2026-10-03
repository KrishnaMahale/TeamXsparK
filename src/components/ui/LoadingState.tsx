import React from 'react'
import { Loader2 } from 'lucide-react'

export interface LoadingStateProps {
  message?: string
  subMessage?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading grid telemetry...',
  subMessage,
  className = '',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <Loader2 className={`${sizeMap[size]} text-sky-600 dark:text-sky-400 animate-spin mb-3`} />
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{message}</p>
      {subMessage && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{subMessage}</p>}
    </div>
  )
}
