import React from 'react'

export const NetworkLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 bg-slate-950/70 border border-slate-800/80 px-3 py-1.5 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        <span>Normal (&lt; 1.05 pu)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        <span>Warning (90-100% Load)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
        <span>Violation (&gt; 1.05 pu / Overloaded)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-0.5 bg-cyan-400" />
        <span>Energized Feeder</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-0.5 border-t border-dashed border-slate-600" />
        <span>Open Tie-Line (F-03)</span>
      </div>
    </div>
  )
}
