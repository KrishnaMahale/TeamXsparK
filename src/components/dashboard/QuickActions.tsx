import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Sliders, GitCompare, Play, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { useCorrectiveActions } from '../../hooks/useCorrectiveActions'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'

export const QuickActions: React.FC = () => {
  const { actions, selectedAction, isRunning, runAnalysis, executeAction, selectAction } =
    useCorrectiveActions()
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false)
  const navigate = useNavigate()

  const handleRunCorrectiveActions = async () => {
    await runAnalysis()
    setIsActionsModalOpen(true)
  }

  const handleExecute = async (actionId: string) => {
    await executeAction(actionId)
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader
          title="Quick Actions"
          subtitle="Grid optimization & dispatch engine"
          icon={<Sliders className="w-4 h-4 text-cyan-400" />}
        />
        <CardContent className="flex flex-col gap-3 flex-1 justify-center">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            isLoading={isRunning}
            leftIcon={<Play className="w-4 h-4" />}
            onClick={handleRunCorrectiveActions}
          >
            Run Corrective Actions
          </Button>

          <Button
            variant="secondary"
            size="md"
            className="w-full"
            leftIcon={<GitCompare className="w-4 h-4 text-cyan-400" />}
            onClick={() => navigate('/actions')}
          >
            View Scenario Comparison
          </Button>
        </CardContent>
      </Card>

      {/* Interactive Modal to Review and Apply Corrective Actions */}
      <Modal
        isOpen={isActionsModalOpen}
        onClose={() => setIsActionsModalOpen(false)}
        title="Optimal Corrective Actions"
        subtitle="Evaluated dispatch options to resolve active grid constraints"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="text-xs text-slate-300">
            The optimization engine evaluated <span className="font-bold text-cyan-400">{actions.length} action scenarios</span> against nodal voltage and thermal limits. Select an action to dispatch or compare:
          </div>

          <div className="space-y-3">
            {actions.map((action) => {
              const isFeasible = action.isFeasible
              const isSelected = selectedAction?.id === action.id

              return (
                <div
                  key={action.id}
                  onClick={() => selectAction(action)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                      : isFeasible
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      : 'bg-red-950/20 border-red-500/30 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{action.title}</span>
                        <Badge variant={isFeasible ? 'success' : 'danger'}>
                          {isFeasible ? 'Feasible' : 'Not Feasible'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{action.description}</p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-950/80 border border-slate-700 text-cyan-300">
                      {action.parameterDelta}
                    </span>
                  </div>

                  {!isFeasible && (
                    <div className="mt-2.5 p-2 rounded bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{action.infeasibleReason}</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono">
                    <span className="text-slate-400">
                      Est. B3 Voltage: <span className={action.expectedVoltagePu <= 1.05 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>{action.expectedVoltagePu} pu</span>
                    </span>
                    <span className="text-slate-400">
                      Est. F-02 Load: <span className={action.expectedFeederLoadPercent <= 100 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>{action.expectedFeederLoadPercent}%</span>
                    </span>
                    {isFeasible ? (
                      <Button
                        size="sm"
                        variant={isSelected ? 'success' : 'outline'}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExecute(action.id)
                          setIsActionsModalOpen(false)
                        }}
                      >
                        Apply Action
                      </Button>
                    ) : (
                      <span className="text-[11px] text-rose-400 font-semibold uppercase">Infeasible</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsActionsModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => {
                setIsActionsModalOpen(false)
                navigate('/actions')
              }}
            >
              Full Comparison Table
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
