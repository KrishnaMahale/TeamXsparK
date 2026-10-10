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
      <Loader2 className={`${sizeMap[size]} text-[#047857] dark:text-[#86EFAC] animate-spin mb-3`} />
      <p className="text-sm font-bold text-[#10251A] dark:text-white">{message}</p>
      {subMessage && <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] mt-1 max-w-sm font-medium">{subMessage}</p>}
    </div>
  )
}

export default LoadingState
