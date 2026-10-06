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
      className={`p-1.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2 transition-colors ${className}`}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1 text-[#788477] dark:text-[#859483] text-xs font-semibold uppercase tracking-wider shrink-0">
        <Cpu className="w-4 h-4 text-[#A0C878]" />
        <span>Grid Model:</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 flex-1">
        {/* Option 1: Industrial Centralized Grid */}
        <button
          onClick={() => setGridType('industrial')}
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border text-left ${
            gridType === 'industrial'
              ? 'bg-[#DDEB9D] dark:bg-[#2D3E2F] text-[#26352A] dark:text-[#F2F5ED] border-[#A0C878] shadow-xs'
              : 'bg-[#FFFDF6] dark:bg-[#151F17] text-[#506052] dark:text-[#C2CCC0] border-[#DDD9C9] dark:border-[#2C3C2E] hover:bg-[#DDEB9D]/40'
          }`}
        >
          <div
            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
              gridType === 'industrial'
                ? 'bg-[#A0C878] text-[#26352A]'
                : 'bg-[#DDD9C9] dark:bg-[#2C3C2E] text-[#506052] dark:text-[#C2CCC0]'
            }`}
          >
            <Factory className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold">Industrial Grid</div>
            <div className="text-[10px] text-[#788477] dark:text-[#859483] truncate">
              11 kV Concentrated Substation
            </div>
          </div>
        </button>

        {/* Option 2: Domestic Rooftop Solar Grid */}
        <button
          onClick={() => setGridType('domestic')}
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border text-left ${
            gridType === 'domestic'
              ? 'bg-[#DDEB9D] dark:bg-[#2D3E2F] text-[#26352A] dark:text-[#F2F5ED] border-[#A0C878] shadow-xs'
              : 'bg-[#FFFDF6] dark:bg-[#151F17] text-[#506052] dark:text-[#C2CCC0] border-[#DDD9C9] dark:border-[#2C3C2E] hover:bg-[#DDEB9D]/40'
          }`}
        >
          <div
            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
              gridType === 'domestic'
                ? 'bg-[#A0C878] text-[#26352A]'
                : 'bg-[#DDD9C9] dark:bg-[#2C3C2E] text-[#506052] dark:text-[#C2CCC0]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold">Domestic Rooftop Solar</div>
            <div className="text-[10px] text-[#788477] dark:text-[#859483] truncate">
              230V LV Residential Feeder
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

export default GridTypeSwitcher
