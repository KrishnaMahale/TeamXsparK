import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import {
  Share2,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  CheckCircle2,
  Activity,
  Cpu,
  Zap,
} from 'lucide-react'

interface GridResponsePreviewProps {
  onRunSimulation: () => void
  gridName: string
  simulationDate: string
}

export const GridResponsePreview: React.FC<GridResponsePreviewProps> = ({
  onRunSimulation,
  gridName,
  simulationDate,
}) => {
  const pipelineSteps = [
    { id: 'predict', label: '1. PREDICT', status: 'completed', desc: 'Day-Ahead ML Forecast' },
    { id: 'simulate', label: '2. SIMULATE', status: 'active', desc: 'Digital Twin AC Power Flow' },
    { id: 'detect', label: '3. DETECT', status: 'upcoming', desc: 'Voltage & Line Violations' },
    { id: 'correct', label: '4. CORRECT', status: 'upcoming', desc: 'BESS & Tie-Line Actions' },
    { id: 'verify', label: '5. VERIFY', status: 'upcoming', desc: 'Mitigated Grid Outcomes' },
  ]

  return (
    <Card className="border-[#DDD9C9] dark:border-[#2C3C2E] overflow-hidden">
      <CardHeader
        title="Grid Response"
        subtitle="Evaluate how the active network responds to forecasted operating conditions"
        icon={<Share2 className="w-4 h-4 text-[#A0C878]" />}
      />

      <CardContent className="p-5 space-y-6">
        {/* Pipeline Stages Progress Bar */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#788477] dark:text-[#859483]">
            Digital Twin Workflow Pipeline
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {pipelineSteps.map((step) => {
              const isCompleted = step.status === 'completed'
              const isActive = step.status === 'active'

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border text-xs transition-colors ${
                    isCompleted
                      ? 'bg-[#DDEB9D]/30 dark:bg-[#2D3E2F]/40 border-[#A0C878] text-[#26352A] dark:text-[#F2F5ED]'
                      : isActive
                      ? 'bg-[#FAF6E9] dark:bg-[#1E2B20] border-[#A0C878] dark:border-[#A0C878]/70 text-[#26352A] dark:text-[#F2F5ED] ring-1 ring-[#A0C878]/40'
                      : 'bg-[#FFFDF6] dark:bg-[#151F17] border-[#DDD9C9] dark:border-[#2C3C2E] text-[#788477] dark:text-[#859483] opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                    <span>{step.label}</span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#A0C878]" />
                    ) : isActive ? (
                      <span className="w-2 h-2 rounded-full bg-[#A0C878] animate-pulse" />
                    ) : null}
                  </div>
                  <div className="text-[10px] text-[#788477] dark:text-[#859483] mt-1 font-medium truncate">
                    {step.desc}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Callout Section */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#26352A] dark:text-[#F2F5ED] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#A0C878]" />
              <span>Grid Response Simulation</span>
            </h4>
            <p className="text-xs text-[#506052] dark:text-[#C2CCC0] max-w-xl leading-relaxed">
              Run the forecast through the Digital Twin to evaluate voltage, feeder loading, reverse flow, and other operating constraints on{' '}
              <strong className="text-[#26352A] dark:text-[#F2F5ED] font-semibold">{gridName}</strong> for{' '}
              <strong className="text-[#26352A] dark:text-[#F2F5ED] font-semibold">{simulationDate}</strong>.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={onRunSimulation}
            className="shrink-0 h-11 px-5 font-bold shadow-xs cursor-pointer"
          >
            Run Digital Twin Simulation
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default GridResponsePreview
