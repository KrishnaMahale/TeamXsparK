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
            <div className="text-xs text-slate-400 font-medium">Total Rooftop Solar</div>
            <div className="text-lg font-bold text-amber-400 font-mono mt-1">
              {network.totalGenerationKw} kW
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {solarHousesCount} Rooftops Active (47.1 kWp)
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800">
            <Sun className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Domestic Household Load */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Household Demand</div>
            <div className="text-lg font-bold text-blue-400 font-mono mt-1">
              {network.totalLoadKw} kW
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              8 Residences • Avg {(network.totalLoadKw / 8).toFixed(1)} kW
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-800">
            <Home className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Distribution Transformer Exchange */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Transformer Power Flow</div>
            <div
              className={`text-lg font-bold font-mono mt-1 ${
                isExportingToGrid ? 'text-amber-300' : 'text-cyan-400'
              }`}
            >
              {isExportingToGrid ? `▲ Export +${network.netGridExchangeKw}` : `▼ Import ${Math.abs(network.netGridExchangeKw)}`} kW
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              TX Load: {network.transformer.loadingPercent}% ({network.transformer.currentLoadKva} kVA)
            </div>
          </div>
          <div
            className={`p-2.5 rounded-lg ${
              isExportingToGrid
                ? 'bg-amber-950/80 text-amber-300 border border-amber-700'
                : 'bg-cyan-950/80 text-cyan-400 border border-cyan-800'
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
            <div className="text-xs text-slate-400 font-medium">Feeder Voltage State</div>
            <div
              className={`text-lg font-bold font-mono mt-1 ${
                hasCritical ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {hasCritical ? `${network.peakVoltageV} V Peak` : `${network.peakVoltageV} V Safe`}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {hasCritical
                ? `${overVoltageCount} House > 253V Limit`
                : '100% within IEEE 1547'}
            </div>
          </div>
          <div
            className={`p-2.5 rounded-lg ${
              hasCritical
                ? 'bg-red-950/80 text-red-400 border border-red-800'
                : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
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
