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
import { GridManagerPanel } from '../components/network/GridManagerPanel'
import {
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
        <div className="flex items-center gap-2.5">
          <GridTypeSwitcher />
          {gridType === 'industrial' && (
            <>
              <button
                onClick={toggle3D}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shadow-xs ${
                  is3DEnabled
                    ? 'bg-[#DDEB9D] dark:bg-[#2D3E2F] text-[#26352A] dark:text-[#F2F5ED] border-[#A0C878]'
                    : 'bg-[#FAF6E9] dark:bg-[#1E2B20] text-[#506052] dark:text-[#C2CCC0] border-[#DDD9C9] dark:border-[#2C3C2E] hover:bg-[#DDEB9D]/30'
                }`}
              >
                {is3DEnabled ? <Box className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                <span>{is3DEnabled ? '3D Isometric View' : '2D Schematic'}</span>
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
            <GridManagerPanel />
            <ComponentDetailsPanel />

            {/* Network Constraints Summary Card */}
            <Card>
              <CardHeader
                title="Operating Constraints"
                subtitle="IEEE 1547 / IEC statutory bounds"
                icon={<Activity className="w-4 h-4 text-[#A0C878]" />}
              />
              <CardContent className="space-y-2.5 text-xs text-[#506052] dark:text-[#C2CCC0]">
                <div className="flex justify-between py-1.5 border-b border-[#DDD9C9] dark:border-[#2C3C2E]">
                  <span className="text-[#788477] dark:text-[#859483]">Voltage Bounds:</span>
                  <span className="font-mono text-[#26352A] dark:text-[#F2F5ED] font-semibold">
                    {input.networkConfig.voltageMinPu.toFixed(2)} - {input.networkConfig.voltageMaxPu.toFixed(2)} pu
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#DDD9C9] dark:border-[#2C3C2E]">
                  <span className="text-[#788477] dark:text-[#859483]">Feeder Loading Limit:</span>
                  <span className="font-mono text-[#26352A] dark:text-[#F2F5ED] font-semibold">{input.networkConfig.feederLoadingLimitPercent}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#DDD9C9] dark:border-[#2C3C2E]">
                  <span className="text-[#788477] dark:text-[#859483]">Active Topology:</span>
                  <Badge variant={input.networkConfig.feederTopology === 'alternative' ? 'primary' : 'neutral'} size="sm">
                    {input.networkConfig.feederTopology.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#788477] dark:text-[#859483]">Active Violations:</span>
                  <span className={`font-bold font-mono ${violationSummary.critical > 0 ? 'text-red-700 dark:text-red-400' : 'text-[#A0C878]'}`}>
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

export default NetworkPage
