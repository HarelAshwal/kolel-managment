
import React, { useState } from 'react';
import type { StipendResult } from '../types';
import { exportDetailsToCsv } from '../services/exporter';
import { ChevronIcon } from './icons/ChevronIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface AttendanceTableProps {
  results: StipendResult[];
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ results }) => {
  const totalStipend = results.reduce((sum, result) => sum + result.stipend, 0);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleRowClick = (index: number) => {
    setExpandedRow(expandedRow === index ? null : index);
  };
  
  const handleExportDetails = (result: StipendResult) => {
    exportDetailsToCsv(result);
  };

  return (
    <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl overflow-hidden">
        <h3 className="text-2xl font-semibold p-6 text-slate-900 dark:text-white">סיכום מלגות</h3>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    שם האברך
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    סה"כ שעות לימוד
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    מלגה לתשלום
                    </th>
                </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {results.map((result, index) => (
                    <React.Fragment key={index}>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                                {result.details && result.details.length > 0 ? (
                                    <button onClick={() => handleRowClick(index)} className="w-full flex items-center justify-between text-right rtl:text-right ltr:text-left group">
                                        <span>{result.name}</span>
                                        <ChevronIcon className={`w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${expandedRow === index ? 'rotate-180' : ''}`} />
                                    </button>
                                ) : (
                                    <span>{result.name}</span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">
                                {result.totalHours.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">
                                {`₪${result.stipend.toFixed(2)}`}
                            </td>
                        </tr>
                        {expandedRow === index && result.details && (
                             <tr className="bg-slate-100 dark:bg-slate-900/50">
                                <td colSpan={3} className="p-4 sm:p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-md">פירוט יומי עבור {result.name}:</h4>
                                        <button 
                                            onClick={() => handleExportDetails(result)}
                                            className="flex items-center gap-2 text-sm bg-blue-500 text-white font-semibold py-1.5 px-3 rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                                        >
                                            <DownloadIcon className="w-4 h-4" />
                                            ייצוא פירוט
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
                                        {result.details.map((detail, detailIndex) => (
                                        <div key={detailIndex} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm text-center">
                                            <div className="font-bold text-slate-700 dark:text-slate-300">{detail.day}</div>
                                            <div className={`text-sm mt-1 font-medium ${detail.hours > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {detail.rawTime}
                                            </div>
                                            {detail.hours > 0 && (
                                                <div className="text-xs text-slate-400">({detail.hours.toFixed(2)} שעות)</div>
                                            )}
                                        </div>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                ))}
                </tbody>
                <tfoot className="bg-slate-100 dark:bg-slate-900/50">
                    <tr>
                        <td colSpan={2} className="px-6 py-4 text-left text-base font-bold text-slate-700 dark:text-slate-200">סה"כ לתשלום</td>
                        <td className="px-6 py-4 text-right text-base font-bold text-indigo-600 dark:text-indigo-400">
                            {`₪${totalStipend.toFixed(2)}`}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
  );
};

export default AttendanceTable;