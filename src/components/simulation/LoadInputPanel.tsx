import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { TimeSeriesEditor } from './TimeSeriesEditor'
import { TimeSeriesLoadPoint } from '../../types/simulation'
import { Zap } from 'lucide-react'

interface LoadInputPanelProps {
  peakLoadKw: number
  currentLoadKw: number
  loadTimeSeries: TimeSeriesLoadPoint[]
  onChangePeakLoad: (val: number) => void
  onChangeCurrentLoad: (val: number) => void
  onUpdateLoadPoint: (id: string, val: number) => void
  onAddLoadPoint: (time: string, val: number) => void
  onDeleteLoadPoint: (id: string) => void
  onGenerateSample: () => void
}

export const LoadInputPanel: React.FC<LoadInputPanelProps> = ({
  peakLoadKw,
  currentLoadKw,
  loadTimeSeries,
  onChangePeakLoad,
  onChangeCurrentLoad,
  onUpdateLoadPoint,
  onAddLoadPoint,
  onDeleteLoadPoint,
  onGenerateSample,
}) => {
  const [activeTab, setActiveTab] = useState<'simple' | 'timeseries'>('simple')

  const timeSeriesRows = loadTimeSeries.map((l) => ({
    id: l.id,
    time: l.time,
    value: l.loadKw,
  }))

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Load Demand Input"
        subtitle="Configure aggregate feeder consumption parameters"
        icon={<Zap className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
        action={
          <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('simple')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'simple'
                  ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700/60 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Simple Input
            </button>
            <button
              onClick={() => setActiveTab('timeseries')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'timeseries'
                  ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700/60 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Time-Series Table
            </button>
          </div>
        }
      />
      <CardContent className="space-y-4">
        {activeTab === 'simple' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Peak Feeder Load */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Peak Feeder Load (kW)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={peakLoadKw}
                  onChange={(e) => onChangePeakLoad(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">kW</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Maximum coincident demand across all buses</p>
            </div>

            {/* Current Feeder Load */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Current Feeder Load (kW)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={currentLoadKw}
                  onChange={(e) => onChangeCurrentLoad(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sky-700 dark:text-sky-300 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">kW</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Active demand at baseline snapshot</p>
            </div>
          </div>
        ) : (
          <TimeSeriesEditor
            title="Hourly Demand Profile"
            unit="kW"
            data={timeSeriesRows}
            onUpdateValue={onUpdateLoadPoint}
            onAddRow={onAddLoadPoint}
            onDeleteRow={onDeleteLoadPoint}
            onGenerateSample={onGenerateSample}
            labelValue="Load"
          />
        )}
      </CardContent>
    </Card>
  )
}
