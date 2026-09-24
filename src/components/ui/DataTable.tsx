import React from 'react'

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  emptyMessage?: string
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No records found',
  className = '',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-slate-500 border border-slate-800/80 rounded-xl bg-slate-900/30">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/40 ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`py-3 px-4 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              className={`transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-slate-800/50' : 'hover:bg-slate-800/20'
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`py-3 px-4 text-slate-200 ${col.className || ''}`}>
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
