import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react'
import { useCorrectiveActions } from '../../hooks/useCorrectiveActions'

export const BeforeAfterComparison: React.FC = () => {
  const { comparisonData, selectedAction } = useCorrectiveActions()

  const isB3Improved = comparisonData.b3Voltage.after <= comparisonData.b3Voltage.limit
  const isF02Improved = comparisonData.f02Loading.after <= comparisonData.f02Loading.limit

  return (
    <Card className="h-full flex flex-col" glowColor={comparisonData.isSafe ? 'emerald' : 'amber'}>
      <CardHeader
        title="Before / After Comparison"
        subtitle={`Action Target: ${comparisonData.selectedActionTitle}`}
        icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        action={
          <Badge variant={comparisonData.isSafe ? 'success' : 'danger'}>
            {comparisonData.isSafe ? '✓ Network is Safe' : 'Constraint Remaining'}
          </Badge>
        }
      />
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* 1. B3 Voltage */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400">B3 Voltage</div>
            <div className="flex items-center gap-2 mt-1.5 font-mono">
              <span className="text-xs text-rose-400 font-bold">
                {comparisonData.b3Voltage.before.toFixed(3)} pu
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span
                className={`text-sm font-bold ${
                  isB3Improved ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {comparisonData.b3Voltage.after.toFixed(3)} pu
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Limit: 1.050 pu</div>
          </div>

          {/* 2. Feeder F-02 Load */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400">Feeder F-02 Load</div>
            <div className="flex items-center gap-2 mt-1.5 font-mono">
              <span className="text-xs text-rose-400 font-bold">
                {comparisonData.f02Loading.before}%
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span
                className={`text-sm font-bold ${
                  isF02Improved ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {comparisonData.f02Loading.after}%
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Capacity Limit: 100%</div>
          </div>

          {/* 3. Solar Used */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400">Solar Used</div>
            <div className="flex items-center gap-2 mt-1.5 font-mono">
              <span className="text-xs text-slate-300">
                {comparisonData.solarUsed.before} kW
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-sm font-bold text-emerald-400">
                {comparisonData.solarUsed.after} kW
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Generation Preserved: {comparisonData.renewableUseMaintainedPercent}%
            </div>
          </div>

          {/* 4. Battery SOC */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400">Battery SOC</div>
            <div className="flex items-center gap-2 mt-1.5 font-mono">
              <span className="text-xs text-slate-300">
                {comparisonData.batterySoc.before}%
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-sm font-bold text-cyan-400">
                {comparisonData.batterySoc.after}%
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Reserve Floor: 20%</div>
          </div>
        </div>

        {/* Status Callout Bar */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
            comparisonData.isSafe
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {comparisonData.isSafe ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>
              {comparisonData.isSafe
                ? 'Optimal power flow verified. Feeder overload and bus over-voltage successfully mitigated.'
                : 'Current action leaves constraints active. Alternative reconfiguration required.'}
            </span>
          </div>
          <div className="font-mono font-bold text-emerald-400">
            Renewable use maintained: {comparisonData.renewableUseMaintainedPercent}%
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
