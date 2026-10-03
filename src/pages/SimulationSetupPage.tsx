import React, { useState, useMemo } from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ScenarioPresetSelector } from '../components/simulation/ScenarioPresetSelector'
import { SolarInputPanel } from '../components/simulation/SolarInputPanel'
import { LoadInputPanel } from '../components/simulation/LoadInputPanel'
import { LiveSolarLoadChart } from '../components/simulation/LiveSolarLoadChart'
import { NetworkConfigPanel } from '../components/simulation/NetworkConfigPanel'
import { BatteryConfigPanel } from '../components/simulation/BatteryConfigPanel'
import { SimulationReviewCard } from '../components/simulation/SimulationReviewCard'
import { SimulationProgressModal } from '../components/simulation/SimulationProgressModal'
import { CSVUploader } from '../components/simulation/CSVUploader'
import { useSimulationStore } from '../store/simulationStore'
import { useNavigate } from 'react-router-dom'
import {
  SlidersHorizontal,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Play,
  CheckCircle2,
  Zap,
} from 'lucide-react'

export const SimulationSetupPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1)

  const {
    input,
    activePresetKey,
    isRunning,
    isProgressModalOpen,
    progressSteps,
    currentProgressIndex,
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

  const navigate = useNavigate()

  // Real-time Form Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = []

    if (!input.scenarioName.trim()) {
      errors.push('Scenario Name is required.')
    }

    if (input.installedSolarCapacityKw <= 0) {
      errors.push('Installed solar capacity must be greater than 0 kW.')
    }

    if (input.currentSolarKw > input.installedSolarCapacityKw) {
      errors.push(
        `Current solar generation (${input.currentSolarKw} kW) exceeds installed capacity (${input.installedSolarCapacityKw} kW).`
      )
    }

    const solarOverPoints = input.solarTimeSeries.filter(
      (p) => p.solarKw > input.installedSolarCapacityKw
    )
    if (solarOverPoints.length > 0) {
      errors.push(
        `Solar generation at ${solarOverPoints[0].time} (${solarOverPoints[0].solarKw} kW) exceeds capacity of ${input.installedSolarCapacityKw} kW.`
      )
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
    navigate('/')
  }

  const steps = [
    { number: 1, title: 'Scenario', subtitle: 'Metadata & Presets' },
    { number: 2, title: 'Energy Data', subtitle: 'Solar & Load Profiles' },
    { number: 3, title: 'Network', subtitle: 'Limits & Battery' },
    { number: 4, title: 'Review', subtitle: 'Audit & Validation' },
    { number: 5, title: 'Simulate', subtitle: 'Power-Flow Engine' },
  ]

  return (
    <PageContainer
      title="Simulation Setup"
      subtitle="Configure renewable generation and electricity demand before running the digital twin"
      actions={
        <div className="flex items-center gap-3">
          <CSVUploader onImport={importCsvData} />
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={resetSimulation}
          >
            Reset All
          </Button>
        </div>
      }
    >
      {/* Stepper Navigation */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#0D2420] border border-gray-100 dark:border-[#23483F] shadow-sm transition-colors">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
          {steps.map((s) => {
            const isCurrent = currentStep === s.number
            const isCompleted = currentStep > s.number

            return (
              <button
                key={s.number}
                onClick={() => setCurrentStep(s.number)}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-colors border shadow-sm ${
                  isCurrent
                    ? 'bg-[#ECFDF5] dark:bg-[#064E3B] text-[#14532D] dark:text-[#ECFDF5] border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-400'
                    : isCompleted
                    ? 'bg-[#F0FDF4] dark:bg-[#0A2018] text-[#14532D] dark:text-[#ECFDF5] border-emerald-200 dark:border-[#2D5C51] hover:bg-[#D1FAE5] dark:hover:bg-[#183D36]'
                    : 'bg-gray-50 dark:bg-[#12332D] text-gray-500 dark:text-[#6B8E82] border-gray-200 dark:border-[#23483F] hover:text-gray-900 dark:hover:text-emerald-100'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCurrent
                      ? 'bg-emerald-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 dark:bg-[#23483F] text-gray-600 dark:text-[#A7C4B8]'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : `0${s.number}`}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <div className="text-xs font-bold uppercase truncate">{s.title}</div>
                  <div className={`text-[10px] truncate ${isCurrent ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`}>
                    {s.subtitle}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* STEP 1: Scenario Metadata & Presets */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <ScenarioPresetSelector
            activePresetKey={activePresetKey}
            onSelectPreset={loadPreset}
          />

          <Card>
            <CardHeader
              title="Scenario Information"
              subtitle="Define metadata and temporal resolution parameters"
              icon={<SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Scenario Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                    Scenario Name
                  </label>
                  <input
                    type="text"
                    value={input.scenarioName}
                    onChange={(e) => updateInput({ scenarioName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0A2018] border border-gray-200 dark:border-[#23483F] text-gray-900 dark:text-[#ECFDF5] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Simulation Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                    Simulation Date
                  </label>
                  <input
                    type="text"
                    value={input.simulationDate}
                    onChange={(e) => updateInput({ simulationDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0A2018] border border-gray-200 dark:border-[#23483F] text-gray-900 dark:text-[#ECFDF5] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                    Simulation Duration
                  </label>
                  <select
                    value={input.simulationDuration}
                    onChange={(e) => updateInput({ simulationDuration: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0A2018] border border-gray-200 dark:border-[#23483F] text-gray-900 dark:text-[#ECFDF5] text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="6 hours">6 hours (Peak Window)</option>
                    <option value="12 hours">12 hours (Daytime)</option>
                    <option value="24 hours">24 hours (Full Day)</option>
                  </select>
                </div>

                {/* Time Resolution */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                    Time Resolution
                  </label>
                  <select
                    value={input.timeResolution}
                    onChange={(e) => updateInput({ timeResolution: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0A2018] border border-gray-200 dark:border-[#23483F] text-gray-900 dark:text-[#ECFDF5] text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="15 minutes">15 minutes (High-Fidelity)</option>
                    <option value="30 minutes">30 minutes</option>
                    <option value="1 hour">1 hour (Standard)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                  Scenario Description
                </label>
                <input
                  type="text"
                  placeholder="Operational description or test objectives..."
                  value={input.scenarioDescription || ''}
                  onChange={(e) => updateInput({ scenarioDescription: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0A2018] border border-gray-200 dark:border-[#23483F] text-gray-900 dark:text-[#ECFDF5] text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setCurrentStep(2)}
            >
              Continue to Energy Data
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Energy Data (Solar & Load Inputs + Live Chart) */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Live Synchronous Solar vs Load Preview Chart */}
          <LiveSolarLoadChart
            solarPoints={input.solarTimeSeries}
            loadPoints={input.loadTimeSeries}
            installedCapacityKw={input.installedSolarCapacityKw}
            peakLoadKw={input.peakLoadKw}
          />

          {/* Side-by-Side Solar & Load Editors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <SolarInputPanel
              installedCapacityKw={input.installedSolarCapacityKw}
              currentSolarKw={input.currentSolarKw}
              solarTimeSeries={input.solarTimeSeries}
              onChangeInstalledCapacity={(val: number) => updateInput({ installedSolarCapacityKw: val })}
              onChangeCurrentSolar={(val: number) => updateInput({ currentSolarKw: val })}
              onUpdateSolarPoint={updateSolarPoint}
              onAddSolarPoint={addSolarPoint}
              onDeleteSolarPoint={deleteSolarPoint}
              onGenerateSample={generateSampleSolar}
            />

            <LoadInputPanel
              peakLoadKw={input.peakLoadKw}
              currentLoadKw={input.currentLoadKw}
              loadTimeSeries={input.loadTimeSeries}
              onChangePeakLoad={(val: number) => updateInput({ peakLoadKw: val })}
              onChangeCurrentLoad={(val: number) => updateInput({ currentLoadKw: val })}
              onUpdateLoadPoint={updateLoadPoint}
              onAddLoadPoint={addLoadPoint}
              onDeleteLoadPoint={deleteLoadPoint}
              onGenerateSample={generateSampleLoad}
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setCurrentStep(1)}
            >
              Back to Scenario
            </Button>
            <Button
              variant="primary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setCurrentStep(3)}
            >
              Continue to Network Configuration
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Network & Battery Constraints */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <NetworkConfigPanel
              config={input.networkConfig}
              onChange={(updates) =>
                updateInput({ networkConfig: { ...input.networkConfig, ...updates } })
              }
            />

            <BatteryConfigPanel
              config={input.batteryConfig}
              onChange={(updates) =>
                updateInput({ batteryConfig: { ...input.batteryConfig, ...updates } })
              }
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setCurrentStep(2)}
            >
              Back to Energy Data
            </Button>
            <Button
              variant="primary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setCurrentStep(4)}
            >
              Continue to Review
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Review Screen */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <SimulationReviewCard
            input={input}
            validationErrors={validationErrors}
            onRunSimulation={() => {
              setCurrentStep(5)
              handleRun()
            }}
            isRunning={isRunning}
          />

          <div className="flex justify-between pt-2">
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setCurrentStep(3)}
            >
              Back to Network
            </Button>
            <Button
              variant="primary"
              rightIcon={<Play className="w-4 h-4" />}
              onClick={() => {
                setCurrentStep(5)
                handleRun()
              }}
              disabled={validationErrors.length > 0}
            >
              Run Power-Flow Simulation
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Simulation Execution Screen */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Digital Twin Simulation Progress"
              subtitle="Solving nodal AC power flow across configured timeline"
              icon={<Zap className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
            />
            <CardContent className="space-y-6 py-6">
              <div className="space-y-3">
                {progressSteps.map((step, idx) => {
                  const isDone = step.status === 'done'
                  const isProcessing = step.status === 'processing'

                  return (
                    <div
                      key={step.id}
                      className={`p-3.5 rounded-lg border flex items-center justify-between transition-colors ${
                        isDone
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          : isProcessing
                          ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 text-sky-900 dark:text-sky-100 ring-1 ring-sky-400'
                          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isDone
                              ? 'bg-emerald-600 text-white'
                              : isProcessing
                              ? 'bg-sky-600 text-white animate-pulse'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          }`}
                        >
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{step.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{step.subtitle}</div>
                        </div>
                      </div>

                      <div className="text-xs font-mono font-medium">
                        {isDone ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">Complete</span>
                        ) : isProcessing ? (
                          <span className="text-sky-700 dark:text-sky-400 font-bold">Processing...</span>
                        ) : (
                          <span className="text-slate-400">Waiting</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {!isRunning && currentProgressIndex >= 5 && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Power-Flow Simulation Complete</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        Nodal voltages, branch ampacities, and violations have been calculated and synced with the Digital Twin.
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="success"
                    size="md"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    onClick={handleViewResults}
                  >
                    View Results on Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress modal (when triggered from other steps) */}
      <SimulationProgressModal
        isOpen={isProgressModalOpen && currentStep !== 5}
        steps={progressSteps}
        currentIndex={currentProgressIndex}
        onClose={closeProgressModal}
        onViewResults={handleViewResults}
      />
    </PageContainer>
  )
}
