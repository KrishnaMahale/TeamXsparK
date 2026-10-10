import React from 'react'
import { SolarRooftopVillaSvg } from './assets/SolarRooftopIcon'

export interface NetworkLegendProps {
  showViolations?: boolean
}

export const NetworkLegend: React.FC<NetworkLegendProps> = ({ showViolations = false }) => {
  if (showViolations) {
    return (
      <div className="flex flex-wrap items-center gap-3.5 text-[11px] text-[#52665A] dark:text-[#A7F3D0] bg-white/95 dark:bg-[#122C1F]/95 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/20 px-3.5 py-1.5 rounded-full shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span>Normal (&lt; 1.05 pu)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Warning (85-100% Load)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600" />
          <span>Violation (&gt; 1.05 pu)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-500 font-bold">➔</span>
          <span>Solar Gen Flow</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sky-500 font-bold">➔</span>
          <span>Load Demand Flow</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#047857] dark:bg-[#86EFAC]" />
          <span>Feeder</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-t border-dashed border-[#788477]" />
          <span>Tie-Line (F-03)</span>
        </div>
      </div>
    )
  }

  // Design & Configuration Mode Legend (Zero violations shown per requirement 6)
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#52665A] dark:text-[#A7F3D0] bg-white/95 dark:bg-[#122C1F]/95 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/20 px-3.5 py-1.5 rounded-full shadow-xs">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm bg-slate-600 dark:bg-slate-400" />
        <span className="font-medium">Substation</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#10B981]" />
        <span className="font-medium">Bus Node</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-0.5 bg-[#047857] dark:bg-[#86EFAC]" />
        <span className="font-medium">Feeder Conductor</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-0.5 border-t border-dashed border-[#788477]" />
        <span className="font-medium">Tie-Line Switch</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-emerald-500 font-bold">➔</span>
        <span className="font-medium">Solar Gen</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sky-500 font-bold">➔</span>
        <span className="font-medium">Load Demand</span>
      </div>
      <div className="flex items-center gap-1.5">
        <SolarRooftopVillaSvg className="w-3.5 h-3.5" />
        <span className="font-medium">Solarrooftop</span>
      </div>
    </div>
  )
}

export default NetworkLegend
