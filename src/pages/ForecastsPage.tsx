import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { useGridStore } from '../store/gridStore'
import { useSimulationStore } from '../store/simulationStore'
import { gridService } from '../services/api/gridService'
import { GridNetwork } from '../types/network'
import {
  fetchDayAheadForecast,
  DayAheadForecastResult,
} from '../components/forecast/forecastAdapter'
import { ForecastSimulationControls } from '../components/forecast/ForecastSimulationControls'
import { ForecastSummaryMetrics } from '../components/forecast/ForecastSummaryMetrics'
import { ForecastMainChart } from '../components/forecast/ForecastMainChart'
import { NetDemandChart } from '../components/forecast/NetDemandChart'
import { ForecastInsightsPanel } from '../components/forecast/ForecastInsightsPanel'
import { GridResponsePreview } from '../components/forecast/GridResponsePreview'
import { ForecastEmptyState } from '../components/forecast/ForecastEmptyState'
import { ForecastErrorState } from '../components/forecast/ForecastErrorState'

import { ThemeToggle } from '../components/ui/ThemeToggle'
import { Button } from '../components/ui/Button'
import { SlidersHorizontal } from 'lucide-react'

export const ForecastsPage: React.FC = () => {
  const navigate = useNavigate()
  const { network: activeGrid, switchGrid, fetchNetwork } = useGridStore()
  const { updateInput } = useSimulationStore()

  // Grid list state
  const [grids, setGrids] = useState<GridNetwork[]>([activeGrid])
  const [selectedGridId, setSelectedGridId] = useState<string>(activeGrid.id || 'default-grid')

  // Simulation date state (default: tomorrow)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr)

  // Simulation execution state
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSimulated, setIsSimulated] = useState<boolean>(false)
  const [forecastResult, setForecastResult] = useState<DayAheadForecastResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 1. Load available grids from backend or store on mount
  useEffect(() => {
    let isMounted = true

    const loadGrids = async () => {
      try {
        await fetchNetwork()
        const fetchedGrids = await gridService.getGrids()
        if (isMounted && Array.isArray(fetchedGrids) && fetchedGrids.length > 0) {
          setGrids(fetchedGrids)
          if (!selectedGridId || !fetchedGrids.some((g) => g.id === selectedGridId)) {
            setSelectedGridId(activeGrid.id || fetchedGrids[0].id)
          }
        }
      } catch (err) {
        console.warn('[ForecastsPage] Could not fetch remote grids, using local store grid:', err)
        if (isMounted && activeGrid) {
          setGrids([activeGrid])
          setSelectedGridId(activeGrid.id)
        }
      }
    }

    loadGrids()
    return () => {
      isMounted = false
    }
  }, [fetchNetwork, activeGrid])

  // Current selected grid object
  const currentGrid = grids.find((g) => g.id === selectedGridId) || activeGrid || grids[0]

  // Handle grid selection change
  const handleSelectGrid = async (gridId: string) => {
    setSelectedGridId(gridId)
    // Synchronize active grid in background so other pages reflect the selected network
    try {
      await switchGrid(gridId)
    } catch (e) {
      console.warn('[ForecastsPage] Switch grid notification:', e)
    }
    // If already simulated, re-run or keep ready
    if (isSimulated) {
      setIsSimulated(false)
      setForecastResult(null)
    }
  }

  // Handle simulation run
  const handleSimulate = useCallback(async () => {
    if (!currentGrid || !selectedDate) {
      setError('Please select a valid grid configuration and simulation date.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Natural responsive delay for professional feedback
      const [res] = await Promise.all([
        fetchDayAheadForecast(currentGrid, selectedDate),
        new Promise((resolve) => setTimeout(resolve, 380)),
      ])

      setForecastResult(res)
      setIsSimulated(true)
    } catch (err: any) {
      console.error('[ForecastsPage] Forecast generation error:', err)
      setError(
        err?.message ||
          'Unable to generate the day-ahead forecast for this configuration. Please verify connectivity and try again.'
      )
      setIsSimulated(false)
    } finally {
      setIsLoading(false)
    }
  }, [currentGrid, selectedDate])

  // Handle Reset / Reconfigure
  const handleReset = () => {
    setIsSimulated(false)
    setForecastResult(null)
    setError(null)
  }

  // Bridge to Digital Twin Simulation:
  // Transfers 24h forecasted time series into simulationStore and routes to /simulation
  const handleRunDigitalTwinSimulation = () => {
    if (!forecastResult || !currentGrid) return

    const solarTimeSeries = forecastResult.dataPoints.map((pt) => ({
      id: `solar-${pt.time}`,
      time: pt.time,
      solarKw: pt.solarKw,
    }))

    const loadTimeSeries = forecastResult.dataPoints.map((pt) => ({
      id: `load-${pt.time}`,
      time: pt.time,
      loadKw: pt.loadKw,
    }))

    const installedSolar =
      currentGrid.solarUnits.reduce((acc, s) => acc + (s.capacityKw || 0), 0)
    const middayPt = forecastResult.dataPoints.find((p) => p.time === '13:00')

    updateInput({
      gridId: currentGrid.id,
      scenarioName: `Day-Ahead Forecast (${selectedDate})`,
      scenarioDescription: `24-hour lookahead operating profile generated by ML forecasting engine for ${currentGrid.name}.`,
      simulationDate: selectedDate,
      timeResolution: '15 minutes',
      simulationSource: 'forecast',
      solarTimeSeries,
      loadTimeSeries,
      installedSolarCapacityKw: installedSolar > 0 ? installedSolar : forecastResult.summary.peakSolarKw,
      currentSolarKw: middayPt?.solarKw ?? forecastResult.summary.peakSolarKw,
      peakLoadKw: forecastResult.summary.peakLoadKw,
      currentLoadKw: middayPt?.loadKw ?? 120,
    })

    navigate('/simulation', { state: { fromForecast: true, mode: 'forecast' } })
  }

  return (
    <PageContainer compact className="py-2.5 px-3.5 lg:py-3 lg:px-4 flex flex-col flex-1">
      <div className="space-y-3.5 w-full flex-1 flex flex-col pb-4">
        {/* Upshifted Custom Hero Heading Box with Background Image matching Simulations Page */}
        <div className="relative rounded-2xl overflow-hidden bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 p-4 sm:p-5 lg:p-6 shadow-[0_8px_25px_rgba(16,80,55,0.06)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.3)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
          {/* Background Visual Layer: Renewable Grid Landscape Fading to Left */}
          <div className="absolute inset-y-0 right-0 w-full sm:w-2/3 lg:w-3/5 z-0 pointer-events-none overflow-hidden">
            <img
              src="/images/hero_grid.jpg"
              alt="Renewable Grid Background"
              className="w-full h-full object-cover object-right lg:object-center opacity-95 dark:opacity-65 transition-opacity"
              loading="eager"
            />
            {/* Soft Gradient Masks for Crisp High-Contrast Typography */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-[#122C1F] dark:via-[#122C1F]/80 dark:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-transparent dark:from-[#122C1F]/30" />
          </div>

          {/* Left: Upshifted Bigger Heading & Subtitle */}
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl lg:text-4xl font-black text-[#10251A] dark:text-white tracking-tight leading-none">
              Renewable & Load Forecast
            </h1>
            <p className="text-xs sm:text-sm text-[#425B4C] dark:text-[#A7F3D0] font-medium mt-2 leading-relaxed max-w-xl">
              Predict the operating conditions for a selected day and evaluate how the configured grid responds.
            </p>
          </div>

          {/* Right: Actions Bar & Theme Toggle */}
          <div className="relative z-10 flex items-center gap-2 shrink-0 bg-[#F4FAF5]/90 dark:bg-[#0E2419]/90 p-1.5 rounded-xl border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs backdrop-blur-sm">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 text-xs text-[#425B4C] dark:text-[#A7F3D0]">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="text-[#10251A] dark:text-white font-bold">
                ML Forecast Engine
              </span>
              <span className="text-[#BBF7D0] dark:text-[#86EFAC]/30">|</span>
              <span className="text-[#425B4C] dark:text-[#A7F3D0] font-mono text-[11px]">
                Ready
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              onClick={() => navigate('/simulation')}
              className="font-bold shadow-xs hover:border-[#047857]"
            >
              Simulate Grid
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* SECTION 1 — SIMULATION INPUT */}
        <ForecastSimulationControls
          grids={grids}
          selectedGridId={selectedGridId}
          onSelectGrid={handleSelectGrid}
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            setSelectedDate(d)
            if (isSimulated) {
              setIsSimulated(false)
              setForecastResult(null)
            }
          }}
          onSimulate={handleSimulate}
          onReset={handleReset}
          isLoading={isLoading}
          isSimulated={isSimulated}
        />

        {/* ERROR STATE */}
        {error && (
          <ForecastErrorState
            message={error}
            onRetry={handleSimulate}
          />
        )}

        {/* EMPTY STATE (Before simulation has been executed) */}
        {!isSimulated && !isLoading && !error && (
          <div className="flex-1 flex flex-col min-h-0">
            <ForecastEmptyState />
          </div>
        )}

        {/* RESULTS STATE (After simulation execution) */}
        {isSimulated && forecastResult && !isLoading && (
          <div className="space-y-3.5 animate-in fade-in duration-300">
            {/* 1. Forecast Summary Metrics */}
            <ForecastSummaryMetrics
              summary={forecastResult.summary}
              gridName={currentGrid.name}
              simulationDate={selectedDate}
            />

            {/* 2 & 3. Main Forecast Chart & Net Demand Chart (Side-by-Side on XL screens) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 items-stretch">
              <ForecastMainChart
                dataPoints={forecastResult.dataPoints}
              />
              <NetDemandChart
                dataPoints={forecastResult.dataPoints}
                summary={forecastResult.summary}
              />
            </div>

            {/* 4. Forecast Insights Panel */}
            <ForecastInsightsPanel
              insights={forecastResult.insights}
              modelType={forecastResult.summary.modelType}
            />

            {/* 5. Grid Response Simulation Bridge */}
            <GridResponsePreview
              onRunSimulation={handleRunDigitalTwinSimulation}
              gridName={currentGrid.name}
              simulationDate={selectedDate}
            />
          </div>
        )}
      </div>
    </PageContainer>
  )
}

export default ForecastsPage
