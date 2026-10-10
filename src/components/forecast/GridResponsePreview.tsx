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
                  className={`p-3 rounded-xl border text-xs transition-colors ${
                    isCompleted
                      ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 border-[#047857] dark:border-[#86EFAC] text-[#10251A] dark:text-[#ECFDF3]'
                      : isActive
                      ? 'bg-white dark:bg-[#122C1F] border-[#047857] dark:border-[#86EFAC] text-[#10251A] dark:text-[#ECFDF3] ring-2 ring-[#10B981]/30'
                      : 'bg-[#F7FCF9] dark:bg-[#163826]/40 border-[#BBF7D0]/50 dark:border-[#86EFAC]/15 text-[#52665A] dark:text-[#A7F3D0] opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                    <span>{step.label}</span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    ) : isActive ? (
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                    ) : null}
                  </div>
                  <div className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] mt-1 font-medium truncate">
                    {step.desc}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Callout Section */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/70 dark:border-[#86EFAC]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#10251A] dark:text-[#ECFDF3] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />
              <span>Grid Response Simulation</span>
            </h4>
            <p className="text-xs text-[#52665A] dark:text-[#A7F3D0] max-w-xl leading-relaxed">
              Run the forecast through the Digital Twin to evaluate voltage, feeder loading, reverse flow, and other operating constraints on{' '}
              <strong className="text-[#10251A] dark:text-[#ECFDF3] font-semibold">{gridName}</strong> for{' '}
              <strong className="text-[#10251A] dark:text-[#ECFDF3] font-semibold">{simulationDate}</strong>.
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
