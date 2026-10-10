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
    <Card className="border-red-300/60 dark:border-red-800/40 bg-red-50/70 dark:bg-red-950/30 backdrop-blur-md shadow-[0_8px_25px_rgba(220,38,38,0.06)] animate-in fade-in duration-300">
      <CardContent className="py-8 px-6 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/40 border border-red-300/80 dark:border-red-700/60 flex items-center justify-center shadow-xs">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>

        <div className="space-y-1 max-w-md">
          <h3 className="text-base font-extrabold text-red-900 dark:text-red-200 tracking-tight">
            Forecast Generation Failed
          </h3>
          <p className="text-xs text-red-700/90 dark:text-red-300/80 leading-relaxed font-medium">
            {message}
          </p>
        </div>

        <div className="pt-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={onRetry}
            className="font-bold shadow-xs hover:border-red-500 transition-all"
          >
            Retry Generation
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ForecastErrorState
