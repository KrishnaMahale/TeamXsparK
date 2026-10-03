import React from 'react'
import { Factory, Home, Cpu } from 'lucide-react'
import { useDomesticStore } from '../../store/domesticStore'

interface GridTypeSwitcherProps {
  className?: string
}

export const GridTypeSwitcher: React.FC<GridTypeSwitcherProps> = ({ className = '' }) => {
  const { gridType, setGridType } = useDomesticStore()

  return (
    <div
      className={`p-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 transition-colors ${className}`}
    >
      <div className="flex items-center gap-2 px-3 py-1 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider shrink-0">
        <Cpu className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        <span>Grid Model:</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
        {/* Option 1: Industrial Centralized Grid */}
        <button
          onClick={() => setGridType('industrial')}
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border text-left ${
            gridType === 'industrial'
              ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-900 dark:text-sky-100 border-sky-400 dark:border-sky-500/80 shadow-xs ring-1 ring-sky-400/40'
              : 'bg-slate-50/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
              gridType === 'industrial'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Factory className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold">Industrial Centralized Grid</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              11 kV • Concentrated Solar Farm & Substation
            </div>
          </div>
        </button>

        {/* Option 2: Domestic Rooftop Solar Grid */}
        <button
          onClick={() => setGridType('domestic')}
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border text-left ${
            gridType === 'domestic'
              ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-950 dark:text-amber-100 border-amber-400 dark:border-amber-500/80 shadow-xs ring-1 ring-amber-400/40'
              : 'bg-slate-50/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
              gridType === 'domestic'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Home className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold">Domestic Rooftop Solar Grid</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              230V LV • Multiple Rooftop Solar Homes & Street TX
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
