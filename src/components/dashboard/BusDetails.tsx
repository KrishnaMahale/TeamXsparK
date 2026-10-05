import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { useSelectedComponent } from '../../hooks/useSelectedComponent'
import { Bus, Feeder, SolarUnit, Battery, Load } from '../../types/network'
import {
  Zap,
  Activity,
  Thermometer,
  Cpu,
  Layers,
  Sun,
  BatteryMedium,
  TrendingDown,
  Info,
  MapPin,
} from 'lucide-react'
import { formatVoltage, formatPercent, formatTemp } from '../../utils/formatters'
import { Button } from '../ui/Button'

export const ComponentDetailsPanel: React.FC = () => {
  const { selectedComponent, setSelectedComponent } = useSelectedComponent()

  if (!selectedComponent) {
    return (
      <Card className="h-full">
        <CardHeader title="Component Telemetry" icon={<Info className="w-4 h-4 text-sky-600 dark:text-sky-400" />} />
        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
          <Layers className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-600" />
          <p className="text-xs">Select any bus node, line feeder, solar array, or battery on the network schematic to view dynamic engineering telemetry.</p>
        </CardContent>
      </Card>
    )
  }

  const { type, data } = selectedComponent

  // Render for Bus
  if (type === 'bus') {
    const bus = data as Bus
    const isCritical = bus.status === 'critical'

    return (
      <Card className="h-full">
        <CardHeader
          title={`Bus ${bus.id}`}
          subtitle={bus.name}
          icon={<Cpu className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
          action={<Badge variant={isCritical ? 'danger' : 'success'}>{bus.status}</Badge>}
        />
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Voltage */}
            <div className={`p-3 rounded-lg border ${
              isCritical
                ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80'
            }`}>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                <Zap className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Voltage</span>
              </div>
              <div className={`text-base font-bold font-mono mt-1 ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatVoltage(bus.voltage)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                Limit: {bus.voltageLimitMax?.toFixed(2) ?? '1.05'} pu
              </div>
            </div>

            {/* Line Loading */}
            <div className={`p-3 rounded-lg border ${
              (bus.lineLoadingPercent || 0) > 100
                ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80'
            }`}>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                <Activity className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Line Loading</span>
              </div>
              <div className={`text-base font-bold font-mono mt-1 ${bus.lineLoadingPercent > 100 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                {formatPercent(bus.lineLoadingPercent)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Threshold: 100%</div>
            </div>

            {/* Load */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                <TrendingDown className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Demand</span>
              </div>
              <div className="text-base font-bold font-mono mt-1 text-slate-800 dark:text-slate-200">
                {bus.loadKw} kW
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Branch Load</div>
            </div>

            {/* Solar */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Solar PV</span>
              </div>
              <div className="text-base font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">
                {bus.solarKw} kW
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Infeed</div>
            </div>
          </div>

          {/* Temperature */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-slate-700 dark:text-slate-300">Conductor Temperature</span>
            </div>
            <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
              {formatTemp(bus.temperatureC)}
            </span>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setSelectedComponent(null)}
            >
              Deselect Component
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render for Feeder
  if (type === 'feeder') {
    const feeder = data as Feeder
    const isCritical = feeder.status === 'critical'

    return (
      <Card className="h-full">
        <CardHeader
          title={`Feeder ${feeder.id}`}
          subtitle={feeder.name}
          icon={<Activity className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
          action={<Badge variant={isCritical ? 'danger' : 'success'}>{feeder.status}</Badge>}
        />
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`p-3 rounded-lg border ${
              isCritical
                ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80'
            }`}>
              <div className="text-xs text-slate-500 dark:text-slate-400">Loading %</div>
              <div className={`text-base font-bold font-mono mt-1 ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                {feeder.loadingPercent}%
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Limit: {feeder.loadingLimitPercent}%</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="text-xs text-slate-500 dark:text-slate-400">Active Flow</div>
              <div className="text-base font-bold font-mono mt-1 text-sky-700 dark:text-sky-300">
                {feeder.activePowerKw} kW
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Rating: {feeder.capacityKw} kW</div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Connected Path:</span>
              <span className="font-mono text-sky-700 dark:text-sky-300 font-medium">{feeder.fromBus} → {feeder.toBus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Line Type:</span>
              <span>{feeder.isReconfigurableAlternate ? 'Reconfigurable Tie-Line' : 'Standard Underground Feeder'}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setSelectedComponent(null)}
            >
              Deselect Feeder
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render for Solar
  if (type === 'solar') {
    const solar = data as SolarUnit
    return (
      <Card className="h-full">
        <CardHeader
          title={solar.name || 'Solar PV Installation'}
          subtitle={solar.id}
          icon={<Sun className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
          action={<Badge variant="success">Active</Badge>}
        />
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="text-xs text-slate-500 dark:text-slate-400">Current Output</div>
              <div className="text-base font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">
                {solar.generationKw} kW
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="text-xs text-slate-500 dark:text-slate-400">Installed Capacity</div>
              <div className="text-base font-bold font-mono mt-1 text-slate-800 dark:text-slate-200">
                {solar.capacityKw} kW
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400 flex justify-between">
            <span>Inverter Status:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Grid-Forming Sync (100%)</span>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setSelectedComponent(null)}
            >
              Deselect Solar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render for Battery
  if (type === 'battery') {
    const battery = data as Battery
    const isLowSoc = battery.socPercent <= 20
    return (
      <Card className="h-full">
        <CardHeader
          title={battery.name || 'Battery Storage BESS'}
          subtitle={battery.id}
          icon={<BatteryMedium className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          action={<Badge variant={isLowSoc ? 'danger' : 'success'}>{battery.status}</Badge>}
        />
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="text-xs text-slate-500 dark:text-slate-400">State of Charge</div>
              <div className={`text-base font-bold font-mono mt-1 ${isLowSoc ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {battery.socPercent}%
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="text-xs text-slate-500 dark:text-slate-400">Active Power</div>
              <div className="text-base font-bold font-mono mt-1 text-sky-700 dark:text-sky-300">
                {battery.powerKw} kW
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400 flex justify-between">
            <span>Total Capacity:</span>
            <span className="text-slate-800 dark:text-slate-200 font-mono font-medium">{battery.capacityKwh} kWh</span>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setSelectedComponent(null)}
            >
              Deselect Battery
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render for Load
  if (type === 'load') {
    const load = data as Load
    return (
      <Card className="h-full">
        <CardHeader
          title={`Load (${load.id})`}
          subtitle={load.name}
          icon={<TrendingDown className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
          action={<Badge variant="neutral">{load.name}</Badge>}
        />
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="text-xs text-slate-500 dark:text-slate-400">Active Demand</div>
              <div className="text-base font-bold font-mono mt-1 text-slate-800 dark:text-white">
                {load.powerKw} kW
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="text-xs text-slate-500 dark:text-slate-400">Power Factor</div>
              <div className="text-base font-bold font-mono mt-1 text-slate-700 dark:text-slate-300">
                {load.powerFactor.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setSelectedComponent(null)}
            >
              Deselect Load
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Fallback for transformer/grid
  return (
    <Card className="h-full">
      <CardHeader title="Substation Transformer" icon={<Zap className="w-4 h-4 text-sky-600 dark:text-sky-400" />} />
      <CardContent className="p-4 space-y-2 text-xs text-slate-700 dark:text-slate-300">
        <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Rating:</span>
          <span className="font-mono text-slate-800 dark:text-white font-medium">2500 kVA (33/11 kV)</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Transformer Loading:</span>
          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium">68.4% (Normal)</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-500 dark:text-slate-400">Regulation Mode:</span>
          <span className="text-sky-700 dark:text-sky-400 font-medium">On-Load Tap Changer (OLTC)</span>
        </div>
      </CardContent>
    </Card>
  )
}
