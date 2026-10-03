import React, { useEffect } from 'react'
import { Network2D } from '../components/network/Network2D'
import { NetworkStatus } from '../components/dashboard/NetworkStatus'
import { ComponentDetailsPanel } from '../components/dashboard/BusDetails'
import { useSimulationStore } from '../store/simulationStore'
import { useGridStore } from '../store/gridStore'
import { useDomesticStore } from '../store/domesticStore'
import { GridTypeSwitcher } from '../components/layout/GridTypeSwitcher'
import { DomesticDashboardView } from '../components/domestic/DomesticDashboardView'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import {
  Activity,
  Clock,
  Sun,
  TrendingDown,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  BatteryMedium,
  Gauge,
  Zap,
} from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const { input, fullResult, isRunning, selectedAction, fetchActions } = useSimulationStore()
  const { currentTime, network, violationSummary, selectedComponent, activeActionApplied, fetchNetwork } = useGridStore()
  const { gridType } = useDomesticStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchNetwork()
    fetchActions()
  }, [fetchNetwork, fetchActions])

  // Calculate live power values directly from digital twin network assets
  const currentSolarKw = network.solarUnits.length > 0
    ? network.solarUnits.reduce((acc, s) => acc + (s.generationKw || 0), 0)
    : (fullResult?.summary.solarKw ?? input.currentSolarKw)
  const currentLoadKw = network.loads.length > 0
    ? network.loads.reduce((acc, l) => acc + (l.powerKw || 0), 0)
    : (fullResult?.summary.loadKw ?? input.currentLoadKw)
  const scenarioName = fullResult?.summary.scenarioName || input.scenarioName

  // Live telemetry metrics
  const maxVoltage = network.buses.length > 0
    ? Math.max(...network.buses.map((b) => b.voltage || 1.0))
    : 1.074
  const maxFeederLoad = network.feeders.length > 0
    ? Math.max(...network.feeders.map((f) => f.loadingPercent || 0))
    : 108
  const batterySoc = network.batteries.length > 0
    ? (network.batteries[0]?.socPercent ?? 62)
    : (input.batteryConfig?.initialSocPercent ?? 62)

  const hasCritical = violationSummary.critical > 0
  const hasWarning = violationSummary.warning > 0

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto w-full min-w-0">
      {/* Primary Grid Type Switcher (Hidden in this layout or moved) */}
      <div className="hidden">
        <GridTypeSwitcher />
      </div>

      {gridType === 'domestic' ? (
        <DomesticDashboardView />
      ) : (
        <>
          {/* 1. Top Banner (Solar Panel Management) */}
          <div className="bg-[#DCE7DD] dark:bg-[#1A332C] rounded-[24px] p-6 lg:p-8 relative overflow-hidden flex flex-col justify-between min-h-[320px] shadow-sm">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-20 dark:opacity-10 pointer-events-none">
              <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-r from-emerald-200 to-transparent blur-3xl" />
            </div>

            <div className="flex flex-col md:flex-row justify-between relative z-10 gap-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-light text-[#14532D] dark:text-[#ECFDF5] leading-tight">SOLAR PANEL</h1>
                <h1 className="text-3xl lg:text-4xl font-light text-[#14532D] dark:text-[#ECFDF5] leading-tight">MANAGEMENT</h1>
                <p className="text-sm text-[#365A4D] dark:text-[#A7C4B8] mt-3">Monitor energy production, consumption, and system performance.</p>
              </div>
              <div className="flex gap-8 text-right bg-white/40 dark:bg-black/20 backdrop-blur-sm p-4 rounded-2xl h-fit border border-white/40 dark:border-white/5">
                <div>
                  <div className="text-2xl font-bold text-[#14532D] dark:text-[#ECFDF5] font-mono">{currentLoadKw.toFixed(1)} <span className="text-sm">kW</span></div>
                  <div className="text-[10px] uppercase text-[#6B8178] dark:text-[#6B8E82] tracking-wider mt-1">CURRENT LOAD</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#14532D] dark:text-[#ECFDF5] font-mono">98.4 <span className="text-sm">%</span></div>
                  <div className="text-[10px] uppercase text-[#6B8178] dark:text-[#6B8E82] tracking-wider mt-1">SYSTEM HEALTH</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-12 relative z-10">
              {/* Power Efficiency card */}
              <div className="bg-white/60 dark:bg-[#0A2018]/60 backdrop-blur-md rounded-2xl p-4 w-52 shadow-sm border border-white/50 dark:border-white/10">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-[#14532D] dark:text-[#ECFDF5]">Power Efficiency</span>
                  <div className="bg-white dark:bg-[#183D36] p-1 rounded-full shadow-sm">
                    <ArrowRight className="-rotate-45 w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#14532D] dark:text-[#ECFDF5] mt-3 text-center">64%</div>
                <div className="h-2 w-full bg-white/50 dark:bg-black/30 rounded-full mt-3 overflow-hidden flex shadow-inner">
                  <div className="w-[64%] bg-[#A3E635] h-full" />
                  <div className="w-[36%] bg-[#1F2937] h-full" />
                </div>
                <div className="flex justify-between text-[10px] text-[#6B8178] dark:text-[#6B8E82] mt-2 font-medium">
                  <span>Surface +3%</span>
                  <span>Trim +5%</span>
                </div>
              </div>
              
              {/* Power Consumption card */}
              <div className="bg-white/60 dark:bg-[#0A2018]/60 backdrop-blur-md rounded-2xl p-4 w-52 shadow-sm border border-white/50 dark:border-white/10">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-[#14532D] dark:text-[#ECFDF5]">Power Infeed</span>
                  <div className="bg-white dark:bg-[#183D36] p-1 rounded-full shadow-sm">
                    <ArrowRight className="-rotate-45 w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                  </div>
                </div>
                <div className="flex items-end gap-2 mt-3">
                  <div className="text-xl font-bold text-[#14532D] dark:text-[#ECFDF5] font-mono">{currentSolarKw.toFixed(1)} kWh</div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mb-0.5">↓ 0.88%</div>
                </div>
                <div className="flex gap-1 h-5 mt-3 items-end">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className={`flex-1 rounded-t-sm ${i > 10 ? 'bg-white/50 dark:bg-white/10' : 'bg-[#A3E635]'}`} style={{height: `${Math.max(30, Math.random() * 100)}%`}} />
                  ))}
                </div>
              </div>
            </div>
          </div>



          {/* Optimized 12-Column Dashboard Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* --- LEFT COLUMN (Span 8) --- */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Asset System (Telemetry) - Wide */}
              <div className="bg-white dark:bg-[#0D2420] rounded-2xl p-5 lg:p-6 shadow-sm border border-gray-100 dark:border-[#23483F]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800 dark:text-[#ECFDF5]">Asset System & Live Telemetry</h3>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-[#183D36] px-2 py-1 rounded-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Data
                    </span>
                  </div>
                </div>
                <NetworkStatus />
              </div>

              {/* Energy Production Mock Chart - Wide */}
              <div className="bg-white dark:bg-[#0D2420] rounded-2xl p-5 lg:p-6 shadow-sm border border-gray-100 dark:border-[#23483F]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-gray-800 dark:text-[#ECFDF5]">Energy Production Timeline</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#23483F] px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#12332D] transition-colors">
                    This week ▾
                  </span>
                </div>
                <div className="flex justify-end gap-4 text-xs text-gray-600 dark:text-gray-400 mb-6">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#10B981]" /> Energy production</span>
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-800 dark:bg-gray-400" /> Energy consumption</span>
                </div>
                <div className="flex items-end justify-between h-32 mt-2 px-4">
                  {[40, 70, 90, 60, 50, 80, 70].map((h, i) => (
                    <div key={i} className="flex gap-1.5 items-end h-full w-full justify-center group cursor-crosshair">
                      <div className="w-3 lg:w-4 rounded-t-md bg-gray-800 dark:bg-gray-600 group-hover:opacity-80 transition-opacity" style={{height: `${h}%`}} />
                      <div className="w-3 lg:w-4 rounded-t-md bg-[#10B981] group-hover:opacity-80 transition-opacity" style={{height: `${h+10}%`}} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-4 px-4 font-medium">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </div>

              {/* Small KPI Badges - Horizontal row spanning 8 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                 <div className="bg-white dark:bg-[#0D2420] p-4 lg:p-5 rounded-2xl border border-gray-100 dark:border-[#23483F] flex flex-col items-center justify-center shadow-sm">
                    <div className="text-sm lg:text-base font-bold text-gray-800 dark:text-[#ECFDF5]">{currentSolarKw.toFixed(1)} kW</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">Energy Yield</div>
                 </div>
                 <div className="bg-white dark:bg-[#0D2420] p-4 lg:p-5 rounded-2xl border border-gray-100 dark:border-[#23483F] flex flex-col items-center justify-center shadow-sm">
                    <div className="text-sm lg:text-base font-bold text-gray-800 dark:text-[#ECFDF5]">36.5 CO2</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">Carbon offset</div>
                 </div>
                 <div className="bg-white dark:bg-[#0D2420] p-4 lg:p-5 rounded-2xl border border-gray-100 dark:border-[#23483F] flex flex-col items-center justify-center shadow-sm">
                    <div className="text-sm lg:text-base font-bold text-gray-800 dark:text-[#ECFDF5]">3,100 m³</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">Water saved</div>
                 </div>
              </div>
            </div>

            {/* --- RIGHT COLUMN (Span 4) --- */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* EnergyPack - Summary Card */}
              <div className="bg-white dark:bg-[#0D2420] rounded-2xl p-5 lg:p-6 shadow-sm border border-gray-100 dark:border-[#23483F]">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-[#10B981]" />
                    <h3 className="font-semibold text-gray-800 dark:text-[#ECFDF5]">EnergyPack</h3>
                  </div>
                  <div className="px-2 py-1 rounded bg-[#F0FDF4] dark:bg-[#183D36] border border-emerald-100 dark:border-[#2D5C51] text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-wide">
                    ● ACTIVE
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total System Power</div>
                    <div className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-[#ECFDF5] mt-1 tracking-tight">90.45 <span className="text-sm text-gray-500 font-normal">kW</span></div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-[#0A2018] rounded-xl border border-gray-100 dark:border-[#23483F]">
                    <div className="text-xs text-gray-500 dark:text-gray-400">1 hour average usage</div>
                    <div className="font-semibold text-gray-800 dark:text-[#ECFDF5] mt-0.5">8.5 kWh</div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 font-medium">
                      <BatteryMedium className="w-4 h-4 text-[#10B981]" /> 90% Battery Reserve
                    </div>
                  </div>
                </div>
                <div className="flex justify-between mt-6 pt-5 border-t border-gray-100 dark:border-[#23483F]">
                  <div className="text-center"><div className="font-bold text-gray-800 dark:text-[#ECFDF5]">{currentLoadKw.toFixed(0)} kWh</div><div className="text-[10px] text-gray-500 uppercase mt-0.5">Today</div></div>
                  <div className="text-center"><div className="font-bold text-gray-800 dark:text-[#ECFDF5]">835 kWh</div><div className="text-[10px] text-gray-500 uppercase mt-0.5">This Month</div></div>
                  <div className="text-center"><div className="font-bold text-gray-800 dark:text-[#ECFDF5]">238 MWh</div><div className="text-[10px] text-gray-500 uppercase mt-0.5">All Time</div></div>
                </div>
              </div>

              {/* Grid Notifications */}
              <div className="bg-white dark:bg-[#0D2420] rounded-2xl p-5 lg:p-6 shadow-sm border border-gray-100 dark:border-[#23483F]">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-semibold text-gray-800 dark:text-[#ECFDF5]">Grid Notifications</h3>
                  {hasWarning || hasCritical ? (
                     <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  ) : null}
                </div>
                <div className="space-y-4">
                  {hasCritical ? (
                    <div className="flex gap-3 items-start p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/50">
                      <div className="p-1.5 rounded bg-white dark:bg-red-900/30 text-red-600 shadow-sm"><AlertTriangle className="w-4 h-4" /></div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-red-50">Critical Violation Detected</div>
                        <div className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">Immediate Action Required</div>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex gap-3 items-start p-3 hover:bg-gray-50 dark:hover:bg-[#0A2018] rounded-xl transition-colors">
                    <div className="p-1.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500"><AlertTriangle className="w-4 h-4" /></div>
                    <div>
                      <div className="text-sm font-medium text-gray-800 dark:text-[#ECFDF5]">Solar output fluctuation</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Warning - Tracked in log</div>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start p-3 hover:bg-gray-50 dark:hover:bg-[#0A2018] rounded-xl transition-colors">
                    <div className="p-1.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"><ShieldCheck className="w-4 h-4" /></div>
                    <div>
                      <div className="text-sm font-medium text-gray-800 dark:text-[#ECFDF5]">Diagnostic check finished</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Info - 10 mins ago</div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 pt-5 border-t border-gray-100 dark:border-[#23483F]">
                  <Button
                    variant={hasCritical ? 'primary' : 'secondary'}
                    size="sm"
                    className="w-full"
                    onClick={() => navigate('/actions')}
                  >
                    {hasCritical ? 'Resolve Violations' : 'Review Actions'}
                  </Button>
                </div>
              </div>

              {/* Weather Impact */}
              <div className="bg-white dark:bg-[#0D2420] rounded-2xl p-5 lg:p-6 shadow-sm border border-gray-100 dark:border-[#23483F] flex-1">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-gray-800 dark:text-[#ECFDF5]">Weather Impact Forecast</h3>
                  <ArrowRight className="-rotate-45 w-4 h-4 text-gray-400" />
                </div>
                <div className="flex justify-between items-end h-32 px-4 mt-6">
                  <div className="w-8 rounded-t-lg bg-[#10B981] relative h-[80%] shadow-inner">
                    <span className="absolute -top-7 text-xs font-medium text-gray-500 dark:text-gray-400 w-full text-center">12h</span>
                  </div>
                  <div className="w-8 rounded-t-lg bg-[#10B981] relative h-[60%] shadow-inner">
                    <span className="absolute -top-7 text-xs font-medium text-gray-500 dark:text-gray-400 w-full text-center">32%</span>
                  </div>
                  <div className="w-8 rounded-t-lg bg-[#10B981] relative h-[40%] shadow-inner">
                    <span className="absolute -top-7 text-xs font-medium text-gray-500 dark:text-gray-400 w-full text-center">24°C</span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 mt-4 px-1">
                  <span className="w-16 text-center leading-tight">Sunlight<br/>Hours</span>
                  <span className="w-16 text-center leading-tight">Cloud<br/>Cover</span>
                  <span className="w-16 text-center leading-tight">Avg<br/>Temp</span>
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  )
}
