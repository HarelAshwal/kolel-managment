import React from 'react';
import type { StipendResult, KollelDetails } from '../types';
import { exportDetailsToCsv } from '../services/exporter';
import { DownloadIcon } from './icons/DownloadIcon';
import { CloseIcon } from './icons/CloseIcon';

const StipendDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  result: StipendResult | null;
  kollelDetails: KollelDetails;
  monthYear: string | null;
}> = ({ isOpen, onClose, result, kollelDetails, monthYear }) => {
  if (!isOpen || !result) return null;

  const { settings } = kollelDetails;

  const getCalculationSteps = () => {
    const steps = [];
    steps.push({ label: 'מלגת בסיס', value: `₪${(result.baseStipendUsed || settings.baseStipend).toFixed(2)}`, color: 'text-green-600 dark:text-green-400', sign: '+' });
    steps.push({ label: 'אחוז נוכחות כללי', value: `${(result.attendancePercentage || 0).toFixed(1)}%` });
    
    if (result.deductionDetails && result.deductionDetails.length > 0) {
        steps.push({ label: '--- ניכויים לפי סדר ---', value: '' });
        result.deductionDetails.forEach(detail => {
            steps.push({
                label: `חיסור (${detail.sederName})`,
                value: `${detail.deficit.toFixed(2)} ש' @ ₪${detail.rate.toFixed(2)}`,
            });
        });
        steps.push({ label: 'סה"כ ניכוי', value: `₪${(result.totalDeduction || 0).toFixed(2)}`, color: 'text-red-600 dark:text-red-400', sign: '-' });
    }
    
    if (result.bonusDetails && result.bonusDetails.length > 0) {
      steps.push({ label: '--- בונוסים ---', value: '' });
      result.bonusDetails.forEach(bonus => {
        steps.push({
          label: `${bonus.name} (${bonus.count})`,
          value: `₪${bonus.totalAmount.toFixed(2)}`,
          color: 'text-blue-600 dark:text-blue-400',
          sign: '+'
        });
      });
    }

    const calculatedStipend = (result.baseStipendUsed || settings.baseStipend) - (result.totalDeduction || 0) + (result.bonusDetails?.reduce((sum, b) => sum + b.totalAmount, 0) || 0);

    if (settings.rounding === 'upTo10' && Math.ceil(calculatedStipend / 10) * 10 !== calculatedStipend) {
        steps.push({ label: '--- עיגול ---', value: '' });
        steps.push({ label: 'סכום לפני עיגול', value: `₪${calculatedStipend.toFixed(2)}` });
        steps.push({ label: 'עיגול ל-10 הקרוב', value: `₪${(Math.ceil(calculatedStipend / 10) * 10 - calculatedStipend).toFixed(2)}`, color: 'text-purple-600 dark:text-purple-400', sign: '+' });
    }

    return steps;
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-xl font-bold">פירוט חישוב מלגה</h3>
            <p className="text-sm text-slate-500">עבור {result.name} - חודש {monthYear}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200"><CloseIcon className="w-6 h-6" /></button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">סיכום החישוב</h4>
            <div className="space-y-2">
              {getCalculationSteps().map((step, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span>{step.label}:</span>
                  {step.value && <span className={`font-mono font-medium ${step.color || ''}`}>{step.sign && <span className="mr-1">{step.sign}</span>}{step.value}</span>}
                </div>
              ))}
              <div className="border-t my-2"></div>
              <div className="flex justify-between items-center font-bold text-lg text-indigo-600">
                <span>מלגה סופית:</span>
                <span className="font-mono">₪{result.stipend.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold">פירוט יומי</h4>
              <button onClick={() => exportDetailsToCsv(result)} className="flex items-center gap-2 text-sm bg-blue-500 text-white font-semibold py-1.5 px-3 rounded-md hover:bg-blue-600"><DownloadIcon className="w-4 h-4" />ייצוא</button>
            </div>
            {result.details && result.details.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {result.details.map((detail, i) => {
                    // Fix: Explicitly type the accumulator and current value in the reduce function to resolve type inference issues.
                    const dailyTotalHours = Object.values(detail.sederHours).reduce((sum: number, h: number) => sum + h, 0);
                    return (
                        <div key={i} className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg text-center">
                            <div className="font-bold">{detail.day}</div>
                            <div className="text-sm mt-1 font-medium">{detail.rawTime.split(' | ').map((part, i) => <div key={i}>{part}</div>)}</div>
                            {dailyTotalHours > 0 && <div className="text-xs">({dailyTotalHours.toFixed(2)} ש')</div>}
                        </div>
                    );
                })}
              </div>
            ) : <p className="text-center text-slate-500 py-4">אין פירוט יומי זמין.</p>}
          </div>
        </main>

        <footer className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t text-right">
          <button onClick={onClose} className="py-2 px-6 border rounded-md hover:bg-slate-100">סגור</button>
        </footer>
      </div>
    </div>
  );
};

export default StipendDetailModal;