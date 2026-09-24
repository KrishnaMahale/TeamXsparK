import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { SimulationProgressStep } from '../../types/simulation'
import { CheckCircle2, Loader2, ArrowRight, Activity, ShieldCheck } from 'lucide-react'

interface SimulationProgressModalProps {
  isOpen: boolean
  onClose: () => void
  steps: SimulationProgressStep[]
  currentIndex: number
  onViewResults: () => void
}

export const SimulationProgressModal: React.FC<SimulationProgressModalProps> = ({
  isOpen,
  onClose,
  steps,
  currentIndex,
  onViewResults,
}) => {
  const isComplete = currentIndex >= steps.length

  return (
    <Modal
      isOpen={isOpen}
      onClose={isComplete ? onClose : () => {}}
      title="Digital Twin Simulation Pipeline"
      subtitle="Solving power flow and constraint checking across time-series intervals"
      maxWidth="lg"
    >
      <div className="space-y-5 py-1">
        {/* Progress Pipeline Steps */}
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const isDone = step.status === 'done'
            const isCurrent = step.status === 'processing'

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                  isDone
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : isCurrent
                    ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-[10px] font-mono text-slate-500">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-xs font-bold tracking-wide uppercase ${
                        isDone
                          ? 'text-emerald-300'
                          : isCurrent
                          ? 'text-white'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.title}
                    </h4>
                    <span className="text-[10px] font-mono">
                      {isDone ? '✓ Completed' : isCurrent ? '● Processing...' : '○ Waiting'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{step.subtitle}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Completion Action */}
        {isComplete && (
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Power flow converged. Violations detected and corrective actions formulated.
            </span>
            <Button
              variant="primary"
              size="md"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={onViewResults}
            >
              Analyze Grid Results
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
