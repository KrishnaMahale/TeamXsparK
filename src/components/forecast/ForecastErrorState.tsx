import React from 'react'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface ForecastErrorStateProps {
  message?: string
  onRetry: () => void
}

export const ForecastErrorState: React.FC<ForecastErrorStateProps> = ({
  message = 'Unable to generate the forecast for this configuration. Please try again.',
  onRetry,
}) => {
  return (
    <Card className="border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20">
      <CardContent className="py-8 px-6 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 flex items-center justify-center shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>

        <div className="space-y-1 max-w-md">
          <h3 className="text-sm font-bold text-red-800 dark:text-red-300 tracking-tight">
            Forecast Generation Failed
          </h3>
          <p className="text-xs text-red-700/80 dark:text-red-400/80 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="pt-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={onRetry}
          >
            Retry Generation
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ForecastErrorState
