import React from 'react'
import { Network2D } from './Network2D'
import { Network3D } from './Network3D'
import { NetworkLegend } from './NetworkLegend'
import { GridSideLegendInfo } from './GridSideLegendInfo'
import { useUIStore } from '../../store/uiStore'
import { useGridStore } from '../../store/gridStore'
import { Cpu, Box, Layers, Lock } from 'lucide-react'
import { Button } from '../ui/Button'

export interface NetworkDigitalTwinProps {
  readOnly?: boolean
  heightClassName?: string
  showSidebar?: boolean
  headerRightExtra?: React.ReactNode
  controllerSlot?: React.ReactNode
}

export const NetworkDigitalTwin = React.memo<NetworkDigitalTwinProps>(({
  readOnly = false,
  heightClassName,
  showSidebar,
  headerRightExtra,
  controllerSlot,
}) => {
  const { is3DEnabled, toggle3D } = useUIStore()
  const { network } = useGridStore()

  const isCustomGrid = network.id !== 'default-grid'
  const hasSideLegend = showSidebar !== undefined ? showSidebar : readOnly

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Top Banner inside Digital Twin View */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-[#047857] dark:text-[#86EFAC] shrink-0" />
            <span className="text-sm sm:text-base font-extrabold text-[#10251A] dark:text-[#ECFDF3] uppercase tracking-wider">
              {readOnly ? 'Active Simulation Grid:' : 'Topology Model:'} {network.name || '11kV Radial Distribution Feeder'}
            </span>
            {/* If not readOnly, retain standard topology badge */}
            {!readOnly && (
              <span className="text-[11px] font-mono text-[#52665A] dark:text-[#A7F3D0]">
                ({network.buses.length} Buses • {network.feeders.length} Feeders)
              </span>
            )}
          </div>
          {/* Top horizontal legend only when sidebar is NOT shown */}
          {!hasSideLegend && <NetworkLegend showViolations={readOnly} />}
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {headerRightExtra}

          {/* 2D / 3D Mode Toggle Button */}
          <button
            type="button"
            onClick={toggle3D}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors shadow-xs cursor-pointer ${
              is3DEnabled
                ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/60 text-[#047857] dark:text-[#86EFAC] border-[#047857] dark:border-[#86EFAC] hover:bg-[#D1FAE5]'
                : 'bg-white/95 dark:bg-[#122C1F]/90 text-[#52665A] dark:text-[#A7F3D0] border-[#BBF7D0]/70 dark:border-[#86EFAC]/20 hover:bg-[#ECFDF3]/50'
            }`}
            title={is3DEnabled ? 'Switch to 2D Schematic' : 'Switch to 3D Isometric View'}
          >
            {is3DEnabled ? <Box className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            <span>{is3DEnabled ? '3D Isometric View' : '2D Schematic'}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Simulation Controller (Below Active Simulation Heading and Above Grid Simulation) */}
      {controllerSlot && <div className="w-full">{controllerSlot}</div>}

      {/* Custom Grid Notification in 2D mode (Only when interactive/editing) */}
      {!readOnly && isCustomGrid && !is3DEnabled && (
        <div className="flex items-center justify-between p-2.5 px-3 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
            <Box className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Active model <strong className="font-semibold">{network.name}</strong> ({network.buses.length} buses). Click and drag components in 2D or 3D to layout equipment with live position synchronization.
            </span>
          </div>
          <Button size="sm" variant="secondary" onClick={toggle3D} className="shrink-0 text-xs py-1 px-3">
            Open 3D View
          </Button>
        </div>
      )}

      {/* Main View Container */}
      {hasSideLegend ? (
        <div className="flex flex-col lg:flex-row gap-3.5 items-stretch min-h-0 flex-1">
          {/* Shortened Grid Canvas on Left */}
          <div className="flex-1 min-w-0 relative rounded-xl overflow-hidden border border-[#DDD9C9] dark:border-[#2C3C2E]">
            {is3DEnabled ? (
              <Network3D readOnly={readOnly} heightClassName={heightClassName} />
            ) : (
              <Network2D readOnly={readOnly} heightClassName={heightClassName} />
            )}
          </div>

          {/* Right Space: Grid Map Legend + Important Grid Info */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col justify-between">
            <GridSideLegendInfo />
          </div>
        </div>
      ) : (
        <div className="w-full relative min-h-0 flex-1">
          {is3DEnabled ? (
            <Network3D readOnly={readOnly} heightClassName={heightClassName} />
          ) : (
            <Network2D readOnly={readOnly} heightClassName={heightClassName} />
          )}
        </div>
      )}
    </div>
  )
})

export default NetworkDigitalTwin
