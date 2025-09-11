import React from 'react';
import type { StipendResult, KollelDetails } from '../types';
import { exportDetailsToCsv } from '../services/exporter';
import { DownloadIcon } from './icons/DownloadIcon';
import { CloseIcon } from './icons/CloseIcon';

interface StipendDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: StipendResult | null;
  kollelDetails: KollelDetails;
  monthYear: string | null;
}

const StipendDetailModal: React.FC<StipendDetailModalProps> = ({ isOpen, onClose, result, kollelDetails, monthYear }) => {
  if (!isOpen || !result) {
    return null;
  }

  const { settings } = kollelDetails;
  
  const activeDays = result.details?.filter(d => d.hours > 0).length || 0;
  const requiredHours = activeDays * settings.dailyHoursTarget;
  const hourDeficit = Math.max(0, requiredHours - result.totalHours);
  const totalDeduction = hourDeficit * settings.deductionPerHour;
  const totalBonus = 0; 
  const calculatedStipend = settings.baseStipend - totalDeduction + totalBonus;
  const totalOutOfSederHours = result.totalOutOfSederHours || 0;

  const handleExportDetails = () => {
    if (result) {
      exportDetailsToCsv(result);
    }
  };
  
  const calculationSteps = [
    { label: 'מלגת בסיס', value: `₪${settings.baseStipend.toFixed(2)}`, color: 'text-green-600 dark:text-green-400', sign: '+' },
    { label: 'ימי לימוד בפועל', value: `${activeDays} ימים` },
    { label: 'שעות תקן יומי', value: `${settings.dailyHoursTarget.toFixed(2)} שעות` },
    { label: 'סה"כ שעות נדרשות', value: `${requiredHours.toFixed(2)} שעות (${activeDays} ימים * ${settings.dailyHoursTarget} שעות)` },
    { label: 'סה"כ שעות לימוד', value: `${result.totalHours.toFixed(2)} שעות` },
    ...(totalOutOfSederHours > 0.01 ? [{ label: 'שעות מחוץ לסדר (לא נכלל)', value: `${totalOutOfSederHours.toFixed(2)} שעות`, color: 'text-slate-500 dark:text-slate-400' }] : []),
    { label: 'שעות חסרות', value: `${hourDeficit.toFixed(2)} שעות` },
    { label: 'ניכוי לשעת חיסור', value: `₪${settings.deductionPerHour.toFixed(2)}` },
    { label: 'סה"כ ניכוי', value: `₪${totalDeduction.toFixed(2)}`, color: 'text-red-600 dark:text-red-400', sign: '-' },
    { label: 'סה"כ בונוסים', value: `₪${totalBonus.toFixed(2)}`, color: 'text-blue-600 dark:text-blue-400', sign: '+' },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 transition-opacity"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">פירוט חישוב מלגה</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">עבור {result.name} - חודש {monthYear}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="סגור">
            <CloseIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Calculation Summary */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">סיכום החישוב</h4>
            <div className="space-y-2">
              {calculationSteps.map((step, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{step.label}:</span>
                  <span className={`font-mono font-medium ${step.color || 'text-slate-800 dark:text-slate-100'}`}>
                    {step.sign && <span className="mr-1">{step.sign}</span>}
                    {step.value}
                  </span>
                </div>
              ))}
              <div className="border-t border-slate-300 dark:border-slate-600 my-2"></div>
              <div className="flex justify-between items-center font-bold text-lg">
                <span className="text-indigo-600 dark:text-indigo-400">מלגה סופית:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">₪{result.stipend.toFixed(2)}</span>
              </div>
               {Math.abs(calculatedStipend - result.stipend) > 0.01 && (
                 <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-2">
                   ייתכן הפרש קטן מהסכום המקורי עקב עיגול עשרוני.
                 </p>
               )}
            </div>
          </div>

          {/* Daily Details */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">פירוט יומי</h4>
              <button
                onClick={handleExportDetails}
                className="flex items-center gap-2 text-sm bg-blue-500 text-white font-semibold py-1.5 px-3 rounded-md shadow-sm hover:bg-blue-600"
              >
                <DownloadIcon className="w-4 h-4" />
                ייצוא פירוט
              </button>
            </div>
            {result.details && result.details.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {result.details.map((detail, detailIndex) => (
                  <div key={detailIndex} className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg text-center">
                    <div className="font-bold text-slate-700 dark:text-slate-300">{detail.day}</div>
                    <div className={`text-sm mt-1 font-medium ${detail.hours > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                       {detail.rawTime && typeof detail.rawTime === 'string' ? detail.rawTime.split(' | ').map((part, i) => (
                        <div key={i}>{part}</div>
                      )) : detail.rawTime}
                    </div>
                    {detail.hours > 0 && (
                      <div className="text-xs text-slate-400">({detail.hours.toFixed(2)} שעות)</div>
                    )}
                    {detail.outOfSederHours && detail.outOfSederHours > 0.01 && (
                      <div className="text-xs text-amber-600 dark:text-amber-500 mt-1" title="שעות מחוץ לסדרים">
                          (+{detail.outOfSederHours.toFixed(2)} בחוץ)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
                <p className="text-center text-slate-500 dark:text-slate-400 py-4">אין פירוט יומי זמין.</p>
            )}
          </div>
        </main>

        <footer className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 text-right">
            <button
              onClick={onClose}
              className="py-2 px-6 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              סגור
            </button>
        </footer>
      </div>
    </div>
  );
};

export default StipendDetailModal;