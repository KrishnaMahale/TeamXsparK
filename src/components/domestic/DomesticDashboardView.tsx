import React from 'react'
import { DomesticNetwork2D } from './DomesticNetwork2D'
import { DomesticHouseDetails } from './DomesticHouseDetails'
import { DomesticVoltageProfileChart } from './DomesticVoltageProfileChart'
import { DomesticCommunityMetrics } from './DomesticCommunityMetrics'
import { DomesticControlPanel } from './DomesticControlPanel'
import { DomesticTimeSlider } from './DomesticTimeSlider'
import { useDomesticStore } from '../../store/domesticStore'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import {
  Home,
  Sun,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  SlidersHorizontal,
  Activity,
  Layers,
} from 'lucide-react'

export const DomesticDashboardView: React.FC = () => {
  const { network, activePreset, activeControl, setControlAction } = useDomesticStore()

  const hasCritical = network.overVoltageHousesCount > 0
  const isMitigated = activeControl !== 'NONE'

  const presetLabels: Record<string, string> = {
    SUNNY_NOON_EXPORT: 'Sunny Noon Peak (High Solar Export)',
    EVENING_PEAK: 'Evening Residential Peak (High Appliance Load)',
    BALANCED_STORAGE: 'High Self-Consumption (Active Battery Storage)',
    OVERCAST_IMPORT: 'Overcast / Cloudy Day (Grid Supplement)',
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Bar with Context & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#111C35] border border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                Scenario: {presetLabels[activePreset] || activePreset}
              </h2>
              <Badge variant={hasCritical ? 'danger' : 'success'} size="sm">
                {hasCritical
                  ? `${network.overVoltageHousesCount} Over-Voltage Active`
                  : 'Grid Safe • IEEE 1547 Compliant'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Low-Voltage (230V/400V) Residential Radial Feeder • 8 Rooftop PV Homes • 100kVA Distribution Transformer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {hasCritical && !isMitigated && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
              onClick={() => setControlAction('VOLT_VAR_DROOP')}
            >
              Enable Volt-VAR Inverter Control
            </Button>
          )}
          {isMitigated && (
            <Badge variant="success" size="md">
              ✓ Active Mitigation: {activeControl.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
      </div>

      {/* 2. Interactive Time Slider for Diurnal Simulation */}
      <DomesticTimeSlider />

      {/* 3. Community KPI Cards */}
      <DomesticCommunityMetrics />

      {/* 4. Main Digital Twin Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 2D Schematic & Voltage Profile Curve (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-amber-400" />
                  Rooftop Solar Neighborhood Digital Twin
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  (8 Homes • 7 Solar Arrays • 5 Batteries • 1 Pole Transformer)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Click any house card to inspect live telemetry
              </span>
            </div>

            <DomesticNetwork2D />
          </div>

          {/* Feeder Distance vs Voltage Profile Chart */}
          <DomesticVoltageProfileChart />
        </div>

        {/* Right: Selected House Details & Control Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <DomesticHouseDetails />
          <DomesticControlPanel />
        </div>
      </div>
    </div>
  )
}
