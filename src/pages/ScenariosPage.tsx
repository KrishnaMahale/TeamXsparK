import React from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useScenarios } from '../hooks/useScenarios'
import { useSimulationStore } from '../store/simulationStore'
import { GridScenario } from '../types/scenario'
import { useNavigate } from 'react-router-dom'
import {
  Layers,
  Sun,
  Zap,
  BatteryMedium,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react'

export const ScenariosPage: React.FC = () => {
  const { scenarios, selectedScenario, lastExecutedScenarioId } = useScenarios()
  const { loadPreset } = useSimulationStore()
  const navigate = useNavigate()

  const handleSelectAndConfigure = (scenario: GridScenario) => {
    loadPreset(scenario.id)
    navigate('/simulation')
  }

  return (
    <PageContainer
      title="Grid Operating Scenarios"
      subtitle="Select a benchmark scenario to populate input profiles, inspect parameters, and execute power-flow simulations"
      actions={
        <Button
          variant="primary"
          size="sm"
          leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          onClick={() => navigate('/simulation')}
        >
          New Simulation
        </Button>
      }
    >
      {/* Information Header */}
      <div className="p-4 rounded-xl bg-[#111C35] border border-[#1E293B] text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>
            Selecting a scenario populates the simulation inputs for inspection and editing before running.
          </span>
        </div>
        <span className="text-[11px] text-blue-400 font-mono font-medium">
          Select Scenario → Inspect/Edit Data → Run Simulation
        </span>
      </div>

      {/* Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {scenarios.map((scenario) => {
          const isSelected = selectedScenario.id === scenario.id
          const isInfeasible = scenario.id === 'EXTREME_INFEASIBLE'

          return (
            <div
              key={scenario.id}
              className={`p-5 rounded-xl border flex flex-col justify-between transition-colors ${
                isSelected
                  ? 'bg-[#16223F] border-blue-600'
                  : isInfeasible
                  ? 'bg-[#181829] border-red-800/80 hover:border-red-600'
                  : 'bg-[#111C35] border-[#1E293B] hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                      {scenario.name}
                    </h3>
                    <span className="text-[11px] font-mono text-blue-400 mt-0.5 block">
                      Time Snapshot: {scenario.simulatedTime}
                    </span>
                  </div>
                  <Badge
                    variant={
                      scenario.status === 'optimal'
                        ? 'success'
                        : scenario.status === 'warning'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {scenario.status.toUpperCase()}
                  </Badge>
                </div>

                <p className="text-xs text-slate-300 mt-3">
                  {scenario.description}
                </p>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-lg bg-[#0E172C] border border-[#1E293B] text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                      <Sun className="w-3 h-3 text-amber-400" />
                      <span>Solar</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {scenario.solarKw} kW
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                      <Zap className="w-3 h-3 text-blue-400" />
                      <span>Load</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-blue-400">
                      {scenario.loadKw} kW
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                      <BatteryMedium className="w-3 h-3 text-emerald-400" />
                      <span>SOC</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-white">
                      {scenario.batterySocPercent}%
                    </span>
                  </div>
                </div>

                {/* Expected Violations Note */}
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {scenario.violationsExpected > 0 ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-amber-300">
                        {scenario.violationsExpected} Violations Expected
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300">Normal Stable Grid</span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#1E293B]">
                <Button
                  variant={isSelected ? 'primary' : 'secondary'}
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="w-full text-xs"
                  onClick={() => handleSelectAndConfigure(scenario)}
                >
                  Configure & Inspect Scenario
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </PageContainer>
  )
}
