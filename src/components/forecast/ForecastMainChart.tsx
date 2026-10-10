import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { DayAheadForecastPoint } from './forecastAdapter'
import { TrendingUp, Sun, Activity, Info } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useUIStore } from '../../store/uiStore'

interface ForecastMainChartProps {
  dataPoints: DayAheadForecastPoint[]
}

export const ForecastMainChart: React.FC<ForecastMainChartProps> = ({ dataPoints }) => {
  const { theme } = useUIStore()
  const isDark = theme === 'dark'

  // Visual design tokens
  const gridStroke = isDark ? 'rgba(134, 239, 172, 0.12)' : 'rgba(16, 80, 55, 0.1)'
  const axisStroke = isDark ? '#A7F3D0' : '#425B4C'
  const tooltipBg = isDark ? '#0E2419' : '#FFFFFF'
  const tooltipBorder = isDark ? 'rgba(134, 239, 172, 0.35)' : 'rgba(187, 247, 208, 0.9)'
  const tooltipText = isDark ? '#F0FDF4' : '#10251A'

  // Solar and load color tokens
  const solarStroke = isDark ? '#F59E0B' : '#D97706'
  const loadStroke = isDark ? '#10B981' : '#047857'

  return (
    <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md shadow-[0_8px_25px_rgba(16,80,55,0.06)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.3)] transition-all duration-300">
      <CardHeader
        title="24-Hour Solar Generation & Load Demand Lookahead"
        subtitle="Diurnal renewable PV production vs. aggregate consumer power demand across 24 hours"
        icon={<TrendingUp className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
        action={
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="w-3 h-1.5 rounded-full bg-amber-500 inline-block" />
              <span>Solar Generation (kW)</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#047857] dark:text-[#86EFAC]">
              <span className="w-3 h-1.5 rounded-full bg-[#047857] dark:bg-[#10B981] inline-block" />
              <span>Load Demand (kW)</span>
            </span>
          </div>
        }
      />

      <CardContent className="p-4 sm:p-5">
        <div className="w-full h-80 min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dataPoints}
              margin={{ top: 12, right: 18, left: -4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="time"
                stroke={axisStroke}
                fontSize={11}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke={axisStroke}
                fontSize={11}
                tickLine={false}
                unit=" kW"
                width={56}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null
                  const solar = Number(payload.find((p) => p.dataKey === 'solarKw')?.value || 0)
                  const load = Number(payload.find((p) => p.dataKey === 'loadKw')?.value || 0)
                  const net = Math.round((load - solar) * 10) / 10

                  return (
                    <div
                      style={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        color: tooltipText,
                      }}
                      className="p-3.5 rounded-xl border shadow-xl text-xs space-y-1.5 font-sans min-w-[190px] backdrop-blur-md"
                    >
                      <div className="font-mono font-bold border-b border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 pb-1 text-[#10251A] dark:text-white">
                        Time: {label}
                      </div>
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <span className="flex items-center gap-1.5">
                          <Sun className="w-3 h-3" />
                          <span>Solar PV:</span>
                        </span>
                        <span className="font-mono font-bold">{solar.toFixed(1)} kW</span>
                      </div>
                      <div className="flex items-center justify-between text-[#047857] dark:text-[#86EFAC]">
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3 h-3" />
                          <span>Demand:</span>
                        </span>
                        <span className="font-mono font-bold">{load.toFixed(1)} kW</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 pt-1 text-[#425B4C] dark:text-[#A7F3D0] font-medium">
                        <span>Net Demand:</span>
                        <span className={`font-mono font-bold ${net < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[#10251A] dark:text-white'}`}>
                          {net > 0 ? `+${net.toFixed(1)}` : net.toFixed(1)} kW
                        </span>
                      </div>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="solarKw"
                name="Solar Generation"
                stroke={solarStroke}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: solarStroke }}
              />
              <Line
                type="monotone"
                dataKey="loadKw"
                name="Load Demand"
                stroke={loadStroke}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: loadStroke }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Context footer */}
        <div className="mt-3 pt-3 border-t border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#425B4C] dark:text-[#A7F3D0]">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC] shrink-0" />
            <span>Solar rises between 06:00–19:00 with peak irradiance at midday; load displays dual-peak diurnal demand.</span>
          </span>
          <span className="font-mono font-semibold">Resolution: 1 Hour</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default ForecastMainChart
