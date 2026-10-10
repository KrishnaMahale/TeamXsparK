import React from 'react'
import { NetworkDigitalTwin } from '../components/network/NetworkDigitalTwin'
import { PageContainer } from '../components/layout/PageContainer'
import { ComponentDetailsPanel } from '../components/dashboard/BusDetails'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useGridNetwork } from '../hooks/useGridNetwork'
import { useGridStore } from '../store/gridStore'
import { useSimulationStore } from '../store/simulationStore'
import { GridManagerPanel } from '../components/network/GridManagerPanel'
import { Activity, CheckCircle2 } from 'lucide-react'

export const NetworkPage: React.FC = () => {
  useGridNetwork() // Ensures fetchNetwork is invoked on mount from backend
  const { network } = useGridStore()
  const { input } = useSimulationStore()

  return (
    <PageContainer compact className="py-3 px-4 lg:py-3.5 lg:px-5">
      <div className="space-y-3.5 w-full pb-3">
        {/* Upshifted Custom Hero Heading Box with Refined Mint Gradient & Depth */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#F0FDF4]/95 via-white/95 to-white/85 dark:from-[#0E291C]/95 dark:via-[#122C1F]/90 dark:to-[#0E2419]/85 backdrop-blur-md border border-[#86EFAC]/75 dark:border-[#86EFAC]/35 p-4 sm:p-5 lg:p-5.5 shadow-[0_10px_30px_rgba(16,80,55,0.08),0_2px_8px_rgba(16,80,55,0.04)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
          {/* Background Visual Layer: Renewable Grid Landscape Seamless Gradient Fade */}
          <div className="header-hero-bg absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <img
              src="/images/hero_grid.jpg"
              alt="Renewable Grid Landscape"
              className="header-hero-bg-img w-full h-full object-cover object-right lg:object-center opacity-90 dark:opacity-60 transition-opacity"
              loading="eager"
            />
          </div>

          {/* Left: Upshifted Bigger Heading & Subtitle */}
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl lg:text-4xl font-black text-[#064E3B] dark:text-[#F0FDF4] tracking-tight leading-none">
              Grid Configurator
            </h1>
            <p className="text-xs sm:text-sm text-[#375243] dark:text-[#A7F3D0] font-medium mt-1.5 leading-relaxed max-w-xl">
              Design, customize, and configure your power distribution network topology, substations, and DER assets.
            </p>
          </div>
        </div>

        {/* Main Grid: Digital Twin (8 cols) + Telemetry Inspector & Grid Manager on Right (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* Network Canvas & Operating Constraints */}
          <div className="lg:col-span-8 flex flex-col gap-3.5">
            <NetworkDigitalTwin />

            {/* Operating Constraints & Design Parameters Card */}
            <Card className="border-[#86EFAC]/75 dark:border-[#86EFAC]/30 bg-white/92 dark:bg-[#122C1F]/90 backdrop-blur-md rounded-2xl shadow-xs transition-colors">
              <CardHeader
                className="border-b border-[#A7F3D0]/60 dark:border-[#86EFAC]/22"
                title="Operating Constraints & Boundaries"
                subtitle="IEEE 1547 / IEC statutory design limits & feeder parameters"
                icon={<Activity className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />}
              />
              <CardContent className="pt-1 pb-3 sm:pb-3.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/90 dark:bg-[#0E2419]/80 border border-[#86EFAC]/65 dark:border-[#86EFAC]/25 shadow-2xs">
                    <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0] font-medium">
                      Voltage Bounds
                    </div>
                    <div className="text-sm font-bold font-mono text-[#10251A] dark:text-white mt-1">
                      {input.networkConfig.voltageMinPu.toFixed(2)} -{' '}
                      {input.networkConfig.voltageMaxPu.toFixed(2)} pu
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/90 dark:bg-[#0E2419]/80 border border-[#86EFAC]/65 dark:border-[#86EFAC]/25 shadow-2xs">
                    <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0] font-medium">
                      Feeder Loading Limit
                    </div>
                    <div className="text-sm font-bold font-mono text-[#10251A] dark:text-white mt-1">
                      {input.networkConfig.feederLoadingLimitPercent}%
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/90 dark:bg-[#0E2419]/80 border border-[#86EFAC]/65 dark:border-[#86EFAC]/25 shadow-2xs">
                    <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0] font-medium">
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

                  {/* Design Status */}
                  <div className="p-3 rounded-xl bg-white/90 dark:bg-[#0E2419]/80 border border-[#86EFAC]/65 dark:border-[#86EFAC]/25 shadow-2xs">
                    <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0] font-medium">
                      Design State
                    </div>
                    <div className="text-xs font-bold font-mono text-[#047857] dark:text-[#86EFAC] mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                      <span>{network.buses.length} Buses Configured</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Component Telemetry Sidebar on Right Side of 3D Canvas */}
          <div className="lg:col-span-4 flex flex-col gap-3.5">
            <GridManagerPanel />
            <ComponentDetailsPanel />
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

export default NetworkPage
