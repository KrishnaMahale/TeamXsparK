import React from 'react'
import { GridNetwork } from '../../types/network'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import {
  SlidersHorizontal,
  Calendar,
  Layers,
  Zap,
  BatteryMedium,
  Building,
  RotateCcw,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react'

interface ForecastSimulationControlsProps {
  grids: GridNetwork[]
  selectedGridId: string
  onSelectGrid: (gridId: string) => void
  selectedDate: string
  onSelectDate: (date: string) => void
  onSimulate: () => void
  onReset?: () => void
  isLoading: boolean
  isSimulated: boolean
}

export const ForecastSimulationControls: React.FC<ForecastSimulationControlsProps> = ({
  grids,
  selectedGridId,
  onSelectGrid,
  selectedDate,
  onSelectDate,
  onSimulate,
  onReset,
  isLoading,
  isSimulated,
}) => {
  const selectedGrid = grids.find((g) => g.id === selectedGridId) || grids[0]

  // Extract component statistics from selected grid
  const totalSolarKw = selectedGrid
    ? selectedGrid.solarUnits.reduce((acc, s) => acc + (s.capacityKw || 0), 0)
    : 0
  const totalBatteryKwh = selectedGrid
    ? selectedGrid.batteries.reduce((acc, b) => acc + (b.capacityKwh || 0), 0)
    : 0
  const totalLoadKw = selectedGrid
    ? selectedGrid.loads.reduce((acc, l) => acc + (l.powerKw || 0), 0)
    : 0
  const busCount = selectedGrid?.buses.length || 0
  const feederCount = selectedGrid?.feeders.length || 0
  const solarCount = selectedGrid?.solarUnits.length || 0
  const batteryCount = selectedGrid?.batteries.length || 0
  const loadCount = selectedGrid?.loads.length || 0
  const txKva = selectedGrid?.substation?.ratingKva || 500

  // Minimum allowed date (today)
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md shadow-[0_8px_25px_rgba(16,80,55,0.06)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.3)] transition-all duration-300 overflow-hidden">
      <CardHeader
        title="Day-Ahead Simulation"
        subtitle="Select a grid configuration and future date to generate the expected 24-hour operating profile."
        icon={<SlidersHorizontal className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
        action={
          isSimulated && onReset ? (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={onReset}
              disabled={isLoading}
              className="font-bold shadow-xs hover:border-[#047857] transition-all"
            >
              Change Parameters
            </Button>
          ) : null
        }
      />

      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* 1. Grid Configuration Selector (7 Cols) */}
          <div className="md:col-span-7 space-y-2">
            <label
              htmlFor="forecast-grid-select"
              className="block text-xs font-bold uppercase tracking-wider text-[#10251A] dark:text-white"
            >
              Grid Configuration
            </label>
            <div className="relative">
              <select
                id="forecast-grid-select"
                value={selectedGridId}
                onChange={(e) => onSelectGrid(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 px-3.5 pr-9 text-xs sm:text-sm font-semibold rounded-xl border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/80 dark:bg-[#0E2419]/90 text-[#10251A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#10B981]/40 focus:border-[#047857] dark:focus:border-[#86EFAC] cursor-pointer disabled:opacity-60 transition-all shadow-2xs"
              >
                {grids.map((grid) => (
                  <option key={grid.id} value={grid.id} className="bg-white dark:bg-[#0E2419] text-[#10251A] dark:text-white">
                    {grid.name} ({grid.id})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#425B4C] dark:text-[#A7F3D0]">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            {/* Selected Grid Information Preview */}
            {selectedGrid && (
              <div className="mt-3 p-3.5 rounded-xl bg-[#F4FAF5]/90 dark:bg-[#0E2419]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 text-xs space-y-2 shadow-2xs transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#10251A] dark:text-white flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC]" />
                    <span>{selectedGrid.name}</span>
                  </span>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-white dark:bg-[#122C1F] border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 text-[#425B4C] dark:text-[#A7F3D0]">
                    {selectedGrid.gridConnectionStatus === 'connected' ? 'Grid-Connected (33/11 kV)' : 'Islanded Microgrid'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-[#BBF7D0]/40 dark:border-[#86EFAC]/15 text-[11px]">
                  <div>
                    <span className="text-[#6B8274] dark:text-[#6EE7B7] block text-[10px] uppercase font-bold tracking-wider">Topology</span>
                    <span className="font-mono font-semibold text-[#10251A] dark:text-white">
                      {busCount} Buses · {feederCount} Feeders
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B8274] dark:text-[#6EE7B7] block text-[10px] uppercase font-bold tracking-wider">Distributed Assets</span>
                    <span className="font-mono font-semibold text-[#10251A] dark:text-white">
                      {solarCount} PV · {batteryCount} BESS · {loadCount} Loads
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B8274] dark:text-[#6EE7B7] block text-[10px] uppercase font-bold tracking-wider">Capacity Rating</span>
                    <span className="font-mono font-semibold text-[#10251A] dark:text-white">
                      {totalSolarKw} kW PV · {totalBatteryKwh} kWh
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Simulation Date Selector (5 Cols) */}
          <div className="md:col-span-5 space-y-2">
            <label
              htmlFor="forecast-date-input"
              className="block text-xs font-bold uppercase tracking-wider text-[#10251A] dark:text-white"
            >
              Simulation Date
            </label>
            <div className="relative">
              <input
                id="forecast-date-input"
                type="date"
                value={selectedDate}
                min={todayStr}
                onChange={(e) => onSelectDate(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 px-3.5 pr-10 text-xs sm:text-sm font-semibold rounded-xl border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/80 dark:bg-[#0E2419]/90 text-[#10251A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#10B981]/40 focus:border-[#047857] dark:focus:border-[#86EFAC] disabled:opacity-60 transition-all shadow-2xs"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#425B4C] dark:text-[#A7F3D0]">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0] flex items-center gap-1 font-medium">
              <Info className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC] shrink-0" />
              <span>Select the day you want the model to forecast.</span>
            </p>

            {/* Primary Action Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={onSimulate}
                disabled={isLoading || !selectedGridId || !selectedDate}
                className="w-full h-11 justify-center text-sm font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}
              >
                {isLoading ? 'Generating day-ahead forecast...' : 'Simulate Day'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ForecastSimulationControls
