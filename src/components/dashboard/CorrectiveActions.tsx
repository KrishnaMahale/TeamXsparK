import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Sliders, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { useCorrectiveActions } from '../../hooks/useCorrectiveActions'
import { useNavigate } from 'react-router-dom'

export const CorrectiveActions: React.FC = () => {
  const { actions, selectedAction, selectAction } = useCorrectiveActions()
  const navigate = useNavigate()

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        title="Corrective Actions"
        subtitle="Ranked solutions for active violations"
        icon={<Sliders className="w-4 h-4 text-cyan-400" />}
        action={
          <button
            onClick={() => navigate('/actions')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
          >
            <span>Compare</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      />
      <CardContent className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {actions.map((act) => {
          const isSelected = selectedAction?.id === act.id
          const isFeasible = act.isFeasible

          return (
            <div
              key={act.id}
              onClick={() => selectAction(act)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100">{act.title}</span>
                  <Badge variant={isFeasible ? 'success' : 'danger'}>
                    {isFeasible ? 'Feasible' : 'Not Feasible'}
                  </Badge>
                </div>
                <span className="text-[11px] font-mono text-cyan-300 font-semibold">
                  {act.parameterDelta}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{act.description}</p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
