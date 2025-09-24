import React, { useState, useMemo } from 'react';
import type { MonthlyData, KollelDetails } from '../types';
import { generateReport } from '../services/reporter';
import { exportReportToCsv } from '../services/exporter';
import { BackIcon } from './icons/BackIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { PercentIcon } from './icons/PercentIcon';
import { LineChartIcon } from './icons/LineChartIcon';
import { BarChartIcon } from './icons/BarChartIcon';
import LineChart from './LineChart';
import BarChart from './BarChart';

interface ReportsProps {
  savedData: MonthlyData[];
  onBack: () => void;
  kollelDetails: KollelDetails;
}

const Reports: React.FC<ReportsProps> = ({ savedData, onBack, kollelDetails }) => {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const { availableMonths, availableScholars } = useMemo(() => {
    const months = savedData.map(d => d.monthYear).sort((a, b) => {
        const [aMonth, aYear] = a.split('/');
        const [bMonth, bYear] = b.split('/');
        return (parseInt(bYear) - parseInt(aYear)) || (parseInt(bMonth) - parseInt(aMonth));
    });
    // Fix: Explicitly type `a` and `b` as strings to resolve a type inference issue.
    const scholars = [...new Set(savedData.flatMap(d => d.results.map(r => r.name)))].sort((a: string, b: string) => a.localeCompare(b, 'he'));
    return { availableMonths: months, availableScholars: scholars };
  }, [savedData]);
  
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => availableMonths);
  const [selectedScholars, setSelectedScholars] = useState<string[]>(() => availableScholars);

  const report = useMemo(() => {
    return generateReport(savedData, selectedMonths, selectedScholars, kollelDetails);
  }, [savedData, selectedMonths, selectedScholars, kollelDetails]);

  const handleCheckboxChange = (
    value: string, 
    list: string[], 
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(value)) {
      setter(list.filter(item => item !== value));
    } else {
      setter([...list, value]);
    }
  };
  
  const toggleAll = (
      isAllSelected: boolean, 
      fullList: string[], 
      setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
      setter(isAllSelected ? [] : fullList);
  };

  const isAllMonthsSelected = selectedMonths.length === availableMonths.length;
  const isAllScholarsSelected = selectedScholars.length === availableScholars.length;

  const maxHours = report.details.reduce((max, d) => Math.max(max, d.totalHours), 0);

  return (
    <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6 w-full space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="חזרה">
                <BackIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
            <h2 className="text-2xl font-semibold">דוחות וניתוחים</h2>
        </div>
        <button 
            onClick={() => exportReportToCsv(report.details)}
            disabled={report.details.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 focus:outline-none disabled:bg-green-400 disabled:cursor-not-allowed"
        >
            <DownloadIcon className="w-5 h-5" />
            ייצוא ל-CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <fieldset className="p-4 border rounded-md border-slate-300 dark:border-slate-600">
          <legend className="px-2 font-medium">סינון לפי חודש</legend>
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-2">
            <div className="flex items-center">
                <input type="checkbox" id="all-months" checked={isAllMonthsSelected} onChange={() => toggleAll(isAllMonthsSelected, availableMonths, setSelectedMonths)} className="h-4 w-4 rounded" />
                <label htmlFor="all-months" className="mr-2 font-bold">בחר הכל</label>
            </div>
            {availableMonths.map(month => (
              <div key={month} className="flex items-center">
                <input type="checkbox" id={`month-${month}`} value={month} checked={selectedMonths.includes(month)} onChange={() => handleCheckboxChange(month, selectedMonths, setSelectedMonths)} className="h-4 w-4 rounded" />
                <label htmlFor={`month-${month}`} className="mr-2">{month}</label>
              </div>
            ))}
          </div>
        </fieldset>
         <fieldset className="p-4 border rounded-md border-slate-300 dark:border-slate-600">
          <legend className="px-2 font-medium">סינון לפי אברך</legend>
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-2">
             <div className="flex items-center">
                <input type="checkbox" id="all-scholars" checked={isAllScholarsSelected} onChange={() => toggleAll(isAllScholarsSelected, availableScholars, setSelectedScholars)} className="h-4 w-4 rounded" />
                <label htmlFor="all-scholars" className="mr-2 font-bold">בחר הכל</label>
            </div>
            {availableScholars.map(scholar => (
              <div key={scholar} className="flex items-center">
                <input type="checkbox" id={`scholar-${scholar}`} value={scholar} checked={selectedScholars.includes(scholar)} onChange={() => handleCheckboxChange(scholar, selectedScholars, setSelectedScholars)} className="h-4 w-4 rounded" />
                <label htmlFor={`scholar-${scholar}`} className="mr-2">{scholar}</label>
              </div>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{report.summary.scholarCount}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">אברכים</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{report.summary.totalHours.toFixed(1)}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">שעות בסה"כ</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{report.summary.averageHoursPerScholar.toFixed(1)}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">ממוצע לאברך</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
          <div className="flex items-center justify-center text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {report.summary.averageAttendancePercentage.toFixed(1)}<PercentIcon className="w-6 h-6 mr-1" />
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">אחוז נוכחות</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{report.summary.monthCount}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">חודשים</div>
        </div>
      </div>

       {/* Timeline Chart */}
      <div className="p-4 border rounded-md border-slate-300 dark:border-slate-600">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">ממוצע שעות לאורך זמן</h3>
            <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                <button onClick={() => setChartType('line')} className={`p-1.5 rounded-md ${chartType === 'line' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>
                    <LineChartIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
                <button onClick={() => setChartType('bar')} className={`p-1.5 rounded-md ${chartType === 'bar' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>
                    <BarChartIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
            </div>
        </div>
        {report.timeline.length > 1 ? (
          chartType === 'line' ? <LineChart data={report.timeline} /> : <BarChart data={report.timeline} />
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-center text-slate-500 dark:text-slate-400">יש לבחור לפחות שני חודשים כדי להציג גרף התקדמות.</p>
          </div>
        )}
      </div>

      {/* Bar Chart and Table */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 border rounded-md border-slate-300 dark:border-slate-600">
            <h3 className="font-semibold mb-4">סה"כ שעות לפי אברך</h3>
            <div className="space-y-2 text-sm max-h-96 overflow-y-auto pr-2">
                {report.details.length > 0 ? report.details.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                        <span className="w-24 truncate text-slate-600 dark:text-slate-300" title={d.name}>{d.name}</span>
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-5">
                            <div 
                                className="bg-indigo-500 h-5 rounded-full text-white text-xs flex items-center justify-end px-2"
                                style={{ width: maxHours > 0 ? `${(d.totalHours / maxHours) * 100}%` : '0%' }}
                            >
                                {d.totalHours.toFixed(1)}
                            </div>
                        </div>
                    </div>
                )) : <p className="text-center text-slate-500 dark:text-slate-400 py-4">אין נתונים להצגה בסינון הנוכחי.</p>}
            </div>
        </div>
        <div className="overflow-x-auto max-h-[28rem]">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                    <tr>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">אברך</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">סה"כ שעות</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">נוכחות</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">ממוצע חודשי</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {report.details.map(d => (
                        <tr key={d.name}>
                            <td className="px-4 py-3 whitespace-nowrap font-medium">{d.name}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{d.totalHours.toFixed(2)}</td>
                             <td className="px-4 py-3 whitespace-nowrap font-medium text-blue-600 dark:text-blue-400">{d.attendancePercentage.toFixed(1)}%</td>
                            <td className="px-4 py-3 whitespace-nowrap">{d.averageHoursPerMonth.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
       </div>
    </div>
  );
};

export default Reports;