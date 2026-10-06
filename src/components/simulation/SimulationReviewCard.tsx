import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { SimulationInput } from '../../types/simulation'
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'

interface SimulationReviewCardProps {
  input: SimulationInput
  isRunning?: boolean
  validationErrors: string[]
}

export const SimulationReviewCard: React.FC<SimulationReviewCardProps> = ({
  input,
  isRunning = false,
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
        icon={<CheckCircle2 className="w-4 h-4 text-[#A0C878]" />}
        action={
          <Badge variant={isValid ? 'success' : 'danger'}>
            {isValid ? 'Ready to Simulate' : `${validationErrors.length} Errors Found`}
          </Badge>
        }
      />
      <CardContent className="space-y-4">
        {/* Verification Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2A3A2C]">
            <span className="text-[10px] text-[#788477] uppercase font-sans flex items-center justify-between">
              <span>Scenario</span>
              <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1 rounded border border-emerald-300 dark:border-emerald-800">DB Synced</span>
            </span>
            <span className="text-[#26352A] dark:text-[#E8F0E6] font-bold text-sm block mt-0.5 truncate font-sans">
              {input.scenarioName}
            </span>
            <span className="text-[10px] text-[#506052] dark:text-[#A0B0A2] block mt-0.5 font-sans truncate">
              Grid: {input.gridId || 'Active Grid'} • {input.simulationDuration}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2A3A2C]">
            <span className="text-[10px] text-[#788477] uppercase font-sans block">Solar Generation</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold text-sm block mt-0.5">
              Peak: {peakSolar} kW
            </span>
            <span className="text-[10px] text-[#788477] block mt-0.5">
              Rated: {input.installedSolarCapacityKw} kW
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2A3A2C]">
            <span className="text-[10px] text-[#788477] uppercase font-sans block">Feeder Demand</span>
            <span className="text-[#26352A] dark:text-[#E8F0E6] font-bold text-sm block mt-0.5">
              Peak: {peakLoad} kW
            </span>
            <span className="text-[10px] text-[#788477] block mt-0.5">
              Current: {input.currentLoadKw} kW
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2A3A2C]">
            <span className="text-[10px] text-[#788477] uppercase font-sans block">Battery & Limits</span>
            <span className="text-[#26352A] dark:text-[#E8F0E6] font-bold text-sm block mt-0.5">
              {input.batteryConfig.capacityKwh} kWh • SOC {input.batteryConfig.initialSocPercent}%
            </span>
            <span className="text-[10px] text-[#788477] block mt-0.5">
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

        {/* Verification Note (Single execution button handled in wizard bottom navigation) */}
        <div className="pt-2 flex items-center gap-2 text-xs text-[#788477] dark:text-[#A0B0A2]">
          <ShieldCheck className="w-4 h-4 text-[#A0C878] shrink-0" />
          <span>Power flow calculations will evaluate all time steps and detect constraint violations.</span>
        </div>
      </CardContent>
    </Card>
  )
}
