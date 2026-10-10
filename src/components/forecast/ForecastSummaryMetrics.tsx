import React from 'react'
import { Card, CardContent } from '../ui/Card'
import { DayAheadSummary } from './forecastAdapter'
import {
  Sun,
  TrendingUp,
  BatteryMedium,
  Activity,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react'

interface ForecastSummaryMetricsProps {
  summary: DayAheadSummary
  gridName: string
  simulationDate: string
}

export const ForecastSummaryMetrics: React.FC<ForecastSummaryMetricsProps> = ({
  summary,
  gridName,
  simulationDate,
}) => {
  // Format readable date (e.g. "Friday, Oct 9, 2026")
  let formattedDate = simulationDate
  try {
    const parts = simulationDate.split('-')
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      formattedDate = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(d)
    }
  } catch (e) {
    formattedDate = simulationDate
  }

  return (
    <div className="space-y-3.5">
      {/* Top Metadata Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-[#425B4C] dark:text-[#A7F3D0]">
          <span className="font-extrabold text-sm text-[#10251A] dark:text-white uppercase tracking-wider">
            Day-Ahead Forecast
          </span>
          <span className="text-[#BBF7D0] dark:text-[#86EFAC]/30">|</span>
          <span className="flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC]" />
            <span className="text-[#10251A] dark:text-white font-semibold">{gridName}</span>
          </span>
          <span className="text-[#BBF7D0] dark:text-[#86EFAC]/30">|</span>
          <span className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[#10251A] dark:text-white font-medium">{formattedDate}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#ECFDF3] dark:bg-[#064E3B]/60 border border-[#BBF7D0] dark:border-[#86EFAC]/30 text-[#047857] dark:text-[#86EFAC] shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Forecast status: {summary.forecastStatus}</span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-mono text-[#425B4C] dark:text-[#A7F3D0]">
            Horizon: 24h
          </span>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Peak Solar Generation */}
        <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md shadow-[0_6px_20px_rgba(16,80,55,0.06)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#425B4C] dark:text-[#A7F3D0] font-semibold">
                Peak Solar Generation
              </span>
              <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 shadow-2xs">
                <Sun className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1.5 tracking-tight">
              {summary.peakSolarKw.toFixed(1)}{' '}
              <span className="text-xs font-normal text-[#425B4C] dark:text-[#A7F3D0]">kW</span>
            </div>
            <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0] mt-1 font-mono font-medium">
              Projected at {summary.peakSolarTime}
            </div>
          </CardContent>
        </Card>

        {/* 2. Peak Load Demand */}
        <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md shadow-[0_6px_20px_rgba(16,80,55,0.06)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#425B4C] dark:text-[#A7F3D0] font-semibold">
                Peak Load Demand
              </span>
              <div className="p-1.5 rounded-xl bg-[#ECFDF3] dark:bg-[#064E3B]/50 border border-[#BBF7D0] dark:border-[#86EFAC]/30 shadow-2xs">
                <TrendingUp className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-[#10251A] dark:text-[#ECFDF3] mt-1.5 tracking-tight">
              {summary.peakLoadKw.toFixed(1)}{' '}
              <span className="text-xs font-normal text-[#425B4C] dark:text-[#A7F3D0]">kW</span>
            </div>
            <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0] mt-1 font-mono font-medium">
              Projected at {summary.peakLoadTime}
            </div>
          </CardContent>
        </Card>

        {/* 3. Total Solar Generation */}
        <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md shadow-[0_6px_20px_rgba(16,80,55,0.06)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#425B4C] dark:text-[#A7F3D0] font-semibold">
                Total Solar Generation
              </span>
              <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 shadow-2xs">
                <BatteryMedium className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1.5 tracking-tight">
              {summary.totalSolarKwh.toLocaleString()}{' '}
              <span className="text-xs font-normal text-[#425B4C] dark:text-[#A7F3D0]">kWh</span>
            </div>
            <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0] mt-1 font-medium">
              24-hour total energy yield
            </div>
          </CardContent>
        </Card>

        {/* 4. Total Load Demand */}
        <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md shadow-[0_6px_20px_rgba(16,80,55,0.06)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#425B4C] dark:text-[#A7F3D0] font-semibold">
                Total Load Demand
              </span>
              <div className="p-1.5 rounded-xl bg-[#ECFDF3] dark:bg-[#064E3B]/50 border border-[#BBF7D0] dark:border-[#86EFAC]/30 shadow-2xs">
                <Activity className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-[#10251A] dark:text-[#ECFDF3] mt-1.5 tracking-tight">
              {summary.totalLoadKwh.toLocaleString()}{' '}
              <span className="text-xs font-normal text-[#425B4C] dark:text-[#A7F3D0]">kWh</span>
            </div>
            <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0] mt-1 font-medium">
              24-hour energy consumption
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ForecastSummaryMetrics
