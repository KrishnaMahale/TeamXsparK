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
    <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md shadow-[0_8px_25px_rgba(16,80,55,0.06)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.3)] transition-all duration-300 overflow-hidden">
      <CardHeader
        title="Grid Response"
        subtitle="Evaluate how the active network responds to forecasted operating conditions"
        icon={<Share2 className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
      />

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Pipeline Stages Progress Bar */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#425B4C] dark:text-[#A7F3D0]">
            Digital Twin Workflow Pipeline
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {pipelineSteps.map((step) => {
              const isCompleted = step.status === 'completed'
              const isActive = step.status === 'active'

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border text-xs transition-all duration-200 hover:-translate-y-0.5 ${
                    isCompleted
                      ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 border-[#047857] dark:border-[#86EFAC] text-[#10251A] dark:text-white shadow-2xs'
                      : isActive
                      ? 'bg-white dark:bg-[#122C1F] border-[#047857] dark:border-[#86EFAC] text-[#10251A] dark:text-white ring-2 ring-[#10B981]/40 shadow-sm'
                      : 'bg-[#F4FAF5] dark:bg-[#0E2419]/60 border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 text-[#425B4C] dark:text-[#A7F3D0] opacity-80'
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
                  <div className="text-[10px] text-[#425B4C] dark:text-[#A7F3D0] mt-1 font-medium truncate">
                    {step.desc}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Callout Section */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#F4FAF5]/90 to-[#ECFDF3]/90 dark:from-[#0E2419]/90 dark:to-[#132F21]/90 border border-[#BBF7D0]/80 dark:border-[#86EFAC]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm backdrop-blur-sm">
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-[#10251A] dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />
              <span>Grid Response Simulation</span>
            </h4>
            <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] max-w-xl leading-relaxed font-medium">
              Run the forecast through the Digital Twin to evaluate voltage, feeder loading, reverse flow, and other operating constraints on{' '}
              <strong className="text-[#10251A] dark:text-white font-bold">{gridName}</strong> for{' '}
              <strong className="text-[#10251A] dark:text-white font-bold">{simulationDate}</strong>.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={onRunSimulation}
            className="shrink-0 h-11 px-5 font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            Run Digital Twin Simulation
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default GridResponsePreview
