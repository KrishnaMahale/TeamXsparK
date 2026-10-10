import React, { useMemo } from 'react'
import { useGridStore } from '../../store/gridStore'
import {
  Layers,
  Activity,
  Zap,
  Sun,
  BatteryMedium,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from 'lucide-react'

export const GridSideLegendInfo: React.FC = () => {
  const { network } = useGridStore()

  // Calculate dynamic vital stats
  const totalSolarKw = useMemo(() => {
    return network.buses.reduce((acc, b) => acc + (b.solarKw || 0), 0)
  }, [network])

  const totalLoadKw = useMemo(() => {
    return network.buses.reduce((acc, b) => acc + (b.loadKw || 0), 0)
  }, [network])

  const criticalBuses = useMemo(() => {
    return network.buses.filter(
      (b) => b.status === 'critical' || b.voltage > 1.05 || b.voltage < 0.95
    )
  }, [network])

  const criticalFeeders = useMemo(() => {
    return network.feeders.filter(
      (f) => f.status === 'critical' || f.loadingPercent > 100
    )
  }, [network])

  const maxVoltage = useMemo(() => {
    if (!network.buses.length) return 1.0
    return Math.max(...network.buses.map((b) => b.voltage || 1.0))
  }, [network])

  const minVoltage = useMemo(() => {
    if (!network.buses.length) return 1.0
    return Math.min(...network.buses.map((b) => b.voltage || 1.0))
  }, [network])

  const maxFeederLoad = useMemo(() => {
    if (!network.feeders.length) return 0
    return Math.max(...network.feeders.map((f) => f.loadingPercent || 0))
  }, [network])

  return (
    <div className="flex flex-col gap-2.5 h-full select-none text-[#10251A] dark:text-[#ECFDF3]">
      {/* 1. Grid Map Legend Card */}
      <div className="p-3 rounded-2xl bg-white/95 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs">
        <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-[#BBF7D0]/40 dark:border-[#86EFAC]/15">
          <Layers className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC]" />
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#10251A] dark:text-[#ECFDF3]">
            Grid Map Legend
          </h4>
        </div>

        {/* Operating Statuses */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold text-[#52665A] dark:text-[#A7F3D0] uppercase tracking-wide">
            Operating Bandwidths
          </div>
          <div className="grid grid-cols-1 gap-1 text-[11px]">
            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/40 dark:border-[#86EFAC]/15">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-xs" />
                <span className="text-[#52665A] dark:text-[#A7F3D0]">Nominal Voltage</span>
              </div>
              <span className="font-mono text-[10px] text-[#047857] dark:text-[#86EFAC] font-medium">&lt; 1.050 pu</span>
            </div>

            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/40 dark:border-[#86EFAC]/15">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs" />
                <span className="text-[#52665A] dark:text-[#A7F3D0]">Feeder Warning</span>
              </div>
              <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-medium">85 - 100% Load</span>
            </div>

            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/40 dark:border-[#86EFAC]/15">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 shadow-xs" />
                <span className="text-[#52665A] dark:text-[#A7F3D0]">Over-Voltage / Trip</span>
              </div>
              <span className="font-mono text-[10px] text-red-600 dark:text-red-400 font-medium">&gt; 1.050 pu</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Basic Yet Important Grid Information */}
      <div className="p-3 rounded-2xl bg-white/95 dark:bg-[#122C1F]/90 border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 shadow-2xs flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#BBF7D0]/40 dark:border-[#86EFAC]/15">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#047857] dark:text-[#86EFAC]" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#10251A] dark:text-[#ECFDF3]">
                Grid Vital Telemetry
              </h4>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-mono text-[#52665A] dark:text-[#A7F3D0]">
              <Radio className="w-2.5 h-2.5 text-[#10B981] animate-pulse" />
              Live
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="p-1.5 rounded-xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/15">
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block">Nominal Base</span>
              <span className="font-mono font-bold text-[11px] text-[#10251A] dark:text-[#ECFDF3]">11.0 kV</span>
            </div>

            <div className="p-1.5 rounded-xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/15">
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block">Topology</span>
              <span className="font-mono font-bold text-[11px] text-[#10251A] dark:text-[#ECFDF3]">Radial Feeder</span>
            </div>

            <div className="p-1.5 rounded-xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/15">
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block">Solar Gen</span>
              <span className="font-mono font-bold text-[11px] text-amber-600 dark:text-amber-400">
                {totalSolarKw.toFixed(0)} kW
              </span>
            </div>

            <div className="p-1.5 rounded-xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/15">
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block">Total Demand</span>
              <span className="font-mono font-bold text-[11px] text-[#10251A] dark:text-[#ECFDF3]">
                {totalLoadKw.toFixed(0)} kW
              </span>
            </div>

            <div className="p-1.5 rounded-xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/15">
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block">Voltage Spread</span>
              <span className={`font-mono font-bold text-[11px] ${maxVoltage > 1.05 ? 'text-red-600 dark:text-red-400' : 'text-[#047857] dark:text-[#86EFAC]'}`}>
                {minVoltage.toFixed(2)} - {maxVoltage.toFixed(2)} pu
              </span>
            </div>

            <div className="p-1.5 rounded-xl bg-[#F7FCF9] dark:bg-[#163826]/70 border border-[#BBF7D0]/50 dark:border-[#86EFAC]/15">
              <span className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] block">Peak Line Load</span>
              <span className={`font-mono font-bold text-[11px] ${maxFeederLoad > 100 ? 'text-red-600 dark:text-red-400' : 'text-[#10251A] dark:text-[#ECFDF3]'}`}>
                {maxFeederLoad.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Health status summary pill */}
        <div className="mt-2 pt-2 border-t border-[#BBF7D0]/50 dark:border-[#86EFAC]/15 flex items-center justify-between text-[11px]">
          <span className="text-[#52665A] dark:text-[#A7F3D0] text-[10px]">Grid State:</span>
          {criticalBuses.length > 0 || criticalFeeders.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 dark:text-red-400">
              <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
              {criticalBuses.length + criticalFeeders.length} Active Breach{criticalBuses.length + criticalFeeders.length > 1 ? 'es' : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#047857] dark:text-[#86EFAC]">
              <CheckCircle2 className="w-3 h-3 text-[#10B981] shrink-0" />
              All Constraints Met
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default GridSideLegendInfo
