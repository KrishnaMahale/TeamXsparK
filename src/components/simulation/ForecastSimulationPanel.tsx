import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { GridNetwork } from '../../types/network'
import { SimulationInput } from '../../types/simulation'
import {
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  Sun,
  Zap,
  TrendingDown,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react'

interface ForecastSimulationPanelProps {
  input: SimulationInput
  currentGrid: GridNetwork
  onSwitchToScenario?: () => void
}

export const ForecastSimulationPanel: React.FC<ForecastSimulationPanelProps> = ({
  input,
  currentGrid,
  onSwitchToScenario,
}) => {
  const navigate = useNavigate()

  // Verify that required forecast data is present
  const hasForecastData =
    input.solarTimeSeries.length > 0 && input.loadTimeSeries.length > 0

  // Derive metrics strictly from existing time-series (zero fabrication)
  const peakSolarKw = hasForecastData
    ? Math.max(...input.solarTimeSeries.map((s) => s.solarKw), 0)
    : 0

  const peakLoadKw = hasForecastData
    ? Math.max(...input.loadTimeSeries.map((l) => l.loadKw), 0)
    : 0

  const totalSolarKwh = hasForecastData
    ? Math.round(input.solarTimeSeries.reduce((acc, s) => acc + s.solarKw, 0))
    : 0

  const totalLoadKwh = hasForecastData
    ? Math.round(input.loadTimeSeries.reduce((acc, l) => acc + l.loadKw, 0))
    : 0

  const netDemandValues = hasForecastData
    ? input.loadTimeSeries.map((lt, idx) => {
        const st = input.solarTimeSeries[idx]
        const solarVal = st ? st.solarKw : 0
        return lt.loadKw - solarVal
      })
    : []

  const peakNetDemandKw = netDemandValues.length > 0 ? Math.max(...netDemandValues) : 0
  const minNetDemandKw = netDemandValues.length > 0 ? Math.min(...netDemandValues) : 0

  // 1. SAFETY FALLBACK (When forecast context is missing or invalid)
  if (!hasForecastData) {
    return (
      <Card className="border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#26352A] dark:text-[#F2F5ED]">
              Forecast context unavailable
            </h3>
            <p className="text-xs text-[#506052] dark:text-[#C2CCC0] max-w-md mx-auto leading-relaxed">
              No ML forecast curves were received for this session. Return to Forecasts to generate or select a forecast before running this simulation.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/forecasts')}
            >
              Return to Forecasts
            </Button>
            {onSwitchToScenario && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={onSwitchToScenario}
              >
                Switch to Scenario Mode
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // 2. ESTABLISHED FORECAST CONTEXT VIEW
  return (
    <Card className="border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs">
      <CardHeader
        title="Simulation Configuration"
        subtitle="Evaluate the selected day's ML forecast against the physical grid model"
        icon={<CheckCircle2 className="w-4 h-4 text-[#A0C878]" />}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm">
              ✓ ML Forecast Ready
            </Badge>
            {onSwitchToScenario && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSwitchToScenario}
                className="text-xs text-[#788477] hover:text-[#26352A] dark:hover:text-[#F2F5ED]"
              >
                Switch to Scenario Preset
              </Button>
            )}
          </div>
        }
      />

      <CardContent className="p-5 space-y-5">
        {/* Established Grid & Date Row (Read-Only) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Grid Configuration */}
          <div className="p-3.5 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
            <div className="text-[10px] text-[#788477] uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Building className="w-3 h-3 text-[#A0C878]" />
              Grid Configuration
            </div>
            <div className="text-sm font-bold text-[#26352A] dark:text-[#F2F5ED] mt-1 truncate">
              {currentGrid.name}
            </div>
            <div className="text-[11px] text-[#506052] dark:text-[#A4B3A2] mt-0.5">
              {currentGrid.buses.length} Buses • {currentGrid.feeders.length} Feeders • {currentGrid.gridConnectionStatus === 'islanded' ? 'Islanded' : 'Grid-Connected'}
            </div>
          </div>

          {/* Simulation Date */}
          <div className="p-3.5 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
            <div className="text-[10px] text-[#788477] uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-[#A0C878]" />
              Simulation Date
            </div>
            <div className="text-sm font-bold text-[#26352A] dark:text-[#F2F5ED] mt-1 font-mono">
              {input.simulationDate || 'Selected Day'}
            </div>
            <div className="text-[11px] text-[#506052] dark:text-[#A4B3A2] mt-0.5">
              Day-Ahead Operating Timeline
            </div>
          </div>

          {/* Forecast Status & Horizon */}
          <div className="p-3.5 rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
            <div className="text-[10px] text-[#788477] uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#A0C878]" />
              Forecast Horizon
            </div>
            <div className="text-sm font-bold text-[#26352A] dark:text-[#F2F5ED] mt-1">
              24 Hours
            </div>
            <div className="text-[11px] text-[#506052] dark:text-[#A4B3A2] mt-0.5 font-mono">
              {input.solarTimeSeries.length} Synchronized Hourly Intervals
            </div>
          </div>
        </div>

        {/* Forecast Summary Metrics */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#788477] dark:text-[#859483]">
            Forecast Summary
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 rounded-xl bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E]">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold tracking-wider block flex items-center gap-1">
                <Sun className="w-3 h-3" /> Peak Solar
              </span>
              <span className="text-base font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] block mt-1">
                {peakSolarKw} kW
              </span>
              <span className="text-[10px] text-[#788477] dark:text-[#859483]">Midday generation</span>
            </div>

            <div className="p-3 rounded-xl bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E]">
              <span className="text-[10px] text-sky-700 dark:text-sky-400 uppercase font-bold tracking-wider block flex items-center gap-1">
                <Zap className="w-3 h-3" /> Peak Load
              </span>
              <span className="text-base font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] block mt-1">
                {peakLoadKw} kW
              </span>
              <span className="text-[10px] text-[#788477] dark:text-[#859483]">Peak consumer demand</span>
            </div>

            <div className="p-3 rounded-xl bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E]">
              <span className="text-[10px] text-[#788477] uppercase font-bold tracking-wider block">
                Total Solar
              </span>
              <span className="text-base font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] block mt-1">
                {totalSolarKwh} kWh
              </span>
              <span className="text-[10px] text-[#788477] dark:text-[#859483]">Daily expected energy</span>
            </div>

            <div className="p-3 rounded-xl bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E]">
              <span className="text-[10px] text-[#788477] uppercase font-bold tracking-wider block">
                Total Load
              </span>
              <span className="text-base font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] block mt-1">
                {totalLoadKwh} kWh
              </span>
              <span className="text-[10px] text-[#788477] dark:text-[#859483]">Daily energy demand</span>
            </div>

            <div className="p-3 rounded-xl bg-[#FFFDF6] dark:bg-[#151F17] border border-[#DDD9C9] dark:border-[#2C3C2E] col-span-2 sm:col-span-1">
              <span className="text-[10px] text-[#788477] uppercase font-bold tracking-wider block flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-[#A0C878]" /> Net Demand
              </span>
              <span className="text-base font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] block mt-1">
                {peakNetDemandKw} kW
              </span>
              <span className="text-[10px] text-[#788477] dark:text-[#859483]">
                Min: {minNetDemandKw} kW
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ForecastSimulationPanel
