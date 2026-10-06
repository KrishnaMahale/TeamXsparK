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
      <div className="space-y-6">
        {/* Information Header */}
        <div className="p-4 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] text-xs text-[#506052] dark:text-[#C2CCC0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A0C878]" />
            <span>
              Selecting a scenario populates the simulation inputs for inspection and editing before running.
            </span>
          </div>
          <span className="text-[11px] text-[#26352A] dark:text-[#A0C878] font-mono font-bold">
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
                className={`p-5 rounded-xl border flex flex-col justify-between transition-colors shadow-xs ${
                  isSelected
                    ? 'bg-[#DDEB9D]/35 dark:bg-[#2D3E2F]/60 border-[#A0C878] ring-1 ring-[#A0C878]'
                    : isInfeasible
                    ? 'bg-red-50/60 dark:bg-red-950/20 border-red-300 dark:border-red-900/60 hover:border-red-400'
                    : 'bg-[#FAF6E9] dark:bg-[#1E2B20] border-[#DDD9C9] dark:border-[#2C3C2E] hover:border-[#A0C878]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#26352A] dark:text-[#F2F5ED] tracking-tight">
                        {scenario.name}
                      </h3>
                      <span className="text-[11px] font-mono text-[#788477] dark:text-[#859483] mt-0.5 block">
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

                  <p className="text-xs text-[#506052] dark:text-[#C2CCC0] mt-3 leading-relaxed">
                    {scenario.description}
                  </p>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-lg bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] text-center shadow-xs">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-[#788477] dark:text-[#859483] mb-0.5 font-medium">
                        <Sun className="w-3 h-3 text-[#B09B29]" />
                        <span>Solar</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#B09B29] dark:text-[#D4B838]">
                        {scenario.solarKw} kW
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-[#788477] dark:text-[#859483] mb-0.5 font-medium">
                        <Zap className="w-3 h-3 text-[#A0C878]" />
                        <span>Load</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#26352A] dark:text-[#F2F5ED]">
                        {scenario.loadKw} kW
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-[#788477] dark:text-[#859483] mb-0.5 font-medium">
                        <BatteryMedium className="w-3 h-3 text-[#A0C878]" />
                        <span>SOC</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#26352A] dark:text-[#F2F5ED]">
                        {scenario.batterySocPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Expected Violations Note */}
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    {scenario.violationsExpected > 0 ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-amber-700 dark:text-amber-400 font-semibold">
                          {scenario.violationsExpected} Violations Expected
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#A0C878] shrink-0" />
                        <span className="text-[#26352A] dark:text-[#A0C878] font-semibold">
                          Normal Stable Grid
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#DDD9C9] dark:border-[#2C3C2E]">
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
      </div>
    </PageContainer>
  )
}

export default ScenariosPage
