import React, { useState } from 'react';
import type { StipendResult, KollelDetails, StipendSettings } from '../types';
import StipendDetailModal from './StipendDetailModal';
import { InfoIcon } from './icons/InfoIcon';

interface AttendanceTableProps {
  results: StipendResult[];
  kollelDetails: KollelDetails;
  monthYear: string | null;
  onUpdateScholarResult: (updatedResult: StipendResult) => void;
  onUpdateSettings: (settings: StipendSettings) => void;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ results, kollelDetails, monthYear, onUpdateScholarResult, onUpdateSettings }) => {
  const totalStipend = results.reduce((sum, result) => sum + result.stipend, 0);
  const [selectedScholarName, setSelectedScholarName] = useState<string | null>(null);

  const selectedScholar = selectedScholarName ? results.find(r => r.name === selectedScholarName) : null;

  const handleRowClick = (result: StipendResult) => {
    setSelectedScholarName(result.name);
  };
  
  return (
    <>
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
                      <tr 
                        key={index} 
                        onClick={() => handleRowClick(result)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleRowClick(result)}
                        aria-label={`פרטים עבור ${result.name}`}
                        role="button"
                      >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <span>{result.name}</span>
                                <InfoIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                              </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">
                              {result.totalHours.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">
                              {`₪${result.stipend.toFixed(2)}`}
                          </td>
                      </tr>
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
      <StipendDetailModal 
        isOpen={!!selectedScholar}
        onClose={() => setSelectedScholarName(null)}
        result={selectedScholar}
        kollelDetails={kollelDetails}
        monthYear={monthYear}
        onUpdateScholarResult={onUpdateScholarResult}
        onUpdateSettings={onUpdateSettings}
      />
    </>
  );
};

export default AttendanceTable;