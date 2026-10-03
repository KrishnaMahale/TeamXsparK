import React from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useScenarios } from '../hooks/useScenarios'
import { useSimulationStore } from '../store/simulationStore'
import { GridScenario } from '../types/scenario'
import { useNavigate } from 'react-router-dom'
import {
  Sun,
  Zap,
  BatteryMedium,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react'

export const ScenariosPage: React.FC = () => {
  const { scenarios, selectedScenario } = useScenarios()
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
      <div className="p-4 rounded-xl bg-white dark:bg-[#0D2420] border border-[#D1E7DD] dark:border-[#23483F] text-xs text-[#365A4D] dark:text-[#A7C4B8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-colors">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          <span>
            Selecting a scenario populates the simulation inputs for inspection and editing before running.
          </span>
        </div>
        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-medium">
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
              className={`p-5 rounded-xl border flex flex-col justify-between transition-colors shadow-sm ${
                isSelected
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400'
                  : isInfeasible
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 hover:border-rose-400'
                  : 'bg-white dark:bg-[#0D2420] border-[#D1E7DD] dark:border-[#23483F] hover:border-emerald-300 dark:hover:border-emerald-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#14532D] dark:text-emerald-100 tracking-tight">
                      {scenario.name}
                    </h3>
                    <span className="text-[11px] font-mono text-teal-700 dark:text-teal-400 mt-0.5 block">
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

                <p className="text-xs text-[#365A4D] dark:text-[#A7C4B8] mt-3 leading-relaxed">
                  {scenario.description}
                </p>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-lg bg-[#ECFDF5] dark:bg-[#0A2018] border border-[#D1E7DD] dark:border-[#23483F] text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-[#6B8178] dark:text-[#6B8E82] mb-0.5">
                      <Sun className="w-3 h-3 text-yellow-500" />
                      <span>Solar</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-yellow-600 dark:text-yellow-400">
                      {scenario.solarKw} kW
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-[#6B8178] dark:text-[#6B8E82] mb-0.5">
                      <Zap className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                      <span>Load</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-300">
                      {scenario.loadKw} kW
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                      <BatteryMedium className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>SOC</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {scenario.batterySocPercent}%
                    </span>
                  </div>
                </div>

                {/* Expected Violations Note */}
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {scenario.violationsExpected > 0 ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-amber-700 dark:text-amber-300 font-medium">
                        {scenario.violationsExpected} Violations Expected
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                        Normal Stable Grid
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#D1E7DD] dark:border-[#23483F]">
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
