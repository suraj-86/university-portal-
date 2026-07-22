import React, { useState } from 'react';

const Table = ({ columns, data, pageSize = 10 }) => {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(data.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const currentData = data.slice(startIndex, startIndex + pageSize);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                            {columns.map((col, idx) => (
                                <th key={idx} className="p-4 font-black">
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                        {currentData.length > 0 ? (
                            currentData.map((row, rowIdx) => (
                                <tr key={rowIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                    {columns.map((col, colIdx) => (
                                        <td key={colIdx} className="p-4">
                                            {col.cell ? col.cell(row) : row[col.accessor]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="p-8 text-center text-slate-400 dark:text-slate-500 font-bold">
                                    No records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination footer if pages exceed 1 */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Table;