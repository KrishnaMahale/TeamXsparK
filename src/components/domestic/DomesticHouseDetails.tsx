import React, { useState } from 'react'
import {
  Sun,
  BatteryCharging,
  Zap,
  Home,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useDomesticStore } from '../../store/domesticStore'

export const DomesticHouseDetails: React.FC = () => {
  const { network, selectedHouseId, selectHouse, setControlAction, activeControl } = useDomesticStore()
  const [showTechnicalSpecs, setShowTechnicalSpecs] = useState(false)

  const house =
    network.houses.find((h) => h.id === selectedHouseId) || network.houses[0]

  if (!house) return null

  const isOverVoltage = house.telemetry.voltageV > 253.0
  const isNearLimit = house.telemetry.voltageV > 248.0 && !isOverVoltage
  const isUnbalanced = house.telemetry.voltageUnbalanceFactorPercent > 2.0
  const isExporting = house.telemetry.flowDirection === 'export'
  const isImporting = house.telemetry.flowDirection === 'import'

  const solar = house.rooftopSolar
  const battery = house.battery
  const consumption = house.consumption
  const telemetry = house.telemetry

  // Calculate intuitive power distribution percentages for visual bar
  const totalGen = solar.currentGenerationKw || 0.001
  const selfConsKw = Math.min(consumption.currentLoadKw, totalGen)
  const selfConsPct = Math.round((selfConsKw / totalGen) * 100)
  const exportKw = Math.max(0, telemetry.netPowerKw)
  const exportPct = Math.round((exportKw / totalGen) * 100)

  return (
    <Card className="flex flex-col border-[var(--border)] shadow-lg">
      {/* 1. Clean Header */}
      <CardHeader
        title={house.name}
        subtitle={`${house.address} • Phase ${house.phase} • ${house.distanceMeters}m from Transformer`}
        icon={<Home className="w-4 h-4 text-sky-500" />}
        action={
          <Badge
            variant={isOverVoltage ? 'danger' : isNearLimit ? 'warning' : 'success'}
            size="sm"
          >
            {isOverVoltage
              ? `${telemetry.voltageV}V Over-Voltage`
              : isNearLimit
              ? `${telemetry.voltageV}V High`
              : `${telemetry.voltageV}V Normal`}
          </Badge>
        }
      />

      <CardContent className="space-y-4 text-xs">
        {/* 2. Compact House Selector (H1 - H8) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {network.houses.map((h) => {
            const isSel = h.id === house.id
            const isCrit = h.telemetry.voltageV > 253.0
            const isHigh = h.telemetry.voltageV > 248.0 && !isCrit

            return (
              <button
                key={h.id}
                onClick={() => selectHouse(h.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 border ${
                  isSel
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : isCrit
                    ? 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20'
                    : isHigh
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface)]'
                }`}
              >
                <span>H{h.houseNumber}</span>
                {h.rooftopSolar.hasSolar && <span className="text-[10px] text-amber-400">☀</span>}
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isCrit ? 'bg-red-500 animate-pulse' : isHigh ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
              </button>
            )
          })}
        </div>

        {/* 3. Essential Core KPI Metrics (The 4 numbers that matter) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Terminal Voltage */}
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>Grid Voltage</span>
              <span className="font-mono text-[10px]">230V Base</span>
            </div>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                isOverVoltage ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-emerald-500'
              }`}
            >
              {telemetry.voltageV} V
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {isOverVoltage
                ? '+11.0% (Exceeds Limit)'
                : isNearLimit
                ? '+7.8% (Elevated)'
                : 'Within Statutory Limit'}
            </div>
          </div>

          {/* Net Smart Meter Flow */}
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
            <div className="text-[11px] text-[var(--text-muted)]">Net Grid Flow</div>
            <div
              className={`text-xl font-bold font-mono mt-1 flex items-center gap-1 ${
                isExporting ? 'text-amber-500' : isImporting ? 'text-sky-500' : 'text-emerald-500'
              }`}
            >
              {isExporting ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
              <span>{isExporting ? `+${telemetry.netPowerKw}` : `${telemetry.netPowerKw}`} kW</span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {isExporting ? 'Exporting to Street Feeder' : isImporting ? 'Drawing from Grid' : 'Zero Net Flow'}
            </div>
          </div>

          {/* Solar Generation */}
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
            <div className="text-[11px] text-[var(--text-muted)]">Solar Output</div>
            <div className="text-xl font-bold text-amber-500 font-mono mt-1">
              {solar.hasSolar ? `${solar.currentGenerationKw} kW` : '0 kW'}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {solar.hasSolar ? `${solar.installedCapacityKw} kWp Rooftop Array` : 'No Solar Installed'}
            </div>
          </div>

          {/* House Load */}
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
            <div className="text-[11px] text-[var(--text-muted)]">House Consumption</div>
            <div className="text-xl font-bold text-sky-500 font-mono mt-1">
              {consumption.currentLoadKw} kW
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {solar.hasSolar ? `${telemetry.selfConsumptionPercent}% Self-Consumed` : '100% Grid Dependent'}
            </div>
          </div>
        </div>

        {/* 4. Visual Power Flow Balance Bar (Easy to understand at a glance) */}
        {solar.hasSolar && (
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[var(--text-primary)]">Solar Generation Distribution</span>
              <span className="font-mono text-amber-500 font-bold">{solar.currentGenerationKw} kW Total</span>
            </div>

            {/* Split Progress Bar */}
            <div className="w-full h-3 rounded-full bg-[var(--surface)] overflow-hidden flex border border-[var(--border)]">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${Math.min(100, selfConsPct)}%` }}
                title={`Self Consumed: ${selfConsKw.toFixed(2)} kW`}
              />
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${Math.min(100, exportPct)}%` }}
                title={`Exported to Grid: ${exportKw.toFixed(2)} kW`}
              />
            </div>

            {/* Legend & Breakdown */}
            <div className="flex items-center justify-between text-[10px] pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                <span className="text-[var(--text-muted)]">Home:</span>
                <strong className="text-[var(--text-primary)] font-mono">{selfConsKw.toFixed(2)} kW</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[var(--text-muted)]">Exported:</span>
                <strong className="text-amber-500 font-mono">+{exportKw.toFixed(2)} kW</strong>
              </div>
            </div>
          </div>
        )}

        {/* 5. Battery Storage (Clean & Prominent if installed) */}
        {battery?.installed && (
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BatteryCharging className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-xs text-[var(--text-primary)]">{battery.brand}</span>
              </div>
              <Badge variant="success" size="sm">
                {battery.mode === 'charge'
                  ? 'Charging'
                  : battery.mode === 'discharge'
                  ? 'Discharging'
                  : 'Standby'}
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[var(--text-muted)]">Battery Charge (SOC):</span>
                <span className="text-emerald-500 font-mono font-bold">{battery.currentSocPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${battery.currentSocPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] pt-0.5">
                <span>Capacity: {battery.capacityKwh} kWh</span>
                <span>Power: {battery.currentPowerKw !== 0 ? `${battery.currentPowerKw} kW` : 'Idle'}</span>
              </div>
            </div>
          </div>
        )}

        {/* 6. Actionable Over-Voltage Alert (Only when Voltage > 253V) */}
        {isOverVoltage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-red-500 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Over-Voltage Detected ({telemetry.voltageV}V &gt; 253V Limit)</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Excessive solar export at 290m from the transformer is driving voltage past statutory limits.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Zap className="w-3.5 h-3.5" />}
                onClick={() => setControlAction('VOLT_VAR_DROOP')}
                className="w-full justify-center"
              >
                {activeControl === 'VOLT_VAR_DROOP' ? '✓ Volt-VAR Active' : 'Resolve with Volt-VAR Q(V)'}
              </Button>
              {battery?.installed && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<BatteryCharging className="w-3.5 h-3.5" />}
                  onClick={() => setControlAction('BATTERY_PEAK_SHAVING')}
                  className="w-full justify-center"
                >
                  {activeControl === 'BATTERY_PEAK_SHAVING' ? '✓ Shaving Active' : 'Battery Peak Shaving'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 7. Collapsible Advanced Technical Details (Hidden by default to avoid clutter) */}
        <div className="pt-1 border-t border-[var(--border)]">
          <button
            onClick={() => setShowTechnicalSpecs(!showTechnicalSpecs)}
            className="w-full py-2 px-3 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-sky-500" />
              <span>{showTechnicalSpecs ? 'Hide Technical Specifications' : 'View Technical Specifications'}</span>
            </div>
            {showTechnicalSpecs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showTechnicalSpecs && (
            <div className="mt-3 space-y-3 animate-fadeIn">
              {/* Daily Energy & Financial Yield */}
              {solar.hasSolar && (
                <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">Daily Green Yield</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {solar.dailyYieldKwh} kWh produced • {solar.avoidedCo2Kg} kg CO₂ avoided
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-emerald-500 text-sm">
                    +${telemetry.dailyCostSavings.toFixed(2)}/day
                  </div>
                </div>
              )}

              {/* Inverter & Phase Breakdown */}
              <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2 text-[11px]">
                <div className="font-bold text-xs text-[var(--text-primary)] pb-1 border-b border-[var(--border)]">
                  Grid Integration & Inverter
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Inverter Model:</span>
                    <span className="font-mono text-[var(--text-secondary)]">{solar.inverterModel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Operating Power Factor:</span>
                    <span className="font-mono text-sky-500 font-bold">{solar.operatingPowerFactor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Grid Frequency:</span>
                    <span className="font-mono text-[var(--text-secondary)]">{telemetry.frequencyHz} Hz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Harmonic Distortion (THD):</span>
                    <span className="font-mono text-[var(--text-secondary)]">{telemetry.thdVoltagePercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
