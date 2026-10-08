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
      currentGrid.solarUnits.reduce((acc, s) => acc + (s.capacityKw || 0), 0) || 250
    const middayPt = forecastResult.dataPoints.find((p) => p.time === '13:00')

    updateInput({
      gridId: currentGrid.id,
      scenarioName: `Day-Ahead Forecast (${selectedDate})`,
      scenarioDescription: `24-hour lookahead operating profile generated by ML forecasting engine for ${currentGrid.name}.`,
      simulationDate: selectedDate,
      solarTimeSeries,
      loadTimeSeries,
      installedSolarCapacityKw: Math.max(installedSolar, forecastResult.summary.peakSolarKw),
      currentSolarKw: middayPt?.solarKw || forecastResult.summary.peakSolarKw,
      peakLoadKw: forecastResult.summary.peakLoadKw,
      currentLoadKw: middayPt?.loadKw || 120,
    })

    navigate('/simulation')
  }

  return (
    <PageContainer
      title="Renewable & Load Forecast"
      subtitle="Predict the operating conditions for a selected day and evaluate how the configured grid responds."
      actions={
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#506052] dark:text-[#C2CCC0]">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#A0C878] animate-pulse" />
            <span className="text-[#26352A] dark:text-[#F2F5ED] font-semibold">
              ML Forecast Engine
            </span>
          </div>
          <span className="text-[#DDD9C9] dark:text-[#2C3C2E]">|</span>
          <span className="text-[#788477] dark:text-[#859483] font-mono text-[11px]">
            Ready
          </span>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto w-full pb-8">
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
          <ForecastEmptyState />
        )}

        {/* RESULTS STATE (After simulation execution) */}
        {isSimulated && forecastResult && !isLoading && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 1. Forecast Summary Metrics */}
            <ForecastSummaryMetrics
              summary={forecastResult.summary}
              gridName={currentGrid.name}
              simulationDate={selectedDate}
            />

            {/* 2. Main 24-Hour Forecast Chart (Solar vs Load) */}
            <ForecastMainChart
              dataPoints={forecastResult.dataPoints}
            />

            {/* 3. Forecasted Net Demand Chart */}
            <NetDemandChart
              dataPoints={forecastResult.dataPoints}
              summary={forecastResult.summary}
            />

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
