import React from 'react'
import { NetworkDigitalTwin } from '../components/network/NetworkDigitalTwin'
import { PageContainer } from '../components/layout/PageContainer'
import { ComponentDetailsPanel } from '../components/dashboard/BusDetails'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useUIStore } from '../store/uiStore'
import { useGridNetwork } from '../hooks/useGridNetwork'
import { useGridStore } from '../store/gridStore'
import { useSimulationStore } from '../store/simulationStore'
import { useDomesticStore } from '../store/domesticStore'
import { GridTypeSwitcher } from '../components/layout/GridTypeSwitcher'
import { DomesticNetwork2D } from '../components/domestic/DomesticNetwork2D'
import { DomesticHouseDetails } from '../components/domestic/DomesticHouseDetails'
import { DomesticVoltageProfileChart } from '../components/domestic/DomesticVoltageProfileChart'
import {
  Share2,
  Box,
  Layers,
  Activity,
  SlidersHorizontal,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const NetworkPage: React.FC = () => {
  const { is3DEnabled, toggle3D } = useUIStore()
  useGridNetwork() // Ensures fetchNetwork is invoked on mount from backend
  const { violationSummary } = useGridStore()
  const { input } = useSimulationStore()
  const { gridType } = useDomesticStore()
  const navigate = useNavigate()

  return (
    <PageContainer
      title={gridType === 'domestic' ? 'Rooftop Solar Low-Voltage Feeder' : 'Grid Digital Twin Topology'}
      subtitle={
        gridType === 'domestic'
          ? 'Residential street distribution network with bidirectional smart meters and pole transformer'
          : 'Interactive nodal power-flow schematic with branch impedance, voltage indicators, and tie-line switches'
      }
      actions={
        <div className="flex items-center gap-3">
          <GridTypeSwitcher />
          {gridType === 'industrial' && (
            <>
              <button
                onClick={toggle3D}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  is3DEnabled
                    ? 'bg-[#D1FAE5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#ECFDF5] border-emerald-300 dark:border-emerald-700 shadow-sm'
                    : 'bg-white dark:bg-[#0D2420] text-gray-600 dark:text-gray-300 border-gray-100 dark:border-[#23483F] hover:bg-emerald-50 dark:hover:bg-[#183D36] shadow-sm'
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
            </>
          )}
        </div>
      }
    >
      {gridType === 'domestic' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <DomesticNetwork2D />
            <DomesticVoltageProfileChart />
          </div>
          <div className="lg:col-span-4 flex flex-col gap-4">
            <DomesticHouseDetails />
          </div>
        </div>
      ) : (
        /* Main Grid: Digital Twin (8 cols) + Telemetry Inspector (4 cols) */
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
                icon={<Activity className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
              />
              <CardContent className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Voltage Bounds:</span>
                  <span className="font-mono text-slate-900 dark:text-white font-medium">
                    {input.networkConfig.voltageMinPu.toFixed(2)} - {input.networkConfig.voltageMaxPu.toFixed(2)} pu
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Feeder Loading Limit:</span>
                  <span className="font-mono text-slate-900 dark:text-white font-medium">{input.networkConfig.feederLoadingLimitPercent}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Active Topology:</span>
                  <Badge variant={input.networkConfig.feederTopology === 'alternative' ? 'primary' : 'neutral'} size="sm">
                    {input.networkConfig.feederTopology.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Active Violations:</span>
                  <span className={`font-bold font-mono ${violationSummary.critical > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {violationSummary.total} Issues
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
