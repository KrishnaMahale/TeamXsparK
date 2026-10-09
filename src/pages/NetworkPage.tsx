import React from 'react'
import { NetworkDigitalTwin } from '../components/network/NetworkDigitalTwin'
import { PageContainer } from '../components/layout/PageContainer'
import { ComponentDetailsPanel } from '../components/dashboard/BusDetails'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useGridNetwork } from '../hooks/useGridNetwork'
import { useGridStore } from '../store/gridStore'
import { useSimulationStore } from '../store/simulationStore'
import { GridManagerPanel } from '../components/network/GridManagerPanel'
import { Activity, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const NetworkPage: React.FC = () => {
  useGridNetwork() // Ensures fetchNetwork is invoked on mount from backend
  const { violationSummary } = useGridStore()
  const { input } = useSimulationStore()
  const navigate = useNavigate()

  return (
    <PageContainer
      title="Grid Configurator"
      subtitle="Interactive nodal power-flow schematic with branch impedance, voltage indicators, and tie-line switches"
      actions={
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          onClick={() => navigate('/simulation')}
        >
          Configure Network
        </Button>
      }
    >
      {/* Main Grid: Digital Twin (8 cols) + Telemetry Inspector & Grid Manager on Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Network Canvas & Operating Constraints */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <NetworkDigitalTwin />

          {/* Operating Constraints & Bounds Card */}
          <Card className="border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs">
            <CardHeader
              title="Operating Constraints"
              subtitle="IEEE 1547 / IEC statutory bounds & real-time monitoring"
              icon={<Activity className="w-4 h-4 text-[#A0C878]" />}
            />
            <CardContent className="pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                  <div className="text-[11px] text-[#788477] dark:text-[#859483] font-medium">
                    Voltage Bounds
                  </div>
                  <div className="text-sm font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-1">
                    {input.networkConfig.voltageMinPu.toFixed(2)} -{' '}
                    {input.networkConfig.voltageMaxPu.toFixed(2)} pu
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                  <div className="text-[11px] text-[#788477] dark:text-[#859483] font-medium">
                    Feeder Loading Limit
                  </div>
                  <div className="text-sm font-bold font-mono text-[#26352A] dark:text-[#F2F5ED] mt-1">
                    {input.networkConfig.feederLoadingLimitPercent}%
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                  <div className="text-[11px] text-[#788477] dark:text-[#859483] font-medium">
                    Active Topology
                  </div>
                  <div className="mt-1">
                    <Badge
                      variant={
                        input.networkConfig.feederTopology === 'alternative'
                          ? 'primary'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {input.networkConfig.feederTopology.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#FAF6E9] dark:bg-[#1E2B20] border border-[#DDD9C9] dark:border-[#2C3C2E]">
                  <div className="text-[11px] text-[#788477] dark:text-[#859483] font-medium">
                    Active Violations
                  </div>
                  <div
                    className={`text-sm font-bold font-mono mt-1 ${
                      violationSummary.critical > 0
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-[#A0C878]'
                    }`}
                  >
                    {violationSummary.total} Issues
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Component Telemetry Sidebar on Right Side of 3D Canvas */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <GridManagerPanel />
          <ComponentDetailsPanel />
        </div>
      </div>
    </PageContainer>
  )
}

export default NetworkPage
