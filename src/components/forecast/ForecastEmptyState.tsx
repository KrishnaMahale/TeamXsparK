import React from 'react'
import { Card, CardContent } from '../ui/Card'
import { Calendar, SlidersHorizontal, Zap, ArrowDown, Activity } from 'lucide-react'

export const ForecastEmptyState: React.FC = () => {
  return (
    <Card className="border-[#DDD9C9] dark:border-[#2C3C2E] border-dashed">
      <CardContent className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] flex items-center justify-center shadow-xs">
          <Calendar className="w-6 h-6 text-[#A0C878]" />
        </div>

        <div className="space-y-1 max-w-md">
          <h3 className="text-base font-bold text-[#26352A] dark:text-[#F2F5ED] tracking-tight">
            Ready for a Day-Ahead Simulation
          </h3>
          <p className="text-xs text-[#506052] dark:text-[#C2CCC0] leading-relaxed">
            Select a grid configuration and future date above to generate the expected 24-hour solar generation and consumer load demand profile.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-[#788477] dark:text-[#859483]">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A0C878]" />
            <span>Random Forest Lookahead Engine</span>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B09B29]" />
            <span>24-Hour Horizon</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default ForecastEmptyState
