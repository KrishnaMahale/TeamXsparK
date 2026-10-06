import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Activity, Info } from 'lucide-react'
import { useDomesticStore } from '../../store/domesticStore'
import { useUIStore } from '../../store/uiStore'

export const DomesticVoltageProfileChart: React.FC = () => {
  const { network, selectedHouseId, selectHouse } = useDomesticStore()
  const { theme } = useUIStore()
  const isDark = theme === 'dark'

  // Prepare data points from Transformer (0m) to End of Line (290m)
  const chartData = [
    {
      distance: 0,
      name: 'Distribution TX (11kV/230V)',
      voltage: 230.0,
      houseId: 'TX-LV-01',
      netKw: -network.transformer.currentLoadKw,
    },
    ...network.houses.map((h) => ({
      distance: h.distanceMeters,
      name: `H${h.houseNumber} (${h.name})`,
      voltage: h.telemetry.voltageV,
      houseId: h.id,
      netKw: h.telemetry.netPowerKw,
      phase: h.phase,
    })),
  ]

  const maxV = network.peakVoltageV
  const isOverVoltage = maxV > 253.0

  return (
    <Card className="flex flex-col h-full">
      <CardHeader
        title="Feeder Voltage Profile (Distance vs. Voltage)"
        subtitle="Reverse power flow voltage rise along 290m residential low-voltage feeder"
        icon={<Activity className="w-4 h-4 text-[#A0C878]" />}
        action={
          <Badge variant={isOverVoltage ? 'danger' : 'success'} size="sm">
            {isOverVoltage ? `Peak: ${maxV} V (> 253V Limit)` : `Peak: ${maxV} V (Compliant)`}
          </Badge>
        }
      />

      <CardContent className="space-y-3">
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2A3A2C' : '#DDD9C9'} vertical={false} />
              
              <XAxis
                dataKey="distance"
                stroke={isDark ? '#A0B0A2' : '#788477'}
                fontSize={11}
                tickFormatter={(val) => `${val}m`}
                label={{
                  value: 'Distance along street cable from transformer (meters)',
                  position: 'insideBottom',
                  offset: -12,
                  fill: isDark ? '#A0B0A2' : '#788477',
                  fontSize: 10,
                }}
              />

              <YAxis
                domain={[215, 260]}
                stroke={isDark ? '#A0B0A2' : '#788477'}
                fontSize={11}
                tickFormatter={(val) => `${val}V`}
              />

              {/* Upper Statutory Limit Line (253 V / 1.10 pu) */}
              <ReferenceLine
                y={253.0}
                stroke="#DC2626"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: 'Upper Statutory Limit (253V / +10%)',
                  fill: '#DC2626',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />

              {/* Nominal Reference Line (230 V / 1.00 pu) */}
              <ReferenceLine
                y={230.0}
                stroke="#A0C878"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{
                  value: 'Nominal 230V',
                  fill: '#A0C878',
                  fontSize: 10,
                  position: 'insideBottomLeft',
                }}
              />

              {/* Warning Threshold Line (248 V) */}
              <ReferenceLine
                y={248.0}
                stroke="#D97706"
                strokeDasharray="2 2"
                strokeWidth={1}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    const v = data.voltage
                    const isCrit = v > 253.0
                    return (
                      <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2A3A2C] p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                        <div className="font-bold text-[#26352A] dark:text-[#E8F0E6]">{data.name}</div>
                        <div className="text-[#788477]">
                          Distance: <span className="text-[#26352A] dark:text-[#E8F0E6] font-mono">{data.distance} m</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#788477]">Terminal Voltage:</span>
                          <span
                            className={`font-mono font-bold ${
                              isCrit ? 'text-red-600' : 'text-[#A0C878]'
                            }`}
                          >
                            {v} V ({(v / 230).toFixed(3)} pu)
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#788477]">Net Flow at Node:</span>
                          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                            {data.netKw > 0 ? `+${data.netKw} kW (Export)` : `${data.netKw} kW (Import)`}
                          </span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />

              <Line
                type="monotone"
                dataKey="voltage"
                stroke="#A0C878"
                strokeWidth={2.5}
                dot={{
                  r: 4,
                  fill: isDark ? '#151F17' : '#FFFDF6',
                  stroke: '#A0C878',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: '#A0C878',
                  stroke: '#FFFDF6',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Concise Key Insight */}
        <div className="p-2.5 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2A3A2C] text-xs text-[#506052] dark:text-[#A0B0A2] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#A0C878] shrink-0" />
            <span>
              <strong className="text-[#26352A] dark:text-[#E8F0E6]">Voltage Trend:</strong> Solar export from houses raises voltage along the street, peaking at end-of-line residences ({maxV}V at 290m).
            </span>
          </div>
          <Badge variant={isOverVoltage ? 'danger' : 'success'} size="sm">
            {isOverVoltage ? 'Breaches 253V Limit' : 'Within Limits'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
