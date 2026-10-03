import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { SimulationProgressStep } from '../../types/simulation'
import { CheckCircle2, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'

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
      subtitle="Solving AC power flow and constraint checking across time-series intervals"
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
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : isCurrent
                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 text-sky-900 dark:text-sky-200 ring-1 ring-sky-400'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-sky-600 dark:text-sky-400 animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] font-mono text-slate-400">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-xs font-bold tracking-wide uppercase ${
                        isDone
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : isCurrent
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.title}
                    </h4>
                    <span className="text-[10px] font-mono">
                      {isDone ? '✓ Completed' : isCurrent ? '● Processing...' : '○ Waiting'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{step.subtitle}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Completion Action */}
        {isComplete && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Power flow converged. Violations detected and corrective actions formulated.
            </span>
            <Button
              variant="primary"
              size="md"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={onViewResults}
              className="shrink-0 font-bold"
            >
              Analyze Grid Results
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
