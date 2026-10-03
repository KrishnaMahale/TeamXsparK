import React, { useState } from 'react'
import { Plus, Trash2, RotateCcw, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'

export interface TimeSeriesRow {
  id: string
  time: string
  value: number
}

interface TimeSeriesEditorProps {
  title: string
  unit: string
  data: TimeSeriesRow[]
  onUpdateValue: (id: string, value: number) => void
  onAddRow: (time: string, value: number) => void
  onDeleteRow: (id: string) => void
  onGenerateSample: () => void
  maxValue?: number
  labelValue?: string
}

export const TimeSeriesEditor: React.FC<TimeSeriesEditorProps> = ({
  title,
  unit,
  data,
  onUpdateValue,
  onAddRow,
  onDeleteRow,
  onGenerateSample,
  maxValue,
  labelValue = 'Value',
}) => {
  const [newTime, setNewTime] = useState<string>('12:00')
  const [newValue, setNewValue] = useState<number>(100)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleAdd = () => {
    setErrorMsg(null)
    if (!newTime || !newTime.match(/^\d{2}:\d{2}$/)) {
      setErrorMsg('Please specify time as HH:MM')
      return
    }
    if (data.some((d) => d.time === newTime)) {
      setErrorMsg(`Timestamp ${newTime} already exists in time-series`)
      return
    }
    if (newValue < 0) {
      setErrorMsg('Value must be non-negative')
      return
    }
    if (maxValue !== undefined && newValue > maxValue) {
      setErrorMsg(`Value exceeds maximum installed capacity of ${maxValue} ${unit}`)
      return
    }

    onAddRow(newTime, newValue)
  }

  return (
    <div className="flex flex-col space-y-3">
      {/* Header with Sample Profile Generator */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {title} ({data.length} intervals)
        </span>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={onGenerateSample}
        >
          Generate Realistic Profile
        </Button>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Editable Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-xs">
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 w-28">Time</th>
                <th className="py-2.5 px-3">{labelValue} ({unit})</th>
                <th className="py-2.5 px-3 w-16 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {data.map((row) => {
                const isOver = maxValue !== undefined && row.value > maxValue

                return (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-1.5 px-3 text-sky-700 dark:text-sky-300 font-bold">{row.time}</td>
                    <td className="py-1.5 px-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max={maxValue}
                          value={row.value}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            onUpdateValue(row.id, val)
                          }}
                          className={`w-28 px-2 py-1 rounded bg-white dark:bg-slate-900 border text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 ${
                            isOver
                              ? 'border-red-500 text-red-600 dark:text-red-400 ring-1 ring-red-500'
                              : 'border-slate-300 dark:border-slate-700 focus:ring-sky-500'
                          }`}
                        />
                        {isOver && (
                          <span className="text-[10px] text-red-600 dark:text-red-400 font-sans">
                            Exceeds capacity ({maxValue} {unit})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <button
                        onClick={() => onDeleteRow(row.id)}
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Delete interval"
                        aria-label="Delete interval"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Add Row Toolbar */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <input
            type="text"
            placeholder="HH:MM"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="w-24 px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <input
            type="number"
            min="0"
            placeholder={labelValue}
            value={newValue}
            onChange={(e) => setNewValue(parseFloat(e.target.value) || 0)}
            className="w-28 px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleAdd}
          >
            Add Interval
          </Button>
        </div>
      </div>
    </div>
  )
}
