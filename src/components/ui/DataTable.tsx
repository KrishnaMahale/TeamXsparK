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
      <div className="p-8 text-center text-sm text-[#788477] dark:text-[#859483] border border-[#DDD9C9] dark:border-[#2C3C2E] rounded-xl bg-[#FAF6E9] dark:bg-[#1E2B20]">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-[#DDD9C9] dark:border-[#2C3C2E] bg-[#FAF6E9] dark:bg-[#1E2B20] shadow-xs ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[#F3EEDC] dark:bg-[#18231A] text-[#506052] dark:text-[#C2CCC0] font-bold uppercase tracking-wider border-b border-[#DDD9C9] dark:border-[#2C3C2E]">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`py-3 px-4 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#DDD9C9]/60 dark:divide-[#2C3C2E] font-mono">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              className={`transition-colors ${
                onRowClick
                  ? 'cursor-pointer hover:bg-[#DDEB9D]/30 dark:hover:bg-[#2D3E2F]/40'
                  : 'hover:bg-[#FFFDF6]/60 dark:hover:bg-[#263629]/30'
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`py-3 px-4 text-[#26352A] dark:text-[#F2F5ED] ${col.className || ''}`}>
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
