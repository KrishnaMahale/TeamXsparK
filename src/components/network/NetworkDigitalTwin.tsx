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
}

export const NetworkDigitalTwin: React.FC<NetworkDigitalTwinProps> = ({
  readOnly = false,
  heightClassName,
  showSidebar,
  headerRightExtra,
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
            <Cpu className="w-4 h-4 text-[#A0C878] shrink-0" />
            <span className="text-xs font-semibold text-[#26352A] dark:text-[#F2F5ED] uppercase tracking-wider">
              {readOnly ? 'Active Simulation Grid:' : 'Topology Model:'} {network.name || '11kV Radial Distribution Feeder'}
            </span>
            {/* If not readOnly, retain standard topology badge */}
            {!readOnly && (
              <span className="text-[11px] font-mono text-[#788477] dark:text-[#859483]">
                ({network.buses.length} Buses • {network.feeders.length} Feeders)
              </span>
            )}
          </div>
          {/* Top horizontal legend only when sidebar is NOT shown */}
          {!hasSideLegend && <NetworkLegend />}
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {headerRightExtra}

          {/* 2D / 3D Mode Toggle Button */}
          <button
            type="button"
            onClick={toggle3D}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
              is3DEnabled
                ? 'bg-[#DDEB9D] dark:bg-[#2D3E2F] text-[#26352A] dark:text-[#F2F5ED] border-[#A0C878] hover:bg-[#cde088]'
                : 'bg-[#FAF6E9] dark:bg-[#1E2B20] text-[#506052] dark:text-[#C2CCC0] border-[#DDD9C9] dark:border-[#2C3C2E] hover:bg-[#DDEB9D]/30'
            }`}
            title={is3DEnabled ? 'Switch to 2D Schematic' : 'Switch to 3D Isometric View'}
          >
            {is3DEnabled ? <Box className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            <span>{is3DEnabled ? '3D Isometric View' : '2D Schematic'}</span>
          </button>
        </div>
      </div>

      {/* Custom Grid Notification in 2D mode (Only when interactive/editing) */}
      {!readOnly && isCustomGrid && !is3DEnabled && (
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
}

export default NetworkDigitalTwin
