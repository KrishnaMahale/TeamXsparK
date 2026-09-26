import React from 'react'
import { Factory, Home, Zap, Sun, ShieldAlert, Cpu } from 'lucide-react'
import { useDomesticStore } from '../../store/domesticStore'
import { GridType } from '../../types/domestic'

interface GridTypeSwitcherProps {
  className?: string
}

export const GridTypeSwitcher: React.FC<GridTypeSwitcherProps> = ({ className = '' }) => {
  const { gridType, setGridType } = useDomesticStore()

  return (
    <div
      className={`p-1.5 rounded-xl bg-[#0B132B] border border-[#1E293B] shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${className}`}
    >
      <div className="flex items-center gap-2 px-3 py-1 text-slate-400 text-xs font-semibold uppercase tracking-wider shrink-0">
        <Cpu className="w-4 h-4 text-blue-400" />
        <span>Grid Simulation Model:</span>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1">
        {/* Option 1: Industrial Centralized Grid */}
        <button
          onClick={() => setGridType('industrial')}
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${
            gridType === 'industrial'
              ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/40 ring-1 ring-blue-400'
              : 'bg-[#111C35] text-slate-300 border-[#1E293B] hover:text-white hover:bg-[#16223F]'
          }`}
        >
          <Factory className={`w-4 h-4 ${gridType === 'industrial' ? 'text-white' : 'text-blue-400'}`} />
          <div className="text-left min-w-0">
            <div className="truncate">Industrial Centralized Grid</div>
            <div
              className={`text-[10px] font-normal truncate ${
                gridType === 'industrial' ? 'text-blue-100' : 'text-slate-400'
              }`}
            >
              11 kV • Concentrated Solar Farm & Substation
            </div>
          </div>
        </button>

        {/* Option 2: Domestic Rooftop Solar Grid */}
        <button
          onClick={() => setGridType('domestic')}
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${
            gridType === 'domestic'
              ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-900/40 ring-1 ring-amber-400'
              : 'bg-[#111C35] text-slate-300 border-[#1E293B] hover:text-white hover:bg-[#16223F]'
          }`}
        >
          <Home className={`w-4 h-4 ${gridType === 'domestic' ? 'text-white' : 'text-amber-400'}`} />
          <div className="text-left min-w-0">
            <div className="truncate">Domestic Rooftop Solar Grid</div>
            <div
              className={`text-[10px] font-normal truncate ${
                gridType === 'domestic' ? 'text-amber-100' : 'text-slate-400'
              }`}
            >
              230V LV • Multiple Rooftop Solar Homes & Street TX
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
