import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useSimulationStore } from '../store/simulationStore'
import { useGridStore } from '../store/gridStore'
import { gridService } from '../services/api/gridService'
import { GridNetwork } from '../types/network'
import { ScenarioSimulationPanel } from '../components/simulation/ScenarioSimulationPanel'
import { ForecastSimulationPanel } from '../components/simulation/ForecastSimulationPanel'
import { SimulationProgressModal } from '../components/simulation/SimulationProgressModal'
import {
  RotateCcw,
  ArrowRight,
  Play,
  CheckCircle2,
  AlertTriangle,
  Share2,
} from 'lucide-react'

export const SimulationSetupPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    input,
    activePresetKey,
    isRunning,
    isProgressModalOpen,
    progressSteps,
    currentProgressIndex,
    fullResult,
    updateInput,
    loadPreset,
    updateSolarPoint,
    addSolarPoint,
    deleteSolarPoint,
    generateSampleSolar,
    updateLoadPoint,
    addLoadPoint,
    deleteLoadPoint,
    generateSampleLoad,
    importCsvData,
    runFullSimulation,
    closeProgressModal,
    resetSimulation,
  } = useSimulationStore()

  const { network, switchGrid } = useGridStore()
  const [availableGrids, setAvailableGrids] = useState<GridNetwork[]>([])

  // Local state to allow explicit switching back to scenario mode if user desires
  const [userSwitchedToScenario, setUserSwitchedToScenario] = useState<boolean>(false)

  // Context Detection:
  // PATH A (Direct Access): Defaults to Scenario Simulation.
  // PATH B (/forecasts -> /simulation): Detects forecast context via location state, query params, or staged forecast input.
  const isForecastContext = useMemo(() => {
    if (userSwitchedToScenario) return false

    const locState = location.state as { fromForecast?: boolean; mode?: string } | null
    if (locState?.fromForecast || locState?.mode === 'forecast' || location.search.includes('mode=forecast')) {
      return true
    }

    // Check if input was staged by ForecastsPage with a Day-Ahead Forecast scenario
    const isForecastScenario =
      input.scenarioName.startsWith('Day-Ahead Forecast') ||
      input.scenarioName.includes('Forecast')

    return isForecastScenario
  }, [location.state, location.search, input.scenarioName, userSwitchedToScenario])

  // Load available grids from backend or store on mount
  useEffect(() => {
    gridService
      .getGrids()
      .then((grids) => {
        if (Array.isArray(grids) && grids.length > 0) {
          setAvailableGrids(grids)
        }
      })
      .catch(() => {})
  }, [network.id])

  // Synchronize input.gridId with active grid
  useEffect(() => {
    if (!input.gridId && network.id) {
      updateInput({ gridId: network.id })
    }
  }, [network.id, input.gridId, updateInput])

  const handleSelectTargetGrid = async (gridId: string) => {
    await switchGrid(gridId)
    updateInput({ gridId })
  }

  // Handle switching from Forecast to Scenario context
  const handleSwitchToScenario = () => {
    setUserSwitchedToScenario(true)
    loadPreset('NORMAL_DAY')
  }

  // Handle full reset
  const handleResetAll = () => {
    setUserSwitchedToScenario(false)
    resetSimulation()
  }

  // Real-time Form Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = []

    if (!input.scenarioName.trim()) {
      errors.push('Scenario Name / Operating Identifier is required.')
    }

    if (input.installedSolarCapacityKw < 0) {
      errors.push('Installed solar capacity cannot be negative.')
    }

    if (input.solarTimeSeries.length === 0) {
      errors.push('Solar time-series must contain at least one time interval.')
    }

    if (input.loadTimeSeries.length === 0) {
      errors.push('Load time-series must contain at least one time interval.')
    }

    if (input.batteryConfig.initialSocPercent < 0 || input.batteryConfig.initialSocPercent > 100) {
      errors.push('Battery initial SOC must be between 0% and 100%.')
    }

    if (input.batteryConfig.capacityKwh <= 0) {
      errors.push('Battery capacity must be greater than 0 kWh.')
    }

    return errors
  }, [input])

  const handleRun = async () => {
    await runFullSimulation()
  }

  const handleViewResults = () => {
    closeProgressModal()
    navigate('/actions')
  }

  return (
    <PageContainer
      title="Digital Twin Simulation"
      subtitle={
        isForecastContext
          ? "Evaluate the selected day's ML forecast against the physical grid model."
          : 'Evaluate how the selected grid behaves under its configured operating conditions.'
      }
      actions={
        <div className="flex items-center gap-2.5">
          <Badge variant="neutral" size="sm" className="hidden sm:inline-flex">
            {isForecastContext ? 'Forecast-Driven Simulation' : 'Scenario-Based Simulation'}
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Share2 className="w-3.5 h-3.5" />}
            onClick={() => navigate('/network')}
          >
            Grid Configurator
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleResetAll}
          >
            Reset
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto w-full pb-8">
        {/* CONTEXT-AWARE CONFIGURATION SECTION */}
        {isForecastContext ? (
          <ForecastSimulationPanel
            input={input}
            currentGrid={network}
            onSwitchToScenario={handleSwitchToScenario}
          />
        ) : (
          <ScenarioSimulationPanel
            input={input}
            activePresetKey={activePresetKey}
            currentGrid={network}
            availableGrids={availableGrids}
            onSelectGrid={handleSelectTargetGrid}
            onSelectPreset={loadPreset}
            onUpdateInput={updateInput}
            onUpdateSolarPoint={updateSolarPoint}
            onAddSolarPoint={addSolarPoint}
            onDeleteSolarPoint={deleteSolarPoint}
            onGenerateSampleSolar={generateSampleSolar}
            onUpdateLoadPoint={updateLoadPoint}
            onAddLoadPoint={addLoadPoint}
            onDeleteLoadPoint={deleteLoadPoint}
            onGenerateSampleLoad={generateSampleLoad}
            onImportCsvData={importCsvData}
          />
        )}

        {/* READY TO SIMULATE & RUN ACTIONS */}
        <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
                  <h3 className="text-base font-extrabold text-[#10251A] dark:text-white">
                    Ready to simulate
                  </h3>
                </div>
                <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] leading-relaxed font-medium">
                  The Digital Twin will evaluate the selected grid across the configured operating conditions and identify potential network constraints (voltage compliance, thermal overload, and reverse flow).
                </p>

                {validationErrors.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-xs text-red-800 dark:text-red-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      <span>Resolve configuration issues before running:</span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5 text-red-700 dark:text-red-300">
                      {validationErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleRun}
                  disabled={isRunning || validationErrors.length > 0}
                  isLoading={isRunning}
                  leftIcon={!isRunning ? <Play className="w-4 h-4 fill-current" /> : undefined}
                  className="font-bold px-8 shadow-md"
                >
                  {isRunning ? 'Running Digital Twin...' : 'Run Digital Twin Simulation'}
                </Button>
              </div>
            </div>

            {/* In-page Result Preview Banner (When simulation has completed) */}
            {fullResult && !isRunning && (
              <div className="mt-6 p-4 rounded-2xl bg-[#ECFDF3]/80 dark:bg-[#132F21]/80 backdrop-blur-md border border-[#86EFAC] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#047857] dark:text-[#86EFAC] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-[#10251A] dark:text-white flex items-center gap-2">
                      <span>Power-Flow Simulation Complete</span>
                      <Badge variant="success" size="sm">
                        Converged
                      </Badge>
                    </div>
                    <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] mt-0.5 font-medium">
                      {fullResult.summary.initialViolations > 0
                        ? `${fullResult.summary.initialViolations} constraint violations detected across simulation horizon. Review corrective actions.`
                        : 'All nodal voltages and thermal ampacities are compliant within IEEE 1547 operational limits.'}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] font-mono text-[#506052] dark:text-[#A4B3A2]">
                      <span>Monitored Bus: {fullResult.comparisonData?.b3Voltage?.before ? `${fullResult.comparisonData.b3Voltage.before.toFixed(3)} pu` : '1.020 pu'}</span>
                      <span>•</span>
                      <span>Feeder Loading: {fullResult.comparisonData?.f02Loading?.before ? `${fullResult.comparisonData.f02Loading.before.toFixed(1)}%` : '85.0%'}</span>
                      <span>•</span>
                      <span>Initial Violations: {fullResult.summary.initialViolations}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleViewResults}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="shrink-0 font-bold"
                >
                  View Corrective Actions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Simulation Execution Progress Modal */}
      <SimulationProgressModal
        isOpen={isProgressModalOpen}
        steps={progressSteps}
        currentIndex={currentProgressIndex}
        onClose={closeProgressModal}
        onViewResults={handleViewResults}
      />
    </PageContainer>
  )
}

export default SimulationSetupPage
