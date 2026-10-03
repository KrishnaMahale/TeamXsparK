import React, { useMemo } from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { TimeSeriesSolarPoint, TimeSeriesLoadPoint } from '../../types/simulation'
import { useUIStore } from '../../store/uiStore'
import { TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

interface LiveSolarLoadChartProps {
  solarPoints: TimeSeriesSolarPoint[]
  loadPoints: TimeSeriesLoadPoint[]
  installedCapacityKw?: number
  peakLoadKw?: number
}

export const LiveSolarLoadChart: React.FC<LiveSolarLoadChartProps> = ({
  solarPoints,
  loadPoints,
}) => {
  const { theme } = useUIStore()
  const isDark = theme === 'dark'

  const mergedData = useMemo(() => {
    const times = Array.from(
      new Set([...solarPoints.map((s) => s.time), ...loadPoints.map((l) => l.time)])
    ).sort()

    return times.map((t) => {
      const s = solarPoints.find((sp) => sp.time === t)
      const l = loadPoints.find((lp) => lp.time === t)
      const solar = s ? s.solarKw : 0
      const load = l ? l.loadKw : 0
      return {
        time: t,
        solarKw: solar,
        loadKw: load,
        netExportKw: Math.max(0, solar - load),
      }
    })
  }, [solarPoints, loadPoints])

  // Calculate live preview metrics
  const solarValues = mergedData.map((d) => d.solarKw)
  const loadValues = mergedData.map((d) => d.loadKw)
  const netExportValues = mergedData.map((d) => d.netExportKw)

  const peakSolar = solarValues.length > 0 ? Math.max(...solarValues) : 0
  const peakLoad = loadValues.length > 0 ? Math.max(...loadValues) : 0
  const avgSolar = solarValues.length > 0 ? Math.round(solarValues.reduce((a, b) => a + b, 0) / solarValues.length) : 0
  const avgLoad = loadValues.length > 0 ? Math.round(loadValues.reduce((a, b) => a + b, 0) / loadValues.length) : 0
  const maxNetExport = netExportValues.length > 0 ? Math.max(...netExportValues) : 0

  const gridStroke = isDark ? '#1E293B' : '#E2E8F0'
  const axisStroke = isDark ? '#94A3B8' : '#64748B'
  const tooltipBg = isDark ? '#111827' : '#FFFFFF'
  const tooltipBorder = isDark ? '#243244' : '#E2E8F0'
  const tooltipText = isDark ? '#F8FAFC' : '#0F172A'

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        title="Live Generation vs Demand Curve"
        subtitle="Real-time synchronized preview updating immediately upon data edits"
        icon={<TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
      />
      <CardContent className="space-y-4">
        {/* 5 Live Preview Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Peak Solar</div>
            <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">{peakSolar} kW</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Peak Load</div>
            <div className="text-base font-bold font-mono text-sky-700 dark:text-sky-300 mt-0.5">{peakLoad} kW</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Avg Solar</div>
            <div className="text-base font-bold font-mono text-amber-600/80 dark:text-amber-300 mt-0.5">{avgSolar} kW</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Avg Load</div>
            <div className="text-base font-bold font-mono text-sky-600/80 dark:text-sky-300 mt-0.5">{avgLoad} kW</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 col-span-2 sm:col-span-1">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Max Net Export</div>
            <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">+{maxNetExport} kW</div>
          </div>
        </div>

        {/* Live Recharts Line Chart */}
        <div className="w-full h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="time"
                stroke={axisStroke}
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke={axisStroke}
                fontSize={11}
                tickLine={false}
                unit=" kW"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '8px',
                  color: tooltipText,
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
              <Line
                type="monotone"
                dataKey="solarKw"
                name="Solar Generation (kW)"
                stroke="#F59E0B"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="loadKw"
                name="Load Demand (kW)"
                stroke="#0284C7"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
