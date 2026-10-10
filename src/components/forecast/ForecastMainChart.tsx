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
  const gridStroke = isDark ? '#163826' : '#BBF7D0'
  const axisStroke = isDark ? '#86EFAC' : '#52665A'
  const tooltipBg = isDark ? '#122C1F' : '#FFFFFF'
  const tooltipBorder = isDark ? '#163826' : '#BBF7D0'
  const tooltipText = isDark ? '#ECFDF3' : '#10251A'

  // Solar and load color tokens
  const solarStroke = isDark ? '#F59E0B' : '#D97706'
  const loadStroke = isDark ? '#86EFAC' : '#047857'

  return (
    <Card className="border-[#BBF7D0]/60 dark:border-[#86EFAC]/20">
      <CardHeader
        title="24-Hour Solar Generation & Load Demand Lookahead"
        subtitle="Diurnal renewable PV production vs. aggregate consumer power demand across 24 hours"
        icon={<TrendingUp className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
        action={
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="w-3 h-1 rounded-full bg-amber-500 inline-block" />
              <span>Solar Generation (kW)</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#506052] dark:text-[#A0C878]">
              <span className="w-3 h-1 rounded-full bg-[#506052] dark:bg-[#A0C878] inline-block" />
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
                      className="p-3 rounded-lg border shadow-md text-xs space-y-1.5 font-sans min-w-[190px]"
                    >
                      <div className="font-mono font-bold border-b border-[#DDD9C9]/50 dark:border-[#2C3C2E]/50 pb-1 text-[#26352A] dark:text-[#F2F5ED]">
                        Time: {label}
                      </div>
                      <div className="flex items-center justify-between text-[#B09B29] dark:text-[#D4B838]">
                        <span className="flex items-center gap-1.5">
                          <Sun className="w-3 h-3" />
                          <span>Solar PV:</span>
                        </span>
                        <span className="font-mono font-bold">{solar.toFixed(1)} kW</span>
                      </div>
                      <div className="flex items-center justify-between text-[#506052] dark:text-[#A0C878]">
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3 h-3" />
                          <span>Demand:</span>
                        </span>
                        <span className="font-mono font-bold">{load.toFixed(1)} kW</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#DDD9C9]/40 dark:border-[#2C3C2E]/40 pt-1 text-[#788477] dark:text-[#859483] font-medium">
                        <span>Net Demand:</span>
                        <span className={`font-mono font-bold ${net < 0 ? 'text-[#B09B29] dark:text-[#D4B838]' : 'text-[#26352A] dark:text-[#F2F5ED]'}`}>
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
        <div className="mt-3 pt-3 border-t border-[#DDD9C9]/60 dark:border-[#2C3C2E]/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#788477] dark:text-[#859483]">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#A0C878] shrink-0" />
            <span>Solar rises between 06:00–19:00 with peak irradiance at midday; load displays dual-peak diurnal demand.</span>
          </span>
          <span className="font-mono font-medium">Resolution: 1 Hour</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default ForecastMainChart
