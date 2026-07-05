import { useMemo, useState, useEffect } from 'react'
import StatusBadge from './StatusBadge' // Link to your new badge component

const Table = ({ columns, data, pageSize = 5 }) => {
  const [sortField, setSortField] = useState(columns?.[0]?.accessor ?? '')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [data, pageSize])

  const sortedData = useMemo(() => {
    if (!sortField) return data
    return [...data].sort((a, b) => {
      const valueA = a[sortField]
      const valueB = b[sortField]

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortOrder === 'asc' ? valueA - valueB : valueB - valueA
      }

      return sortOrder === 'asc'
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA))
    })
  }, [data, sortField, sortOrder])

  const pageCount = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const currentRows = sortedData.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (accessor) => {
    if (sortField === accessor) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(accessor)
      setSortOrder('asc')
    }
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {columns.map((column) => (
              <th key={column.accessor} className="px-6 py-4 font-bold uppercase tracking-[0.12em] text-[10px]">
                <button
                  type="button"
                  className="flex items-center gap-2 hover:text-slate-900 transition-colors"
                  onClick={() => handleSort(column.accessor)}
                >
                  {column.header}
                  {sortField === column.accessor && (
                    <span className="text-blue-500">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
          {currentRows.length > 0 ? (
            currentRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="transition hover:bg-slate-50/50">
                {columns.map((column) => (
                  <td key={column.accessor} className="px-6 py-4 align-middle">
                    {/* Professional Logic: If it's a status column, use StatusBadge */}
                    {column.accessor === 'status' ? (
                        <StatusBadge type={row[column.accessor]} />
                    ) : (
                        column.cell ? column.cell(row) : row[column.accessor]
                    )}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 italic">
                No matching records found in the database.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {/* Pagination Footer */}
      <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/30 px-6 py-4 text-xs text-slate-500 font-bold uppercase tracking-wider">
        <p>
          Page <span className="text-slate-900">{page}</span> of <span className="text-slate-900">{pageCount}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            className="rounded-xl bg-white border border-slate-200 px-4 py-2 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            onClick={() => setPage((previous) => Math.max(previous - 1, 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <button
            className="rounded-xl bg-white border border-slate-200 px-4 py-2 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            onClick={() => setPage((next) => Math.min(next + 1, pageCount))}
            disabled={page === pageCount}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default Table