import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { useForecast } from '../../hooks/useForecast'
import { TrendingUp, Sun, Zap } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

export const ForecastChart: React.FC = () => {
  const { dataPoints, metrics, isLoading } = useForecast()

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        title="Solar & Load Forecast"
        subtitle="Next 24h Prediction • Random Forest ML Model"
        icon={<TrendingUp className="w-4 h-4 text-cyan-400" />}
        action={
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded">
              Demo / Mock Forecast
            </span>
          </div>
        }
      />
      <CardContent className="flex-1 flex flex-col pt-2 pb-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Solar: <strong>{metrics.currentSolarKw} kW</strong></span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Load: <strong>{metrics.currentLoadKw} kW</strong></span>
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Model Accuracy: Solar <strong className="text-emerald-400">{metrics.solarAccuracyPercent}%</strong> • Load <strong className="text-emerald-400">{metrics.loadAccuracyPercent}%</strong>
          </div>
        </div>

        <div className="w-full h-44 sm:h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                unit=" kW"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '11px',
                }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area
                type="monotone"
                dataKey="solarGenerationKw"
                name="Solar (kW)"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#solarGrad)"
              />
              <Area
                type="monotone"
                dataKey="loadDemandKw"
                name="Load (kW)"
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#loadGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
