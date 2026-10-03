import React from 'react'
import {
  Sun,
  Home,
  TrendingDown,
  Activity,
  BatteryCharging,
  Zap,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { useDomesticStore } from '../../store/domesticStore'

export const DomesticCommunityMetrics: React.FC = () => {
  const { network, currentTime } = useDomesticStore()

  const solarHousesCount = network.houses.filter((h) => h.rooftopSolar.hasSolar).length
  const overVoltageCount = network.overVoltageHousesCount
  const hasCritical = overVoltageCount > 0
  const isExportingToGrid = network.netGridExchangeKw > 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Neighborhood Solar Generation */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-muted)] font-medium">Total Rooftop Solar</div>
            <div className="text-lg font-bold text-amber-500 dark:text-amber-400 font-mono mt-1">
              {network.totalGenerationKw} kW
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {solarHousesCount} Rooftops Active (47.1 kWp)
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Sun className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Domestic Household Load */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-muted)] font-medium">Household Demand</div>
            <div className="text-lg font-bold text-sky-600 dark:text-sky-400 font-mono mt-1">
              {network.totalLoadKw} kW
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              8 Residences • Avg {(network.totalLoadKw / 8).toFixed(1)} kW
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Home className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Distribution Transformer Exchange */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-muted)] font-medium">Transformer Power Flow</div>
            <div
              className={`text-lg font-bold font-mono mt-1 ${
                isExportingToGrid ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'
              }`}
            >
              {isExportingToGrid ? `▲ Export +${network.netGridExchangeKw}` : `▼ Import ${Math.abs(network.netGridExchangeKw)}`} kW
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              TX Load: {network.transformer.loadingPercent}% ({network.transformer.currentLoadKva} kVA)
            </div>
          </div>
          <div
            className={`p-2.5 rounded-lg ${
              isExportingToGrid
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
            }`}
          >
            <Zap className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Feeder Voltage & Over-Voltage Status */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-muted)] font-medium">Feeder Voltage State</div>
            <div
              className={`text-lg font-bold font-mono mt-1 ${
                hasCritical ? 'text-red-500' : 'text-emerald-500'
              }`}
            >
              {hasCritical ? `${network.peakVoltageV} V Peak` : `${network.peakVoltageV} V Safe`}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {hasCritical
                ? `${overVoltageCount} House > 253V Limit`
                : '100% within IEEE 1547'}
            </div>
          </div>
          <div
            className={`p-2.5 rounded-lg ${
              hasCritical
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {hasCritical ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
