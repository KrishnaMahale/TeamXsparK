import React from 'react'

export const NetworkLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-3.5 text-[11px] text-[#506052] dark:text-[#A0B0A2] bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2A3A2C] px-3 py-1.5 rounded-lg shadow-xs">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#A0C878]" />
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
        <span className="w-3 h-0.5 bg-[#A0C878]" />
        <span>Feeder</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-0.5 border-t border-dashed border-[#788477]" />
        <span>Tie-Line (F-03)</span>
      </div>
    </div>
  )
}
