import React from 'react'
import { useRouteError, useNavigate } from 'react-router-dom'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '../ui/Button'

export const RouteError: React.FC = () => {
  const error = useRouteError() as any
  const navigate = useNavigate()

  const errorMessage = error?.statusText || error?.message || 'An unexpected error occurred while loading this page.'

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-[#E2F3E7] via-[#D9F1E2] to-[#E8F6EE] dark:from-[#081C14] dark:via-[#0D241A] dark:to-[#071911]">
      <div className="max-w-md w-full bg-white/95 dark:bg-[#122C1F]/95 backdrop-blur-xl border border-[#BBF7D0]/80 dark:border-[#86EFAC]/25 rounded-3xl p-6 text-center shadow-[0_20px_50px_rgba(16,80,55,0.12)]">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#10251A] dark:text-[#ECFDF3] mb-1">
          Page Navigation Notice
        </h2>
        <p className="text-xs text-[#52665A] dark:text-[#A7F3D0] mb-5 leading-relaxed font-mono bg-[#F7FCF9] dark:bg-[#064E3B]/40 p-3 rounded-xl border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20">
          {errorMessage}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw className="w-4 h-4" />}
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Home className="w-4 h-4" />}
            onClick={() => navigate('/home')}
          >
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  )
}

export default RouteError
