import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { NetworkLimitsConfig } from '../../types/simulation'
import { Settings2, Network, ToggleLeft, ToggleRight } from 'lucide-react'

interface NetworkConfigPanelProps {
  config: NetworkLimitsConfig
  onChange: (updates: Partial<NetworkLimitsConfig>) => void
}

export const NetworkConfigPanel: React.FC<NetworkConfigPanelProps> = ({ config, onChange }) => {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Network & Topology Configuration"
        subtitle="Set statutory voltage bounds, equipment thermal limits, and feeder routing"
        icon={<Settings2 className="w-4 h-4 text-cyan-400" />}
      />
      <CardContent className="space-y-4">
        {/* Technical Limit Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block">Voltage Min (pu)</span>
            <input
              type="number"
              step="0.01"
              min="0.8"
              max="1.0"
              value={config.voltageMinPu}
              onChange={(e) => onChange({ voltageMinPu: parseFloat(e.target.value) || 0.95 })}
              className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
            <span className="text-[10px] text-slate-500 block">Standard: 0.95 pu</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block">Voltage Max (pu)</span>
            <input
              type="number"
              step="0.01"
              min="1.0"
              max="1.2"
              value={config.voltageMaxPu}
              onChange={(e) => onChange({ voltageMaxPu: parseFloat(e.target.value) || 1.05 })}
              className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
            <span className="text-[10px] text-slate-500 block">Standard: 1.05 pu</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block">Feeder Ampacity (%)</span>
            <input
              type="number"
              min="50"
              max="150"
              value={config.feederLoadingLimitPercent}
              onChange={(e) =>
                onChange({ feederLoadingLimitPercent: parseFloat(e.target.value) || 100 })
              }
              className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
            <span className="text-[10px] text-slate-500 block">Max Continuous: 100%</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block">Substation Limit (%)</span>
            <input
              type="number"
              min="50"
              max="150"
              value={config.transformerLoadingLimitPercent}
              onChange={(e) =>
                onChange({ transformerLoadingLimitPercent: parseFloat(e.target.value) || 100 })
              }
              className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
            <span className="text-[10px] text-slate-500 block">Transformer: 100%</span>
          </div>
        </div>

        {/* Feeder Topology Switch Selector */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Distribution Feeder Topology
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Select active switching state between radial Feeder F-02 and tie-line Feeder F-03
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onChange({ feederTopology: 'normal' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                config.feederTopology === 'normal'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              Normal (F-02 Closed)
            </button>
            <button
              onClick={() => onChange({ feederTopology: 'alternative' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                config.feederTopology === 'alternative'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              Reconfigured (F-03 Tie Closed)
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
