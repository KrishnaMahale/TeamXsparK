import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { TimeSeriesEditor } from './TimeSeriesEditor'
import { TimeSeriesSolarPoint } from '../../types/simulation'
import { Sun, Sliders, Table } from 'lucide-react'

interface SolarInputPanelProps {
  installedCapacityKw: number
  currentSolarKw: number
  solarTimeSeries: TimeSeriesSolarPoint[]
  onChangeInstalledCapacity: (val: number) => void
  onChangeCurrentSolar: (val: number) => void
  onUpdateSolarPoint: (id: string, val: number) => void
  onAddSolarPoint: (time: string, val: number) => void
  onDeleteSolarPoint: (id: string) => void
  onGenerateSample: () => void
}

export const SolarInputPanel: React.FC<SolarInputPanelProps> = ({
  installedCapacityKw,
  currentSolarKw,
  solarTimeSeries,
  onChangeInstalledCapacity,
  onChangeCurrentSolar,
  onUpdateSolarPoint,
  onAddSolarPoint,
  onDeleteSolarPoint,
  onGenerateSample,
}) => {
  const [activeTab, setActiveTab] = useState<'simple' | 'timeseries'>('simple')

  const timeSeriesRows = solarTimeSeries.map((s) => ({
    id: s.id,
    time: s.time,
    value: s.solarKw,
  }))

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Solar Generation Input"
        subtitle="Configure distributed rooftop & utility PV parameters"
        icon={<Sun className="w-4 h-4 text-amber-400" />}
        action={
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('simple')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'simple'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Simple Input
            </button>
            <button
              onClick={() => setActiveTab('timeseries')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'timeseries'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Time-Series Table
            </button>
          </div>
        }
      />
      <CardContent className="space-y-4">
        {activeTab === 'simple' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Installed Solar Capacity */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Installed Solar Capacity (kW)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={installedCapacityKw}
                    onChange={(e) => onChangeInstalledCapacity(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-xs font-mono text-slate-400">kW</span>
                </div>
                <p className="text-[11px] text-slate-500">Total rated nameplate PV peak on feeder</p>
              </div>

              {/* Current Solar Generation */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Current Solar Generation (kW)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={installedCapacityKw}
                    value={currentSolarKw}
                    onChange={(e) => onChangeCurrentSolar(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-mono text-sm focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-xs font-mono text-slate-400">kW</span>
                </div>
                <p className="text-[11px] text-slate-500">Active generation at baseline snapshot</p>
              </div>
            </div>

            {currentSolarKw > installedCapacityKw && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
                ⚠️ Current generation cannot exceed installed capacity of {installedCapacityKw} kW.
              </div>
            )}
          </div>
        ) : (
          <TimeSeriesEditor
            title="Hourly Solar PV Profile"
            unit="kW"
            data={timeSeriesRows}
            onUpdateValue={onUpdateSolarPoint}
            onAddRow={onAddSolarPoint}
            onDeleteRow={onDeleteSolarPoint}
            onGenerateSample={onGenerateSample}
            maxValue={installedCapacityKw}
            labelValue="Solar"
          />
        )}
      </CardContent>
    </Card>
  )
}
