import React from 'react'
import { Network2D } from './Network2D'
import { Network3D } from './Network3D'
import { NetworkLegend } from './NetworkLegend'
import { useUIStore } from '../../store/uiStore'
import { useGridStore } from '../../store/gridStore'
import { Cpu } from 'lucide-react'

export const NetworkDigitalTwin: React.FC = () => {
  const { is3DEnabled } = useUIStore()
  const { network } = useGridStore()

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Top Banner inside Digital Twin View */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Topology Model: 11kV Radial Distribution Feeder
          </span>
          <span className="text-[11px] font-mono text-slate-500">({network.buses.length} Buses • {network.feeders.length} Feeders)</span>
        </div>
        <NetworkLegend />
      </div>

      {/* Main View Container */}
      <div className="w-full relative min-h-0 flex-1">
        {is3DEnabled ? <Network3D /> : <Network2D />}
      </div>
    </div>
  )
}
