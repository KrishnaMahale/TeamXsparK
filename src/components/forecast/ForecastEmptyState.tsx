import React from 'react'
import { Card, CardContent } from '../ui/Card'
import { Calendar, SlidersHorizontal, Zap, ArrowDown, Activity } from 'lucide-react'

export const ForecastEmptyState: React.FC = () => {
  return (
    <Card className="border-[#BBF7D0]/80 dark:border-[#86EFAC]/30 border-dashed bg-white/75 dark:bg-[#122C1F]/60 backdrop-blur-md shadow-[0_8px_25px_rgba(16,80,55,0.04)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-300 flex-1 flex flex-col justify-center">
      <CardContent className="py-10 px-6 flex-1 flex flex-col items-center justify-center text-center space-y-3.5">
        <div className="w-14 h-14 rounded-2xl bg-[#ECFDF3] dark:bg-[#0E2419] border border-[#BBF7D0] dark:border-[#86EFAC]/30 flex items-center justify-center shadow-xs">
          <Calendar className="w-7 h-7 text-[#047857] dark:text-[#86EFAC]" />
        </div>

        <div className="space-y-1.5 max-w-md">
          <h3 className="text-base font-extrabold text-[#10251A] dark:text-white tracking-tight">
            Ready for a Day-Ahead Simulation
          </h3>
          <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] leading-relaxed font-medium">
            Select a grid configuration and future date above to generate the expected 24-hour solar generation and consumer load demand profile.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4FAF5] dark:bg-[#0E2419] border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 text-[#10251A] dark:text-white font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span>Random Forest Lookahead Engine</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4FAF5] dark:bg-[#0E2419] border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 text-[#425B4C] dark:text-[#A7F3D0] font-medium shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>24-Hour Horizon</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default ForecastEmptyState
