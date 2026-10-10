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
      className={`p-1.5 rounded-xl bg-white/90 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2 transition-colors ${className}`}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1 text-[#52665A] dark:text-[#A7F3D0] text-xs font-semibold uppercase tracking-wider shrink-0">
        <Cpu className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />
        <span>Grid Model:</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 flex-1">
        {/* Option 1: Industrial Centralized Grid */}
        <button
          onClick={() => setGridType('industrial')}
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border text-left cursor-pointer ${
            gridType === 'industrial'
              ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/60 text-[#047857] dark:text-[#86EFAC] border-[#047857] dark:border-[#86EFAC] shadow-xs'
              : 'bg-[#F7FCF9] dark:bg-[#163826]/60 text-[#52665A] dark:text-[#A7F3D0] border-[#BBF7D0]/50 dark:border-[#86EFAC]/15 hover:bg-[#ECFDF3]/50'
          }`}
        >
          <div
            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
              gridType === 'industrial'
                ? 'bg-[#047857] text-white dark:bg-[#86EFAC] dark:text-[#064E3B]'
                : 'bg-[#BBF7D0]/40 dark:bg-[#064E3B]/40 text-[#52665A] dark:text-[#A7F3D0]'
            }`}
          >
            <Factory className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold">Industrial Grid</div>
            <div className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] truncate">
              11 kV Concentrated Substation
            </div>
          </div>
        </button>

        {/* Option 2: Domestic Rooftop Solar Grid */}
        <button
          onClick={() => setGridType('domestic')}
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border text-left cursor-pointer ${
            gridType === 'domestic'
              ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/60 text-[#047857] dark:text-[#86EFAC] border-[#047857] dark:border-[#86EFAC] shadow-xs'
              : 'bg-[#F7FCF9] dark:bg-[#163826]/60 text-[#52665A] dark:text-[#A7F3D0] border-[#BBF7D0]/50 dark:border-[#86EFAC]/15 hover:bg-[#ECFDF3]/50'
          }`}
        >
          <div
            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
              gridType === 'domestic'
                ? 'bg-[#047857] text-white dark:bg-[#86EFAC] dark:text-[#064E3B]'
                : 'bg-[#BBF7D0]/40 dark:bg-[#064E3B]/40 text-[#52665A] dark:text-[#A7F3D0]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold">Domestic Rooftop Solar</div>
            <div className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] truncate">
              230V LV Residential Feeder
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

export default GridTypeSwitcher
