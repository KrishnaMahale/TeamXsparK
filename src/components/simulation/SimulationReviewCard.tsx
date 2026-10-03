import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { SimulationInput } from '../../types/simulation'
import { Play, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'

interface SimulationReviewCardProps {
  input: SimulationInput
  onRunSimulation: () => void
  isRunning: boolean
  validationErrors: string[]
}

export const SimulationReviewCard: React.FC<SimulationReviewCardProps> = ({
  input,
  onRunSimulation,
  isRunning,
  validationErrors,
}) => {
  const peakSolar = Math.max(...input.solarTimeSeries.map((s) => s.solarKw), 0)
  const peakLoad = Math.max(...input.loadTimeSeries.map((l) => l.loadKw), 0)
  const dataPointsCount = input.solarTimeSeries.length

  const isValid = validationErrors.length === 0

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Simulation Review & Execution"
        subtitle="Verify configured parameters before dispatching power-flow solver"
        icon={<CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
        action={
          <Badge variant={isValid ? 'success' : 'danger'}>
            {isValid ? 'Ready to Simulate' : `${validationErrors.length} Errors Found`}
          </Badge>
        }
      />
      <CardContent className="space-y-4">
        {/* Verification Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-sans block">Scenario</span>
            <span className="text-slate-900 dark:text-white font-bold text-sm block mt-0.5 truncate font-sans">
              {input.scenarioName}
            </span>
            <span className="text-[10px] text-sky-700 dark:text-sky-400 block mt-0.5 font-sans">
              {input.simulationDuration} ({dataPointsCount} intervals)
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-sans block">Solar Generation</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold text-sm block mt-0.5">
              Peak: {peakSolar} kW
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
              Rated: {input.installedSolarCapacityKw} kW
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-sans block">Feeder Demand</span>
            <span className="text-sky-700 dark:text-sky-300 font-bold text-sm block mt-0.5">
              Peak: {peakLoad} kW
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
              Current: {input.currentLoadKw} kW
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-sans block">Battery & Limits</span>
            <span className="text-slate-800 dark:text-slate-200 font-bold text-sm block mt-0.5">
              {input.batteryConfig.capacityKwh} kWh • SOC {input.batteryConfig.initialSocPercent}%
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
              V-Bounds: {input.networkConfig.voltageMinPu} - {input.networkConfig.voltageMaxPu} pu
            </span>
          </div>
        </div>

        {/* Validation Errors Display */}
        {validationErrors.length > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 space-y-1.5 text-xs text-red-700 dark:text-red-300">
            <div className="font-bold flex items-center gap-1.5 text-red-800 dark:text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>Simulation cannot run until the following issues are resolved:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Primary Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Power flow calculations will evaluate all time steps and detect constraint violations.</span>
          </div>

          <Button
            size="lg"
            variant="primary"
            isLoading={isRunning}
            disabled={!isValid}
            leftIcon={<Play className="w-4 h-4 fill-white" />}
            onClick={onRunSimulation}
            className="w-full sm:w-auto px-8 font-bold tracking-wide"
          >
            RUN SIMULATION
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
