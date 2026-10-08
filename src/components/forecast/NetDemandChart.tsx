import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { DayAheadForecastPoint, DayAheadSummary } from './forecastAdapter'
import { Zap, ArrowDownCircle, ArrowUpCircle, Info, ShieldAlert } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { useUIStore } from '../../store/uiStore'

interface NetDemandChartProps {
  dataPoints: DayAheadForecastPoint[]
  summary: DayAheadSummary
}

export const NetDemandChart: React.FC<NetDemandChartProps> = ({ dataPoints, summary }) => {
  const { theme } = useUIStore()
  const isDark = theme === 'dark'

  // Visual design tokens
  const gridStroke = isDark ? '#2C3C2E' : '#DDD9C9'
  const axisStroke = isDark ? '#859483' : '#788477'
  const tooltipBg = isDark ? '#1E2B20' : '#FAF6E9'
  const tooltipBorder = isDark ? '#2C3C2E' : '#DDD9C9'
  const tooltipText = isDark ? '#F2F5ED' : '#26352A'

  // Determine if there is any reverse flow / surplus in this profile
  const hasSurplus = summary.maxSurplusKw > 0

  return (
    <Card className="border-[#DDD9C9] dark:border-[#2C3C2E]">
      <CardHeader
        title="Forecasted Net Demand"
        subtitle="Net Demand = Load Demand - Solar Generation (Identifies surplus renewable backfeed into the primary substation)"
        icon={<Zap className="w-4 h-4 text-[#A0C878]" />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] text-[#506052] dark:text-[#C2CCC0]">
              <ArrowUpCircle className="w-3.5 h-3.5 text-[#A0C878]" />
              <span>&gt; 0 kW: Grid Import</span>
            </span>
            {hasSurplus && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] text-[#B09B29] dark:text-[#D4B838]">
                <ArrowDownCircle className="w-3.5 h-3.5 text-[#B09B29] dark:text-[#D4B838]" />
                <span>&lt; 0 kW: Reverse Flow Potential</span>
              </span>
            )}
          </div>
        }
      />

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Net Demand Chart */}
        <div className="w-full h-72 min-h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dataPoints}
              margin={{ top: 12, right: 18, left: -4, bottom: 4 }}
            >
              <defs>
                <linearGradient id="netDemandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A0C878" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#A0C878" stopOpacity={0.05} />
                </linearGradient>
              </defs>
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
              {/* Zero reference line separating import from export */}
              <ReferenceLine
                y={0}
                stroke={isDark ? '#859483' : '#788477'}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: '0 kW Neutral Balance',
                  position: 'insideBottomRight',
                  fill: isDark ? '#859483' : '#788477',
                  fontSize: 10,
                  offset: 8,
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null
                  const pt = payload[0].payload as DayAheadForecastPoint
                  const isNegative = pt.netDemandKw < 0

                  return (
                    <div
                      style={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        color: tooltipText,
                      }}
                      className="p-3 rounded-lg border shadow-md text-xs space-y-1.5 font-sans min-w-[210px]"
                    >
                      <div className="font-mono font-bold border-b border-[#DDD9C9]/50 dark:border-[#2C3C2E]/50 pb-1 text-[#26352A] dark:text-[#F2F5ED]">
                        Time: {label}
                      </div>
                      <div className="flex items-center justify-between text-[#788477] dark:text-[#859483]">
                        <span>Load Demand:</span>
                        <span className="font-mono font-medium">{pt.loadKw.toFixed(1)} kW</span>
                      </div>
                      <div className="flex items-center justify-between text-[#B09B29] dark:text-[#D4B838]">
                        <span>Solar Generation:</span>
                        <span className="font-mono font-medium">{pt.solarKw.toFixed(1)} kW</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#DDD9C9]/40 dark:border-[#2C3C2E]/40 pt-1 font-bold">
                        <span>Net Grid Demand:</span>
                        <span
                          className={`font-mono ${
                            isNegative ? 'text-[#B09B29] dark:text-[#D4B838]' : 'text-[#26352A] dark:text-[#A0C878]'
                          }`}
                        >
                          {pt.netDemandKw > 0 ? `+${pt.netDemandKw.toFixed(1)}` : pt.netDemandKw.toFixed(1)} kW
                        </span>
                      </div>
                      <div className="text-[10px] text-[#788477] dark:text-[#859483] font-medium pt-0.5">
                        {isNegative
                          ? '⚠ Surplus generation (Reverse flow potential)'
                          : '✓ Grid supplies residual consumer load'}
                      </div>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="netDemandKw"
                name="Forecasted Net Demand"
                stroke={isDark ? '#A0C878' : '#506052'}
                strokeWidth={2}
                fill="url(#netDemandGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#A0C878' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Operating Balance Explanation Footnote */}
        <div className="p-3.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] text-xs space-y-1.5">
          <div className="flex items-start gap-2 text-[#506052] dark:text-[#C2CCC0] text-[11px] leading-relaxed">
            <Info className="w-4 h-4 text-[#A0C878] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#26352A] dark:text-[#F2F5ED]">Operating Regime Interpretation: </span>
              {hasSurplus ? (
                <span>
                  Between {summary.surplusStartTime} and {summary.surplusEndTime}, local rooftop PV output exceeds neighborhood consumption, dropping net demand to a peak surplus of {summary.maxSurplusKw.toFixed(1)} kW. During this window, power may reverse back through distribution lines towards the primary substation.
                </span>
              ) : (
                <span>
                  Net demand remains positive across the entire 24-hour horizon (range: {summary.minNetDemandKw.toFixed(1)} kW to {summary.maxNetDemandKw.toFixed(1)} kW). Solar offset lowers peak import requirements during daylight hours without creating reverse backfeed.
                </span>
              )}
            </div>
          </div>
          <p className="text-[10px] text-[#788477] dark:text-[#859483] italic pl-6">
            Note: This curve illustrates active power balance at the feeder head. Statutory voltage rise and thermal ampacity limits must be verified via Digital Twin power-flow simulation.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default NetDemandChart
