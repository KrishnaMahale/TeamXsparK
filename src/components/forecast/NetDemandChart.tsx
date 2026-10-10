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
  const gridStroke = isDark ? 'rgba(134, 239, 172, 0.12)' : 'rgba(16, 80, 55, 0.1)'
  const axisStroke = isDark ? '#A7F3D0' : '#425B4C'
  const tooltipBg = isDark ? '#0E2419' : '#FFFFFF'
  const tooltipBorder = isDark ? 'rgba(134, 239, 172, 0.35)' : 'rgba(187, 247, 208, 0.9)'
  const tooltipText = isDark ? '#F0FDF4' : '#10251A'

  // Determine if there is any reverse flow / surplus in this profile
  const hasSurplus = summary.maxSurplusKw > 0

  return (
    <Card className="border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md shadow-[0_8px_25px_rgba(16,80,55,0.06)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.3)] transition-all duration-300">
      <CardHeader
        title="Forecasted Net Demand"
        subtitle="Net Demand = Load Demand - Solar Generation (Identifies surplus renewable backfeed into the primary substation)"
        icon={<Zap className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#ECFDF3] dark:bg-[#064E3B]/60 border border-[#BBF7D0] dark:border-[#86EFAC]/30 text-[#047857] dark:text-[#86EFAC] shadow-2xs">
              <ArrowUpCircle className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC]" />
              <span>&gt; 0 kW: Grid Import</span>
            </span>
            {hasSurplus && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 shadow-2xs">
                <ArrowDownCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
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
                  <stop offset="5%" stopColor={isDark ? '#10B981' : '#047857'} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={isDark ? '#047857' : '#10B981'} stopOpacity={0.03} />
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
                stroke={isDark ? '#86EFAC' : '#6B8274'}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: '0 kW Neutral Balance',
                  position: 'insideBottomRight',
                  fill: isDark ? '#A7F3D0' : '#425B4C',
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
                      className="p-3.5 rounded-xl border shadow-xl text-xs space-y-1.5 font-sans min-w-[210px] backdrop-blur-md"
                    >
                      <div className="font-mono font-bold border-b border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 pb-1 text-[#10251A] dark:text-white">
                        Time: {label}
                      </div>
                      <div className="flex items-center justify-between text-[#047857] dark:text-[#86EFAC]">
                        <span>Load Demand:</span>
                        <span className="font-mono font-medium">{pt.loadKw.toFixed(1)} kW</span>
                      </div>
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <span>Solar Generation:</span>
                        <span className="font-mono font-medium">{pt.solarKw.toFixed(1)} kW</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 pt-1 font-bold">
                        <span>Net Grid Demand:</span>
                        <span
                          className={`font-mono ${
                            isNegative ? 'text-amber-600 dark:text-amber-400' : 'text-[#047857] dark:text-[#86EFAC]'
                          }`}
                        >
                          {pt.netDemandKw > 0 ? `+${pt.netDemandKw.toFixed(1)}` : pt.netDemandKw.toFixed(1)} kW
                        </span>
                      </div>
                      <div className="text-[10px] text-[#425B4C] dark:text-[#A7F3D0] font-medium pt-0.5">
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
                stroke={isDark ? '#10B981' : '#047857'}
                strokeWidth={2.5}
                fill="url(#netDemandGrad)"
                dot={false}
                activeDot={{ r: 5, fill: isDark ? '#10B981' : '#047857' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Operating Balance Explanation Footnote */}
        <div className="p-3.5 rounded-2xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 text-xs space-y-1.5 shadow-2xs">
          <div className="flex items-start gap-2 text-[#425B4C] dark:text-[#A7F3D0] text-[11px] leading-relaxed">
            <Info className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#10251A] dark:text-white">Operating Regime Interpretation: </span>
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
          <p className="text-[10px] text-[#6B8274] dark:text-[#6EE7B7] italic pl-6">
            Note: This curve illustrates active power balance at the feeder head. Statutory voltage rise and thermal ampacity limits must be verified via Digital Twin power-flow simulation.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default NetDemandChart
