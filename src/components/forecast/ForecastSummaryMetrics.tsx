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
        <div className="flex flex-wrap items-center gap-2 text-[#506052] dark:text-[#C2CCC0]">
          <span className="font-bold text-sm text-[#26352A] dark:text-[#F2F5ED] uppercase tracking-wider">
            Day-Ahead Forecast
          </span>
          <span className="text-[#DDD9C9] dark:text-[#2C3C2E]">|</span>
          <span className="flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-[#A0C878]" />
            <span className="text-[#26352A] dark:text-[#F2F5ED]">{gridName}</span>
          </span>
          <span className="text-[#DDD9C9] dark:text-[#2C3C2E]">|</span>
          <span className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-[#B09B29]" />
            <span>{formattedDate}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] text-[#26352A] dark:text-[#F2F5ED]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#A0C878]" />
            <span>Forecast status: {summary.forecastStatus}</span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-mono text-[#788477] dark:text-[#859483]">
            Horizon: 24h
          </span>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Peak Solar Generation */}
        <Card className="border-[#DDD9C9] dark:border-[#2C3C2E]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#788477] dark:text-[#859483] font-medium">
                Peak Solar Generation
              </span>
              <div className="p-1 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <Sun className="w-3.5 h-3.5 text-[#B09B29] dark:text-[#D4B838]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#B09B29] dark:text-[#D4B838] mt-1.5">
              {summary.peakSolarKw.toFixed(1)}{' '}
              <span className="text-xs font-normal text-[#788477] dark:text-[#859483]">kW</span>
            </div>
            <div className="text-[11px] text-[#788477] dark:text-[#859483] mt-1 font-mono">
              Projected at {summary.peakSolarTime}
            </div>
          </CardContent>
        </Card>

        {/* 2. Peak Load Demand */}
        <Card className="border-[#DDD9C9] dark:border-[#2C3C2E]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#788477] dark:text-[#859483] font-medium">
                Peak Load Demand
              </span>
              <div className="p-1 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <TrendingUp className="w-3.5 h-3.5 text-[#A0C878]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-1.5">
              {summary.peakLoadKw.toFixed(1)}{' '}
              <span className="text-xs font-normal text-[#788477] dark:text-[#859483]">kW</span>
            </div>
            <div className="text-[11px] text-[#788477] dark:text-[#859483] mt-1 font-mono">
              Projected at {summary.peakLoadTime}
            </div>
          </CardContent>
        </Card>

        {/* 3. Total Solar Generation */}
        <Card className="border-[#DDD9C9] dark:border-[#2C3C2E]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#788477] dark:text-[#859483] font-medium">
                Total Solar Generation
              </span>
              <div className="p-1 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <BatteryMedium className="w-3.5 h-3.5 text-[#B09B29] dark:text-[#D4B838]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#B09B29] dark:text-[#D4B838] mt-1.5">
              {summary.totalSolarKwh.toLocaleString()}{' '}
              <span className="text-xs font-normal text-[#788477] dark:text-[#859483]">kWh</span>
            </div>
            <div className="text-[11px] text-[#788477] dark:text-[#859483] mt-1">
              24-hour total energy yield
            </div>
          </CardContent>
        </Card>

        {/* 4. Total Load Demand */}
        <Card className="border-[#DDD9C9] dark:border-[#2C3C2E]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#788477] dark:text-[#859483] font-medium">
                Total Load Demand
              </span>
              <div className="p-1 rounded-md bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <Activity className="w-3.5 h-3.5 text-[#A0C878]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-1.5">
              {summary.totalLoadKwh.toLocaleString()}{' '}
              <span className="text-xs font-normal text-[#788477] dark:text-[#859483]">kWh</span>
            </div>
            <div className="text-[11px] text-[#788477] dark:text-[#859483] mt-1">
              24-hour energy consumption
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ForecastSummaryMetrics
