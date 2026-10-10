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
      <div className="p-8 text-center text-sm text-[#425B4C] dark:text-[#A7F3D0] border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md shadow-xs">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto rounded-2xl border border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md shadow-xs ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[#F4FAF5] dark:bg-[#0E2419] text-[#425B4C] dark:text-[#A7F3D0] font-bold uppercase tracking-wider border-b border-[#BBF7D0]/60 dark:border-[#86EFAC]/20">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`py-3.5 px-4.5 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#BBF7D0]/40 dark:divide-[#86EFAC]/15 font-mono">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              className={`transition-colors ${
                onRowClick
                  ? 'cursor-pointer hover:bg-[#ECFDF3]/70 dark:hover:bg-[#163826]/50'
                  : 'hover:bg-[#F4FAF5]/60 dark:hover:bg-[#163826]/30'
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`py-3.5 px-4.5 text-[#10251A] dark:text-[#F0FDF4] ${col.className || ''}`}>
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

export default DataTable
