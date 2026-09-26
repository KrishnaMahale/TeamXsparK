import React from 'react'
import {
  Sun,
  Moon,
  BatteryCharging,
  CloudSun,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Cpu,
  Car,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useDomesticStore } from '../../store/domesticStore'
import { DomesticPreset, DomesticControlAction } from '../../types/domestic'

export const DomesticControlPanel: React.FC = () => {
  const {
    activePreset,
    activeControl,
    setPreset,
    setControlAction,
    network,
    reset,
  } = useDomesticStore()

  const presets: Array<{
    id: DomesticPreset
    name: string
    description: string
    icon: any
    highlight: string
  }> = [
    {
      id: 'SUNNY_NOON_EXPORT',
      name: 'Sunny Noon Peak (Clear Sky)',
      description: '980 W/m² irradiance, peak rooftop solar backfeed, triggers critical 255.4V over-voltage and phase unbalance.',
      icon: Sun,
      highlight: 'Critical Voltage Rise',
    },
    {
      id: 'EVENING_PEAK',
      name: 'Evening Residential Peak',
      description: '0 W/m² (sunset), domestic cooking, HVAC, EV charging stress, creates feeder voltage sag below 216V.',
      icon: Moon,
      highlight: 'Heavy Grid Demand',
    },
    {
      id: 'BALANCED_STORAGE',
      name: 'High Self-Consumption',
      description: 'Solar surplus soaked by 5 home batteries, stable 234V profile, P2P neighbor sharing.',
      icon: BatteryCharging,
      highlight: 'Microgrid Autonomy',
    },
    {
      id: 'OVERCAST_IMPORT',
      name: 'Overcast / Stormy Day',
      description: 'Intermittent 28% solar irradiance, baseline grid supplement from 11kV distribution transformer.',
      icon: CloudSun,
      highlight: 'Grid Dependent',
    },
  ]

  const controlActions: Array<{
    id: DomesticControlAction
    title: string
    category: string
    standard: string
    description: string
    impact: string
    icon: any
  }> = [
    {
      id: 'NONE',
      title: 'Uncoordinated Baseline',
      category: 'No Control',
      standard: 'Default Grid Tie',
      description: 'Standard rooftop solar feed-in at unity power factor with no autonomous voltage support.',
      impact: 'End-of-line houses experience severe over-voltage violations (> 253V)',
      icon: Sliders,
    },
    {
      id: 'VOLT_VAR_DROOP',
      title: 'Volt-VAR Droop Control',
      category: 'Inverter Autonomous',
      standard: 'IEEE 1547-2018 Cat B',
      description: 'Smart inverters autonomously absorb inductive reactive power (Q < 0, cos φ = 0.91) as voltage rises above 245V.',
      impact: 'Flattens voltage hump (255.4V → 247.9V) without curtailing a single watt of solar kWh!',
      icon: Zap,
    },
    {
      id: 'VOLT_WATT_THROTTLE',
      title: 'Volt-Watt Soft Curtailment',
      category: 'Inverter Active Derating',
      standard: 'IEEE 1547 P(V) Curve',
      description: 'Gradually derates active export on remote houses (House 08 capped at 4.8 kW) during extreme solar noon.',
      impact: 'Cuts over-voltage (255.4V → 248.8V) while preserving 88% overall community solar yield.',
      icon: Sparkles,
    },
    {
      id: 'TRANSFORMER_TAP_CHANGE',
      title: 'Transformer Tap Adjustment (OLTC)',
      category: 'Utility Infrastructure',
      standard: 'ANSI C84.1 Tap Stepping',
      description: 'Adjusts pole transformer secondary tap from 1.00 down to -2.5% step (224.25V base voltage).',
      impact: 'Lowers entire street voltage envelope by 5.75V, resolving all violations (peak drops to 242.5V).',
      icon: Layers,
    },
    {
      id: 'BATTERY_PEAK_SHAVING',
      title: 'Coordinated Home Battery Shaving',
      category: 'DER Storage Dispatch',
      standard: 'Automated Demand Response',
      description: 'Dispatches all residential batteries to absorb 14.5 kW total surplus during solar peak hours.',
      impact: 'Eliminates street backfeed, pulling peak voltage down to 238.4V and raising self-consumption to 82%.',
      icon: BatteryCharging,
    },
    {
      id: 'EV_SMART_CHARGING',
      title: 'EV Smart Solar-Matching (V1G)',
      category: 'E-Mobility Demand Response',
      standard: 'ISO 15118 Managed Charging',
      description: 'Dynamically commands parked EVs to charge at 4.2 kW when rooftop solar surplus is available.',
      impact: 'Absorbs 8.4 kW directly into EV vehicle packs, relieving feeder congestion.',
      icon: Car,
    },
    {
      id: 'PHASE_REBALANCING',
      title: 'Dynamic Phase Rebalancing',
      category: 'Topological Phase Balance',
      standard: 'IEEE 1159 VUF Standard',
      description: 'Transfers high-export single-phase inverters from overloaded Phase L2 onto under-utilized Phase L1.',
      impact: 'Reduces Voltage Unbalance Factor from 3.1% → 1.1%, balancing transformer phase loading.',
      icon: Cpu,
    },
  ]

  const isMitigated = activeControl !== 'NONE'
  const hasCritical = network.overVoltageHousesCount > 0
  const isUnbalanced = network.phaseUnbalanceMaxPercent > 2.0

  return (
    <Card className="flex flex-col h-full border-[#1E293B] bg-[#0A1124] shadow-xl">
      <CardHeader
        title="Microgrid Scenarios & Violation Resolution Engine"
        subtitle="Simulate real-world conditions and test industrial-grade voltage mitigation controls"
        icon={<Sliders className="w-4 h-4 text-blue-400" />}
        action={
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={reset}
          >
            Reset
          </Button>
        }
      />

      <CardContent className="space-y-5 text-xs">
        {/* Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              1. Diurnal Weather & Load Scenario
            </span>
            <span className="text-slate-400 text-[10px]">Click to apply scenario</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.map((preset) => {
              const isSelected = activePreset === preset.id
              const Icon = preset.icon
              return (
                <button
                  key={preset.id}
                  onClick={() => setPreset(preset.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-950/70 border-blue-500 shadow-md ring-1 ring-blue-500'
                      : 'bg-[#0E172C] border-[#1E293B] hover:border-slate-600 hover:bg-[#111C35]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-md ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-[#16223F] text-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-white text-xs">{preset.name}</span>
                    </div>
                    <Badge variant={isSelected ? 'primary' : 'neutral'} size="sm">
                      {preset.highlight}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-snug line-clamp-2">
                    {preset.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Violation Resolution Actions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              2. Grid Violation Resolving Actions
            </span>
            <Badge variant={isMitigated ? 'success' : 'neutral'} size="sm">
              {isMitigated ? 'Mitigation Active ✓' : 'Baseline Uncoordinated'}
            </Badge>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
            {controlActions.map((action) => {
              const isSelected = activeControl === action.id
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => setControlAction(action.id)}
                  className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-[#122647] border-blue-500 ring-1 ring-blue-500'
                      : 'bg-[#0E172C] border-[#1E293B] hover:border-slate-600 hover:bg-[#111C35]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-md ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-[#16223F] text-slate-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{action.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{action.standard}</div>
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                        ACTIVE DISPATCH
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">{action.category}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    {action.description}
                  </p>
                  <div className="mt-1 text-[10px] text-emerald-400 font-medium">
                    ✓ {action.impact}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Quantitative Compliance Results Audit */}
        <div className="p-3 rounded-lg bg-[#0E172C] border border-[#1E293B] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-xs">Feeder Violation Audit</span>
            <Badge variant={hasCritical ? 'danger' : isUnbalanced ? 'warning' : 'success'} size="sm">
              {hasCritical ? `${network.overVoltageHousesCount} Violations Active` : isUnbalanced ? 'Phase Warning' : '100% Compliant'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="p-1.5 rounded bg-[#111C35]">
              <div className="text-slate-400 text-[10px]">Peak Voltage</div>
              <div
                className={`font-mono font-bold text-sm mt-0.5 ${
                  hasCritical ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {network.peakVoltageV} V
              </div>
            </div>

            <div className="p-1.5 rounded bg-[#111C35]">
              <div className="text-slate-400 text-[10px]">Phase Unbalance (VUF)</div>
              <div
                className={`font-mono font-bold text-sm mt-0.5 ${
                  isUnbalanced ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {network.phaseUnbalanceMaxPercent}%
              </div>
            </div>

            <div className="p-1.5 rounded bg-[#111C35]">
              <div className="text-slate-400 text-[10px]">Net Grid Export</div>
              <div className="font-mono font-bold text-amber-300 text-sm mt-0.5">
                +{network.netGridExchangeKw} kW
              </div>
            </div>

            <div className="p-1.5 rounded bg-[#111C35]">
              <div className="text-slate-400 text-[10px]">Feeder Line Losses</div>
              <div className="font-mono font-bold text-slate-200 text-sm mt-0.5">
                {network.totalLineLossesKw} kW
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
