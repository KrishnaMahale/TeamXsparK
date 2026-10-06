import React, { useEffect } from 'react'
import { NetworkStatus } from '../components/dashboard/NetworkStatus'
import { useSimulationStore } from '../store/simulationStore'
import { useGridStore } from '../store/gridStore'
import { useDomesticStore } from '../store/domesticStore'
import { DomesticDashboardView } from '../components/domestic/DomesticDashboardView'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import {
  Sun,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  BatteryMedium,
} from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const { input, fullResult, fetchActions } = useSimulationStore()
  const { network, violationSummary, fetchNetwork } = useGridStore()
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

  const hasCritical = violationSummary.critical > 0
  const hasWarning = violationSummary.warning > 0

  return (
    <div className="p-5 lg:p-6 space-y-6 w-full min-w-0">

      {gridType === 'domestic' ? (
        <DomesticDashboardView />
      ) : (
        <>
          {/* 1. Top Banner (Solar Panel Management) */}
          <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-xl p-6 lg:p-7 relative overflow-hidden flex flex-col justify-between min-h-[290px] shadow-xs">
            <div className="flex flex-col md:flex-row justify-between relative z-10 gap-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-semibold text-[#26352A] dark:text-[#F2F5ED] tracking-tight">Solar Panel Management</h1>
                <p className="text-xs sm:text-sm text-[#506052] dark:text-[#C2CCC0] mt-1">Live energy production, consumption, and system performance</p>
              </div>
              <div className="flex gap-8 text-right bg-[#FFFDF6] dark:bg-[#151F17] p-3.5 rounded-lg h-fit border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs">
                <div>
                  <div className="text-2xl font-bold text-[#26352A] dark:text-[#F2F5ED] font-mono">{currentLoadKw.toFixed(1)} <span className="text-sm font-normal">kW</span></div>
                  <div className="text-[10px] text-[#788477] dark:text-[#859483] font-semibold tracking-wider mt-0.5">Current Load</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#26352A] dark:text-[#F2F5ED] font-mono">98.4 <span className="text-sm font-normal">%</span></div>
                  <div className="text-[10px] text-[#788477] dark:text-[#859483] font-semibold tracking-wider mt-0.5">System Health</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-8 relative z-10">
              {/* Power Efficiency card */}
              <div className="bg-[#FFFDF6] dark:bg-[#151F17] rounded-lg p-3.5 w-52 shadow-xs border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-[#26352A] dark:text-[#F2F5ED]">Power Efficiency</span>
                  <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] p-1 rounded-md shadow-xs border border-[#DDD9C9] dark:border-[#2C3C2E]">
                    <ArrowRight className="-rotate-45 w-3 h-3 text-[#506052] dark:text-[#C2CCC0]" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#26352A] dark:text-[#F2F5ED] mt-2 text-center">64%</div>
                <div className="h-2 w-full bg-[#DDD9C9]/60 dark:bg-[#2C3C2E] rounded-full mt-2.5 overflow-hidden flex">
                  <div className="w-[64%] bg-[#A0C878] h-full" />
                  <div className="w-[36%] bg-[#26352A] dark:bg-[#788477] h-full" />
                </div>
                <div className="flex justify-between text-[10px] text-[#788477] dark:text-[#859483] mt-2 font-medium">
                  <span>Surface +3%</span>
                  <span>Trim +5%</span>
                </div>
              </div>
              
              {/* Power Consumption card */}
              <div className="bg-[#FFFDF6] dark:bg-[#151F17] rounded-lg p-3.5 w-52 shadow-xs border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-[#26352A] dark:text-[#F2F5ED]">Power Infeed</span>
                  <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] p-1 rounded-md shadow-xs border border-[#DDD9C9] dark:border-[#2C3C2E]">
                    <ArrowRight className="-rotate-45 w-3 h-3 text-[#506052] dark:text-[#C2CCC0]" />
                  </div>
                </div>
                <div className="flex items-end gap-2 mt-2">
                  <div className="text-xl font-bold text-[#26352A] dark:text-[#F2F5ED] font-mono">{currentSolarKw.toFixed(1)} kWh</div>
                  <div className="text-[10px] text-[#A0C878] font-bold mb-0.5">↓ 0.88%</div>
                </div>
                <div className="flex gap-1 h-5 mt-2.5 items-end">
                  {[...Array(16)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-xs ${i > 10 ? 'bg-[#DDD9C9] dark:bg-[#2C3C2E]' : 'bg-[#A0C878]'}`}
                      style={{height: `${Math.max(30, ((i * 19 + 35) % 100))}%`}}
                    />
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
              <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] rounded-xl p-5 lg:p-6 shadow-xs border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-sm text-[#26352A] dark:text-[#F2F5ED]">Asset System & Live Telemetry</h3>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] text-[#26352A] dark:text-[#F2F5ED] font-semibold bg-[#DDEB9D] dark:bg-[#2D3E2F] border border-[#C9C7B5] dark:border-[#3B4E3E] px-2 py-0.5 rounded-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#A0C878] animate-pulse" /> Live Data
                    </span>
                  </div>
                </div>
                <NetworkStatus />
              </div>

              {/* Energy Production Timeline - Wide */}
              <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] rounded-xl p-5 lg:p-6 shadow-xs border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-sm text-[#26352A] dark:text-[#F2F5ED]">Energy Production Timeline</h3>
                  <span className="text-xs text-[#506052] dark:text-[#C2CCC0] border border-[#DDD9C9] dark:border-[#2C3C2E] bg-[#FFFDF6] dark:bg-[#151F17] px-2.5 py-1 rounded-md cursor-pointer hover:bg-[#DDEB9D] dark:hover:bg-[#2D3E2F] transition-colors font-medium">
                    This week ▾
                  </span>
                </div>
                <div className="flex justify-end gap-4 text-xs text-[#506052] dark:text-[#C2CCC0] mb-5 font-medium">
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-xs bg-[#A0C878]" /> Energy production</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-xs bg-[#26352A] dark:bg-[#C2CCC0]" /> Energy consumption</span>
                </div>
                <div className="flex items-end justify-between h-32 mt-2 px-4">
                  {[40, 70, 90, 60, 50, 80, 70].map((h, i) => (
                    <div key={i} className="flex gap-1.5 items-end h-full w-full justify-center group cursor-crosshair">
                      <div className="w-3 lg:w-4 rounded-t-xs bg-[#26352A] dark:bg-[#859483] group-hover:opacity-80 transition-opacity" style={{height: `${h}%`}} />
                      <div className="w-3 lg:w-4 rounded-t-xs bg-[#A0C878] group-hover:opacity-80 transition-opacity" style={{height: `${h+10}%`}} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-[#788477] dark:text-[#859483] mt-4 px-4 font-semibold">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
                <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] p-4 lg:p-5 rounded-xl border border-[#DDD9C9] dark:border-[#2C3C2E] flex flex-col items-center justify-center shadow-xs">
                  <div className="text-base font-bold text-[#26352A] dark:text-[#F2F5ED] font-mono">{currentSolarKw.toFixed(1)} kW</div>
                  <div className="text-xs text-[#788477] dark:text-[#859483] mt-1 tracking-wider font-semibold">Energy Yield</div>
                </div>
                <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] p-4 lg:p-5 rounded-xl border border-[#DDD9C9] dark:border-[#2C3C2E] flex flex-col items-center justify-center shadow-xs">
                  <div className="text-base font-bold text-[#26352A] dark:text-[#F2F5ED] font-mono">36.5 CO2</div>
                  <div className="text-xs text-[#788477] dark:text-[#859483] mt-1 tracking-wider font-semibold">Carbon Offset</div>
                </div>
                <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] p-4 lg:p-5 rounded-xl border border-[#DDD9C9] dark:border-[#2C3C2E] flex flex-col items-center justify-center shadow-xs">
                  <div className="text-base font-bold text-[#26352A] dark:text-[#F2F5ED] font-mono">3,100 m³</div>
                  <div className="text-xs text-[#788477] dark:text-[#859483] mt-1 tracking-wider font-semibold">Water Saved</div>
                </div>
              </div>
            </div>

            {/* --- RIGHT COLUMN (Span 4) --- */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* EnergyPack - Summary Card */}
              <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] rounded-xl p-5 lg:p-6 shadow-xs border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-[#A0C878]" />
                    <h3 className="font-bold text-sm text-[#26352A] dark:text-[#F2F5ED]">EnergyPack</h3>
                  </div>
                  <div className="px-2 py-0.5 rounded-md bg-[#DDEB9D] dark:bg-[#2D3E2F] border border-[#C9C7B5] dark:border-[#3B4E3E] text-[#26352A] dark:text-[#DDEB9D] text-[10px] font-bold tracking-wider">
                    ● ACTIVE
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-[#788477] dark:text-[#859483]">Total System Power</div>
                    <div className="text-2xl lg:text-3xl font-bold text-[#26352A] dark:text-[#F2F5ED] mt-1 tracking-tight font-mono">90.45 <span className="text-sm text-[#788477] font-normal font-sans">kW</span></div>
                  </div>
                  <div className="p-3 bg-[#FFFDF6] dark:bg-[#151F17] rounded-lg border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs">
                    <div className="text-xs text-[#788477] dark:text-[#859483] font-medium">1 hour average usage</div>
                    <div className="font-bold text-[#26352A] dark:text-[#F2F5ED] mt-0.5 font-mono">8.5 kWh</div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-xs text-[#506052] dark:text-[#C2CCC0] font-semibold">
                      <BatteryMedium className="w-4 h-4 text-[#A0C878]" /> 90% Battery Reserve
                    </div>
                  </div>
                </div>
                <div className="flex justify-between mt-5 pt-4 border-t border-[#DDD9C9] dark:border-[#2C3C2E]">
                  <div className="text-center"><div className="font-bold text-[#26352A] dark:text-[#F2F5ED] font-mono">{currentLoadKw.toFixed(0)} kWh</div><div className="text-[10px] text-[#788477] mt-0.5 font-semibold">Today</div></div>
                  <div className="text-center"><div className="font-bold text-[#26352A] dark:text-[#F2F5ED] font-mono">835 kWh</div><div className="text-[10px] text-[#788477] mt-0.5 font-semibold">This Month</div></div>
                  <div className="text-center"><div className="font-bold text-[#26352A] dark:text-[#F2F5ED] font-mono">238 MWh</div><div className="text-[10px] text-[#788477] mt-0.5 font-semibold">All Time</div></div>
                </div>
              </div>

              {/* Grid Notifications */}
              <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] rounded-xl p-5 lg:p-6 shadow-xs border border-[#DDD9C9] dark:border-[#2C3C2E]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-sm text-[#26352A] dark:text-[#F2F5ED]">Grid Notifications</h3>
                  {hasWarning || hasCritical ? (
                     <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  ) : null}
                </div>
                <div className="space-y-3">
                  {hasCritical ? (
                    <div className="flex gap-3 items-start p-3 bg-red-50/80 dark:bg-red-950/40 rounded-lg border border-red-300 dark:border-red-900/80">
                      <div className="p-1.5 rounded-md bg-white dark:bg-red-900/30 text-red-600 shadow-xs"><AlertTriangle className="w-4 h-4" /></div>
                      <div>
                        <div className="text-xs font-bold text-red-900 dark:text-red-100">Critical Violation Detected</div>
                        <div className="text-[11px] text-red-700 dark:text-red-300 font-medium mt-0.5">Immediate Action Required</div>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex gap-3 items-start p-3 hover:bg-[#FFFDF6] dark:hover:bg-[#151F17] rounded-lg border border-transparent hover:border-[#DDD9C9] dark:hover:border-[#2C3C2E] transition-colors">
                    <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"><AlertTriangle className="w-4 h-4" /></div>
                    <div>
                      <div className="text-xs font-semibold text-[#26352A] dark:text-[#F2F5ED]">Solar output fluctuation</div>
                      <div className="text-[11px] text-[#788477] dark:text-[#859483] mt-0.5">Warning - Tracked in log</div>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start p-3 hover:bg-[#FFFDF6] dark:hover:bg-[#151F17] rounded-lg border border-transparent hover:border-[#DDD9C9] dark:hover:border-[#2C3C2E] transition-colors">
                    <div className="p-1.5 rounded-md bg-[#DDEB9D] dark:bg-[#2D3E2F] text-[#26352A] dark:text-[#A0C878]"><ShieldCheck className="w-4 h-4" /></div>
                    <div>
                      <div className="text-xs font-semibold text-[#26352A] dark:text-[#F2F5ED]">Diagnostic check finished</div>
                      <div className="text-[11px] text-[#788477] dark:text-[#859483] mt-0.5">Info - 10 mins ago</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#DDD9C9] dark:border-[#2C3C2E]">
                  <Button
                    variant={hasCritical ? 'danger' : 'secondary'}
                    size="sm"
                    className="w-full"
                    onClick={() => navigate('/actions')}
                  >
                    {hasCritical ? 'Resolve Violations' : 'Review Actions'}
                  </Button>
                </div>
              </div>

              {/* Weather Impact */}
              <div className="bg-[#FAF6E9] dark:bg-[#1E2B20] rounded-xl p-5 lg:p-6 shadow-xs border border-[#DDD9C9] dark:border-[#2C3C2E] flex-1">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-sm text-[#26352A] dark:text-[#F2F5ED]">Weather Impact Forecast</h3>
                  <ArrowRight className="-rotate-45 w-4 h-4 text-[#788477]" />
                </div>
                <div className="flex justify-between items-end h-28 px-4 mt-4">
                  <div className="w-8 rounded-t-xs bg-[#A0C878] relative h-[80%] shadow-xs">
                    <span className="absolute -top-6 text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] w-full text-center">12h</span>
                  </div>
                  <div className="w-8 rounded-t-xs bg-[#A0C878] relative h-[60%] shadow-xs">
                    <span className="absolute -top-6 text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] w-full text-center">32%</span>
                  </div>
                  <div className="w-8 rounded-t-xs bg-[#A0C878] relative h-[40%] shadow-xs">
                    <span className="absolute -top-6 text-xs font-bold text-[#26352A] dark:text-[#F2F5ED] w-full text-center">24°C</span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] uppercase font-bold text-[#788477] dark:text-[#859483] mt-3 px-1">
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

export default DashboardPage
