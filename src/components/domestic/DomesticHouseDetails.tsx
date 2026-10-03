import React, { useState } from 'react'
import {
  Sun,
  BatteryCharging,
  Zap,
  Home,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Cpu,
  ShieldCheck,
  Compass,
  DollarSign,
  Car,
  Activity,
  Gauge,
  Thermometer,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useDomesticStore } from '../../store/domesticStore'

export const DomesticHouseDetails: React.FC = () => {
  const { network, selectedHouseId, selectHouse, setControlAction } = useDomesticStore()
  const [activeTab, setActiveTab] = useState<'solar' | 'battery' | 'appliances' | 'power_quality'>('solar')

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

  return (
    <Card className="flex flex-col h-full border-[#1E293B] bg-[#0A1124] shadow-xl">
      <CardHeader
        title={house.name}
        subtitle={`${house.address} • Phase ${house.phase} • ${house.distanceMeters}m from Pole Transformer`}
        icon={<Home className="w-4 h-4 text-blue-400" />}
        action={
          <Badge
            variant={
              isOverVoltage ? 'danger' : isNearLimit || isUnbalanced ? 'warning' : 'success'
            }
            size="sm"
          >
            {isOverVoltage
              ? `${telemetry.voltageV}V Over-Voltage Active`
              : isNearLimit
              ? `${telemetry.voltageV}V High Voltage`
              : isUnbalanced
              ? `${telemetry.voltageUnbalanceFactorPercent}% Phase Unbalance`
              : 'IEEE 1547 Compliant'}
          </Badge>
        }
      />

      <CardContent className="space-y-4 text-xs">
        {/* House Selection Quick Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {network.houses.map((h) => {
            const isSel = h.id === house.id
            const isCrit = h.telemetry.voltageV > 253.0
            return (
              <button
                key={h.id}
                onClick={() => selectHouse(h.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSel
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                    : isCrit
                    ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/25'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
                }`}
              >
                <span>H{h.houseNumber}</span>
                {h.rooftopSolar.hasSolar && <span className="text-[10px] text-amber-500">☀</span>}
                {isCrit && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              </button>
            )
          })}
        </div>

        {/* 1. Real-Time Top KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Terminal Voltage */}
          <div className="p-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-between">
              <span>Terminal Voltage</span>
              <span className="font-mono text-[9px] text-[var(--text-muted)]">230V Base</span>
            </div>
            <div
              className={`text-base font-bold font-mono mt-0.5 ${
                isOverVoltage ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-emerald-500'
              }`}
            >
              {telemetry.voltageV} V
            </div>
            <div className="text-[10px] text-[var(--text-muted)] font-mono">
              {telemetry.voltagePu.toFixed(3)} pu ({isOverVoltage ? '+11.0%' : isNearLimit ? '+7.8%' : '+1.0%'})
            </div>
          </div>

          {/* Net Smart Meter */}
          <div className="p-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)]">Net Smart Meter</div>
            <div
              className={`text-base font-bold font-mono mt-0.5 flex items-center gap-1 ${
                isExporting ? 'text-amber-500 dark:text-amber-400' : isImporting ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-500'
              }`}
            >
              {isExporting ? <ArrowUpRight className="w-4 h-4" /> : isImporting ? <ArrowDownRight className="w-4 h-4" /> : null}
              <span>{isExporting ? `+${telemetry.netPowerKw}` : telemetry.netPowerKw} kW</span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {isExporting ? 'Exporting Surplus' : isImporting ? 'Grid Import' : 'Self-Sufficient'}
            </div>
          </div>

          {/* Solar Generation */}
          <div className="p-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)]">Solar AC Output</div>
            <div className="text-base font-bold text-amber-500 dark:text-amber-400 font-mono mt-0.5">
              {solar.currentGenerationKw} kW
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {solar.installedCapacityKw} kWp Array ({solar.panelCount} Panels)
            </div>
          </div>

          {/* Household Demand */}
          <div className="p-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)]">Active House Load</div>
            <div className="text-base font-bold text-sky-600 dark:text-sky-400 font-mono mt-0.5">
              {consumption.currentLoadKw} kW
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              Self-Cons: {telemetry.selfConsumptionPercent}%
            </div>
          </div>
        </div>

        {/* 2. Critical Over-Voltage Banner with 1-Click Mitigation */}
        {isOverVoltage && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>Critical Over-Voltage Detected ({telemetry.voltageV}V &gt; 253.0V Limit)</span>
              </div>
              <Badge variant="danger" size="sm">
                IEEE 1547 Breach
              </Badge>
            </div>
            <p className="text-[11px] leading-relaxed">
              At {house.distanceMeters}m from the transformer on Phase {house.phase}, net solar export of{' '}
              <strong className="text-[var(--text-primary)] font-bold">{telemetry.netPowerKw} kW</strong> exceeds local line hosting capacity, driving terminal voltage to {telemetry.voltageV}V. Prolonged over-voltage risks anti-islanding inverter trips and equipment degradation.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Zap className="w-3.5 h-3.5" />}
                onClick={() => setControlAction('VOLT_VAR_DROOP')}
              >
                Resolve with Volt-VAR Q(V) Inverter Control
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<BatteryCharging className="w-3.5 h-3.5" />}
                onClick={() => setControlAction('BATTERY_PEAK_SHAVING')}
              >
                Absorb with Home Battery Shaving
              </Button>
            </div>
          </div>
        )}

        {/* 3. Deep Telemetry Subsystem Tabs */}
        <div className="flex items-center gap-1 border-b border-[var(--border)] pb-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('solar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'solar'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Solar Generation ({solar.installedCapacityKw} kWp)</span>
          </button>

          <button
            onClick={() => setActiveTab('battery')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'battery'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
            }`}
          >
            <BatteryCharging className="w-3.5 h-3.5" />
            <span>Battery Storage ({battery?.installed ? `${battery.capacityKwh} kWh` : 'None'})</span>
          </button>

          <button
            onClick={() => setActiveTab('appliances')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'appliances'
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>House Loads ({consumption.currentLoadKw} kW)</span>
          </button>

          <button
            onClick={() => setActiveTab('power_quality')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'power_quality'
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Power Quality & Phase</span>
          </button>
        </div>

        {/* TAB 1: SOLAR GENERATION FULL DETAILS */}
        {activeTab === 'solar' && (
          <div className="space-y-3">
            {solar.hasSolar ? (
              <>
                {/* Solar Flow Diagram & Real-Time Inversion Card */}
                <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
                    <span className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      DC-to-AC Inversion & Conversion Pipeline
                    </span>
                    <Badge variant={solar.voltVarActive ? 'primary' : 'neutral'} size="sm">
                      {solar.voltVarActive ? 'Volt-VAR Active (PF 0.91)' : 'Unity PF (1.00)'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                      <div className="text-[var(--text-muted)] text-[10px]">Solar Irradiance</div>
                      <div className="font-bold font-mono text-amber-500 dark:text-amber-400 mt-0.5">
                        {solar.irradianceWm2} W/m²
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">{solar.azimuth}</div>
                    </div>

                    <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                      <div className="text-[var(--text-muted)] text-[10px]">PV Cell Temp (NOCT)</div>
                      <div className="font-bold font-mono text-orange-500 dark:text-orange-400 mt-0.5">
                        {solar.cellTemperatureC}°C
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">Amb: {solar.ambientTempC}°C (Pmax -0.32%)</div>
                    </div>

                    <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                      <div className="text-[var(--text-muted)] text-[10px]">DC Array Power</div>
                      <div className="font-bold font-mono text-amber-500 dark:text-amber-400 mt-0.5">
                        {solar.dcPowerGeneratedKw} kW DC
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {solar.inverterDcVoltageV}V • {solar.inverterDcCurrentA}A
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                      <div className="text-[var(--text-muted)] text-[10px]">AC Inverter Output</div>
                      <div className="font-bold font-mono text-emerald-500 mt-0.5">
                        {solar.inverterAcPowerKw} kW AC
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        Eff: {solar.inverterEfficiencyPercent}% • {solar.inverterAcCurrentA}A
                      </div>
                    </div>
                  </div>
                </div>

                {/* Array Specifications & Inverter Specs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2">
                    <span className="font-bold text-[var(--text-primary)] text-xs block pb-1 border-b border-[var(--border)]">
                      Rooftop PV Hardware Specifications
                    </span>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Cell Technology:</span>
                        <span className="font-mono text-[var(--text-secondary)]">{solar.cellTechnology}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Module Count & Rating:</span>
                        <span className="font-mono text-[var(--text-secondary)]">{solar.panelCount} × {solar.moduleWattageW}W ({solar.panelType})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Total Array Surface Area:</span>
                        <span className="font-mono text-[var(--text-secondary)]">{solar.totalSurfaceAreaM2} m²</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Roof Tilt & Compass Azimuth:</span>
                        <span className="font-mono text-[var(--text-secondary)]">{solar.tiltDeg}° Tilt • {solar.azimuth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">MPPT Controller Tracking:</span>
                        <span className="font-mono text-emerald-500 font-bold">{solar.mpptEfficiencyPercent}% Dual-Channel</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2">
                    <span className="font-bold text-[var(--text-primary)] text-xs block pb-1 border-b border-[var(--border)]">
                      Smart Inverter & Grid Integration
                    </span>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Inverter Model:</span>
                        <span className="font-mono text-[var(--text-secondary)]">{solar.inverterModel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Continuous AC Rating:</span>
                        <span className="font-mono text-[var(--text-secondary)]">{solar.inverterCapacityKw} kW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Operating Power Factor (cos φ):</span>
                        <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">{solar.operatingPowerFactor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Reactive Power Dispatch (Q):</span>
                        <span className="font-mono text-indigo-500 font-bold">{solar.reactivePowerKvar} kvar</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Volt-Watt Curtailment:</span>
                        <span className="font-mono text-[var(--text-secondary)]">
                          {solar.voltWattActive ? `${solar.curtailedKw} kW (${solar.curtailmentPercent}%)` : '0 kW (100% Retained)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Energy Yields & Carbon Offsets */}
                <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">Daily Green Solar Yield: {solar.dailyYieldKwh} kWh</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Monthly: ~{solar.monthlyYieldKwh} kWh • Lifetime: {solar.lifetimeMwh} MWh • Avoided CO₂: {solar.avoidedCo2Kg} kg
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-emerald-500 font-bold text-sm">
                    +${telemetry.dailyCostSavings.toFixed(2)}/day
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center bg-[var(--surface-secondary)] rounded-lg border border-[var(--border)] space-y-2">
                <Home className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                <div className="text-sm font-bold text-[var(--text-secondary)]">Pure Residential Consumer (No Rooftop Solar)</div>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                  This residence has no rooftop solar installation due to rental lease and heavy tree shading.
                  Under the neighborhood microgrid, it actively participates in Peer-to-Peer (P2P) local green energy sharing,
                  consuming surplus solar generated by adjacent homes at zero transmission penalty!
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BATTERY STORAGE */}
        {activeTab === 'battery' && (
          <div className="space-y-3">
            {battery?.installed ? (
              <>
                <div className="p-4 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">{battery.brand}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{battery.cellChemistry}</div>
                    </div>
                    <Badge variant="success" size="md">
                      {battery.mode === 'charge' ? 'Charging from Solar' : battery.mode === 'discharge' ? 'Discharging to House' : 'Standby'}
                    </Badge>
                  </div>

                  {/* Battery SOC Gauge */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--text-secondary)]">Usable State of Charge (SOC):</span>
                      <span className="text-emerald-500 font-mono text-sm">{battery.currentSocPercent}%</span>
                    </div>
                    <div className="w-full h-3.5 bg-[var(--surface)] rounded-full overflow-hidden p-0.5 border border-[var(--border)]">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${battery.currentSocPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                      <span>Reserve Floor: 10%</span>
                      <span>Usable Energy: {((battery.capacityKwh * battery.currentSocPercent) / 100).toFixed(1)} / {battery.usableCapacityKwh} kWh</span>
                      <span>Full: 100%</span>
                    </div>
                  </div>

                  {/* Battery Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                      <div className="text-[var(--text-muted)] text-[10px]">Real-Time Power</div>
                      <div className="font-bold font-mono text-[var(--text-primary)] mt-0.5">
                        {battery.currentPowerKw < 0 ? `-${Math.abs(battery.currentPowerKw)} kW (Chg)` : battery.currentPowerKw > 0 ? `+${battery.currentPowerKw} kW (Dischg)` : '0.0 kW'}
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                      <div className="text-[var(--text-muted)] text-[10px]">Max Power Limits</div>
                      <div className="font-bold font-mono text-[var(--text-secondary)] mt-0.5">
                        {battery.maxChargeKw} kW / {battery.maxDischargeKw} kW
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                      <div className="text-[var(--text-muted)] text-[10px]">Roundtrip Efficiency</div>
                      <div className="font-bold font-mono text-emerald-500 mt-0.5">
                        {battery.roundTripEfficiencyPercent}%
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                      <div className="text-[var(--text-muted)] text-[10px]">Pack Health & Cycles</div>
                      <div className="font-bold font-mono text-[var(--text-secondary)] mt-0.5">
                        {battery.healthPercent}% SOH • {battery.cycleCount} Cyc
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center bg-[var(--surface-secondary)] rounded-lg border border-[var(--border)] space-y-2">
                <BatteryCharging className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                <div className="text-sm font-bold text-[var(--text-secondary)]">No Energy Storage Installed</div>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                  All solar generation not consumed immediately is fed directly into the low-voltage street feeder.
                  Adding a 10kWh home battery would allow soaking up {solar.currentGenerationKw} kW of peak solar generation
                  and avoiding end-of-line voltage rise!
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HOUSEHOLD APPLIANCES & LOAD BREAKDOWN */}
        {activeTab === 'appliances' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
                <span className="font-bold text-[var(--text-primary)] text-xs">Live Appliance Load Matrix</span>
                <span className="font-mono text-xs text-sky-600 dark:text-sky-400 font-bold">
                  Total Active: {consumption.currentLoadKw} kW
                </span>
              </div>

              <div className="space-y-1.5">
                {consumption.activeAppliances.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[var(--text-secondary)] font-medium text-xs">{app.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-secondary)] px-2 py-0.5 rounded border border-[var(--border)]">
                        Source: <strong className="text-amber-500 uppercase">{app.powerSource}</strong>
                      </span>
                      <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">
                        {app.powerKw} kW
                      </span>
                    </div>
                  </div>
                ))}

                {consumption.hasEv && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)] border border-sky-500/30">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-sky-500" />
                      <div>
                        <div className="text-[var(--text-secondary)] font-medium text-xs">Level 2 EV Smart Charger (V1G)</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Vehicle SOC: {consumption.evSocPercent}%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={consumption.evCharging ? 'primary' : 'neutral'} size="sm">
                        {consumption.evCharging ? 'Charging Active' : 'Standby'}
                      </Badge>
                      <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">
                        {consumption.evCharging ? `${consumption.evPowerKw} kW` : '0 kW'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Self-Consumption Breakdown */}
            <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] grid grid-cols-3 gap-2 text-[11px]">
              <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                <div className="text-[var(--text-muted)] text-[10px]">Powered by Solar</div>
                <div className="font-bold font-mono text-amber-500 dark:text-amber-400 text-sm mt-0.5">
                  {consumption.solarSelfConsumedKw} kW
                </div>
              </div>
              <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                <div className="text-[var(--text-muted)] text-[10px]">Powered by Battery</div>
                <div className="font-bold font-mono text-emerald-500 text-sm mt-0.5">
                  {consumption.batterySelfConsumedKw} kW
                </div>
              </div>
              <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                <div className="text-[var(--text-muted)] text-[10px]">Drawn from Grid</div>
                <div className="font-bold font-mono text-sky-600 dark:text-sky-400 text-sm mt-0.5">
                  {consumption.gridImportConsumedKw} kW
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: POWER QUALITY & 3-PHASE METRICS */}
        {activeTab === 'power_quality' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
                <span className="font-bold text-[var(--text-primary)] text-xs">Three-Phase Voltage Balance (L1 / L2 / L3)</span>
                <Badge variant={isUnbalanced ? 'warning' : 'success'} size="sm">
                  VUF: {telemetry.voltageUnbalanceFactorPercent}% ({isUnbalanced ? '> 2.0% IEEE 1159' : 'Balanced'})
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className={`p-2.5 rounded-lg border ${house.phase === 'L1' ? 'bg-sky-500/10 border-sky-500' : 'bg-[var(--surface)] border-[var(--border)]'}`}>
                  <div className="text-[var(--text-muted)] text-[10px]">Phase L1 Voltage</div>
                  <div className="font-bold font-mono text-sm text-[var(--text-secondary)] mt-0.5">
                    {telemetry.phaseVoltageL1} V
                  </div>
                  {house.phase === 'L1' && <span className="text-[9px] text-sky-500 font-bold">CONNECTED PHASE</span>}
                </div>

                <div className={`p-2.5 rounded-lg border ${house.phase === 'L2' ? 'bg-amber-500/10 border-amber-500' : 'bg-[var(--surface)] border-[var(--border)]'}`}>
                  <div className="text-[var(--text-muted)] text-[10px]">Phase L2 Voltage</div>
                  <div className={`font-bold font-mono text-sm mt-0.5 ${telemetry.phaseVoltageL2 > 253 ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}>
                    {telemetry.phaseVoltageL2} V
                  </div>
                  {house.phase === 'L2' && <span className="text-[9px] text-amber-500 font-bold">CONNECTED PHASE</span>}
                </div>

                <div className={`p-2.5 rounded-lg border ${house.phase === 'L3' ? 'bg-cyan-500/10 border-cyan-500' : 'bg-[var(--surface)] border-[var(--border)]'}`}>
                  <div className="text-[var(--text-muted)] text-[10px]">Phase L3 Voltage</div>
                  <div className="font-bold font-mono text-sm text-[var(--text-secondary)] mt-0.5">
                    {telemetry.phaseVoltageL3} V
                  </div>
                  {house.phase === 'L3' && <span className="text-[9px] text-cyan-500 font-bold">CONNECTED PHASE</span>}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Total Harmonic Distortion (THD_V):</span>
                <span className="font-mono text-[var(--text-secondary)]">{telemetry.thdVoltagePercent}% (IEEE 519 Limit: 5.0%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Grid Frequency:</span>
                <span className="font-mono text-[var(--text-secondary)]">{telemetry.frequencyHz} Hz (Nominal 50.00 Hz)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Service Line Current:</span>
                <span className="font-mono text-[var(--text-secondary)]">{telemetry.currentAmps} A RMS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Branch Cable $I^2R$ Loss:</span>
                <span className="font-mono text-[var(--text-secondary)]">{telemetry.lineLossesKw} kW</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
