import React from 'react'
import { useRouteError, useNavigate } from 'react-router-dom'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '../ui/Button'

export const RouteError: React.FC = () => {
  const error = useRouteError() as any
  const navigate = useNavigate()

  const errorMessage = error?.statusText || error?.message || 'An unexpected error occurred while loading this page.'

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-[#FFFDF6] dark:bg-[#151F17]">
      <div className="max-w-md w-full bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-2xl p-6 text-center shadow-lg">
        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#26352A] dark:text-[#F2F5ED] mb-1">
          Page Navigation Notice
        </h2>
        <p className="text-xs text-[#506052] dark:text-[#C2CCC0] mb-4 leading-relaxed font-mono bg-[#FFFDF6] dark:bg-[#151F17] p-3 rounded-lg border border-[#DDD9C9] dark:border-[#2C3C2E]">
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
