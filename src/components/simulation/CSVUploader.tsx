import React, { useState } from 'react'
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface CSVUploaderProps {
  onImport: (points: Array<{ time: string; solarKw: number; loadKw: number }>) => void
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({ onImport }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [parsedRows, setParsedRows] = useState<Array<{ time: string; solarKw: number; loadKw: number }>>([])
  const [errors, setErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setErrors([])
    setParsedRows([])

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  const parseCSV = (csvContent: string) => {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) {
      setErrors(['CSV must contain a header and at least one data row'])
      return
    }

    const header = lines[0].toLowerCase().split(',').map((h) => h.trim())
    const timeIdx = header.findIndex((h) => h.includes('time') || h.includes('timestamp'))
    const solarIdx = header.findIndex((h) => h.includes('solar'))
    const loadIdx = header.findIndex((h) => h.includes('load'))

    if (timeIdx === -1 || solarIdx === -1 || loadIdx === -1) {
      setErrors([
        'CSV header missing required columns. Expected format: timestamp,solar_kw,load_kw',
      ])
      return
    }

    const rows: Array<{ time: string; solarKw: number; loadKw: number }> = []
    const newErrors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim())
      if (parts.length < 3) continue

      const timeVal = parts[timeIdx]
      const solarVal = parseFloat(parts[solarIdx])
      const loadVal = parseFloat(parts[loadIdx])

      if (isNaN(solarVal) || isNaN(loadVal)) {
        newErrors.push(`Row ${i + 1}: Solar and Load must be valid numbers`)
        continue
      }

      rows.push({
        time: timeVal,
        solarKw: Math.max(0, solarVal),
        loadKw: Math.max(0, loadVal),
      })
    }

    if (rows.length === 0) {
      newErrors.push('No valid data rows found in CSV')
    }

    setErrors(newErrors)
    setParsedRows(rows)
  }

  const handleConfirm = () => {
    if (parsedRows.length > 0) {
      onImport(parsedRows)
      setIsOpen(false)
      setParsedRows([])
      setFileName(null)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<Upload className="w-3.5 h-3.5" />}
        onClick={() => setIsOpen(true)}
      >
        Import CSV
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Import Solar & Load CSV Profile"
        subtitle="Expected format: timestamp,solar_kw,load_kw (e.g. 13:00,240,120)"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* File Input Box */}
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-900/60 transition-colors">
            <Upload className="w-8 h-8 text-sky-600 dark:text-sky-400 mb-2" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {fileName ? fileName : 'Choose CSV file or drag & drop'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1">.csv (Max 1MB)</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Errors List */}
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-red-700 dark:text-red-300 space-y-1">
              {errors.map((err, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Valid CSV parsed: {parsedRows.length} intervals found
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2">Time</th>
                      <th className="p-2">Solar (kW)</th>
                      <th className="p-2">Load (kW)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {parsedRows.slice(0, 10).map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="p-2 text-sky-700 dark:text-sky-300">{r.time}</td>
                        <td className="p-2 text-amber-600 dark:text-amber-300">{r.solarKw}</td>
                        <td className="p-2 text-slate-800 dark:text-slate-200">{r.loadKw}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 10 && (
                <p className="text-[11px] text-slate-500 text-center">
                  + {parsedRows.length - 10} additional rows will be imported
                </p>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={parsedRows.length === 0}
              onClick={handleConfirm}
            >
              Confirm Import ({parsedRows.length} Points)
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
