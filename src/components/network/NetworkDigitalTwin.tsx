import React from 'react'
import { Network2D } from './Network2D'
import { Network3D } from './Network3D'
import { NetworkLegend } from './NetworkLegend'
import { useUIStore } from '../../store/uiStore'
import { useGridStore } from '../../store/gridStore'
import { Cpu, Box } from 'lucide-react'
import { Button } from '../ui/Button'

export const NetworkDigitalTwin: React.FC = () => {
  const { is3DEnabled, toggle3D } = useUIStore()
  const { network } = useGridStore()

  const isCustomGrid = network.id !== 'default-grid'

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Top Banner inside Digital Twin View */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Topology Model: {network.name || '11kV Radial Distribution Feeder'}
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            ({network.buses.length} Buses • {network.feeders.length} Feeders)
          </span>
        </div>
        <NetworkLegend />
      </div>

      {/* Custom Grid Notification in 2D mode */}
      {isCustomGrid && !is3DEnabled && (
        <div className="flex items-center justify-between p-2.5 px-3 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Box className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Active model <strong className="font-semibold">{network.name}</strong> ({network.buses.length} buses). Switch to 3D Isometric View to interactively layout, move, and connect equipment.
            </span>
          </div>
          <Button size="sm" variant="secondary" onClick={toggle3D} className="shrink-0 text-xs py-1 px-3">
            Open 3D View
          </Button>
        </div>
      )}

      {/* Main View Container */}
      <div className="w-full relative min-h-0 flex-1">
        {is3DEnabled ? <Network3D /> : <Network2D />}
      </div>
    </div>
  )
}
