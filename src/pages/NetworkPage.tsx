import React from 'react'
import { NetworkDigitalTwin } from '../components/network/NetworkDigitalTwin'
import { ComponentDetailsPanel } from '../components/dashboard/BusDetails'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useUIStore } from '../store/uiStore'
import { useGridNetwork } from '../hooks/useGridNetwork'
import { useGridStore } from '../store/gridStore'
import { useSimulationStore } from '../store/simulationStore'
import {
  Share2,
  Box,
  Layers,
  Activity,
  SlidersHorizontal,
  Info,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const NetworkPage: React.FC = () => {
  const { is3DEnabled, toggle3D } = useUIStore()
  useGridNetwork() // Ensures fetchNetwork is invoked on mount from backend
  const { network, violationSummary, currentTime } = useGridStore()
  const { input } = useSimulationStore()
  const navigate = useNavigate()

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto w-full min-w-0">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1E293B]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2.5">
            <Share2 className="w-5 h-5 text-blue-500" />
            Grid Digital Twin Topology
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Interactive nodal power-flow schematic with branch impedance and switch status
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 2D / 3D Mode Toggle */}
          <button
            onClick={toggle3D}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              is3DEnabled
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-[#111C35] text-slate-300 border-[#1E293B] hover:text-white'
            }`}
          >
            {is3DEnabled ? <Box className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
            <span>{is3DEnabled ? '3D Isometric View' : '2D Schematic (Default)'}</span>
          </button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            onClick={() => navigate('/simulation')}
          >
            Configure Network
          </Button>
        </div>
      </div>

      {/* Main Grid: Digital Twin (8 cols) + Telemetry Inspector (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Network Canvas */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <NetworkDigitalTwin />
        </div>

        {/* Component Telemetry Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <ComponentDetailsPanel />

          {/* Network Constraints Summary Card */}
          <Card>
            <CardHeader
              title="Operating Constraints"
              subtitle="IEEE 1547 / IEC statutory bounds"
              icon={<Activity className="w-4 h-4 text-blue-400" />}
            />
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
                <span className="text-slate-400">Voltage Bounds:</span>
                <span className="font-mono text-white">
                  {input.networkConfig.voltageMinPu.toFixed(2)} - {input.networkConfig.voltageMaxPu.toFixed(2)} pu
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
                <span className="text-slate-400">Feeder Loading Limit:</span>
                <span className="font-mono text-white">{input.networkConfig.feederLoadingLimitPercent}%</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
                <span className="text-slate-400">Active Topology:</span>
                <Badge variant={input.networkConfig.feederTopology === 'alternative' ? 'primary' : 'neutral'} size="sm">
                  {input.networkConfig.feederTopology.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Active Violations:</span>
                <span className={`font-bold font-mono ${violationSummary.critical > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {violationSummary.total} Issues
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
