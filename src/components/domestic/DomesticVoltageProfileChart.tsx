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

export const DomesticVoltageProfileChart: React.FC = () => {
  const { network, selectedHouseId, selectHouse } = useDomesticStore()

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
        icon={<Activity className="w-4 h-4 text-cyan-400" />}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              
              <XAxis
                dataKey="distance"
                stroke="#64748B"
                fontSize={11}
                tickFormatter={(val) => `${val}m`}
                label={{
                  value: 'Distance along street cable from transformer (meters)',
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#64748B',
                  fontSize: 10,
                }}
              />

              <YAxis
                domain={[215, 260]}
                stroke="#64748B"
                fontSize={11}
                tickFormatter={(val) => `${val}V`}
              />

              {/* Upper Statutory Limit Line (253 V / 1.10 pu) */}
              <ReferenceLine
                y={253.0}
                stroke="#EF4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: 'Upper Statutory Limit (253V / +10%)',
                  fill: '#EF4444',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />

              {/* Nominal Reference Line (230 V / 1.00 pu) */}
              <ReferenceLine
                y={230.0}
                stroke="#10B981"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  value: 'Nominal 230V',
                  fill: '#10B981',
                  fontSize: 10,
                  position: 'insideBottomLeft',
                }}
              />

              {/* Warning Threshold Line (248 V) */}
              <ReferenceLine
                y={248.0}
                stroke="#F59E0B"
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
                      <div className="bg-[#0B132B] border border-[#1E293B] p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                        <div className="font-bold text-white">{data.name}</div>
                        <div className="text-slate-400">
                          Distance: <span className="text-white font-mono">{data.distance} m</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-400">Terminal Voltage:</span>
                          <span
                            className={`font-mono font-bold ${
                              isCrit ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {v} V ({(v / 230).toFixed(3)} pu)
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-400">Net Flow at Node:</span>
                          <span className="font-mono text-amber-400 font-bold">
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
                stroke="#38BDF8"
                strokeWidth={2.5}
                dot={{
                  r: 5,
                  fill: '#0F172A',
                  stroke: '#38BDF8',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 8,
                  fill: '#38BDF8',
                  stroke: '#FFFFFF',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Informative Explanation for Judges / Operators */}
        <div className="p-2.5 rounded-lg bg-[#0E172C] border border-[#1E293B] text-[11px] text-slate-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-200">Rooftop Solar Voltage Rise Physics:</strong> Low-voltage residential lines have high resistance-to-reactance ratios ($R \gg X$). As multiple houses inject concurrent solar surplus back towards the distribution transformer, cumulative current reverses, driving terminal voltage progressively higher with distance. Notice the sharp rise between 170m and 290m.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
