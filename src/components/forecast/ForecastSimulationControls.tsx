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
    <Card className="border-[#DDD9C9] dark:border-[#2C3C2E] overflow-hidden">
      <CardHeader
        title="Day-Ahead Simulation"
        subtitle="Select a grid configuration and future date to generate the expected 24-hour operating profile."
        icon={<SlidersHorizontal className="w-4 h-4 text-[#A0C878]" />}
        action={
          isSimulated && onReset ? (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={onReset}
              disabled={isLoading}
            >
              Change Parameters
            </Button>
          ) : null
        }
      />

      <CardContent className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* 1. Grid Configuration Selector (7 Cols) */}
          <div className="md:col-span-7 space-y-2">
            <label
              htmlFor="forecast-grid-select"
              className="block text-xs font-bold uppercase tracking-wider text-[#26352A] dark:text-[#F2F5ED]"
            >
              Grid Configuration
            </label>
            <div className="relative">
              <select
                id="forecast-grid-select"
                value={selectedGridId}
                onChange={(e) => onSelectGrid(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 px-3.5 pr-9 text-xs sm:text-sm font-medium rounded-lg border border-[#DDD9C9] dark:border-[#2C3C2E] bg-[#FFFDF6] dark:bg-[#151F17] text-[#26352A] dark:text-[#F2F5ED] focus:outline-none focus:ring-2 focus:ring-[#A0C878]/50 cursor-pointer disabled:opacity-60 transition-colors"
              >
                {grids.map((grid) => (
                  <option key={grid.id} value={grid.id}>
                    {grid.name} ({grid.id})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#788477] dark:text-[#859483]">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            {/* Selected Grid Information Preview */}
            {selectedGrid && (
              <div className="mt-3 p-3.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#26352A] dark:text-[#F2F5ED] flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#A0C878]" />
                    <span>{selectedGrid.name}</span>
                  </span>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] text-[#788477] dark:text-[#859483]">
                    {selectedGrid.gridConnectionStatus === 'connected' ? 'Grid-Connected (33/11 kV)' : 'Islanded Microgrid'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60 text-[11px]">
                  <div>
                    <span className="text-[#788477] dark:text-[#859483] block">Topology</span>
                    <span className="font-mono font-semibold text-[#26352A] dark:text-[#F2F5ED]">
                      {busCount} Buses · {feederCount} Feeders
                    </span>
                  </div>
                  <div>
                    <span className="text-[#788477] dark:text-[#859483] block">Distributed Assets</span>
                    <span className="font-mono font-semibold text-[#26352A] dark:text-[#F2F5ED]">
                      {solarCount} PV · {batteryCount} BESS · {loadCount} Loads
                    </span>
                  </div>
                  <div>
                    <span className="text-[#788477] dark:text-[#859483] block">Capacity Rating</span>
                    <span className="font-mono font-semibold text-[#26352A] dark:text-[#F2F5ED]">
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
              className="block text-xs font-bold uppercase tracking-wider text-[#26352A] dark:text-[#F2F5ED]"
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
                className="w-full h-11 px-3.5 pr-10 text-xs sm:text-sm font-medium rounded-lg border border-[#DDD9C9] dark:border-[#2C3C2E] bg-[#FFFDF6] dark:bg-[#151F17] text-[#26352A] dark:text-[#F2F5ED] focus:outline-none focus:ring-2 focus:ring-[#A0C878]/50 disabled:opacity-60 transition-colors"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#788477] dark:text-[#859483]">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-[#788477] dark:text-[#859483] flex items-center gap-1">
              <Info className="w-3 h-3 text-[#A0C878] shrink-0" />
              <span>Select the day you want the model to forecast.</span>
            </p>

            {/* Primary Action Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={onSimulate}
                disabled={isLoading || !selectedGridId || !selectedDate}
                className="w-full h-11 justify-center text-sm font-bold shadow-sm"
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
