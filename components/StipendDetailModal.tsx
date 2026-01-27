
import React, { useState } from 'react';
import type { StipendResult, KollelDetails, DailyDetail, StipendSettings } from '../types';
import { exportDetailsToCsv } from '../services/exporter';
import { calculateStipendForScholar } from '../services/calculator';
import { DownloadIcon } from './icons/DownloadIcon';
import { CloseIcon } from './icons/CloseIcon';
import { AdjustmentsIcon } from './icons/AdjustmentsIcon';
import { ChevronIcon } from './icons/ChevronIcon';
import { useLanguage } from '../contexts/LanguageContext';


const StipendDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  result: StipendResult | null;
  kollelDetails: KollelDetails;
  monthYear: string | null;
  onUpdateScholarResult: (updatedResult: StipendResult) => void;
  onUpdateSettings: (settings: StipendSettings) => void;
}> = ({ isOpen, onClose, result, kollelDetails, monthYear, onUpdateScholarResult, onUpdateSettings }) => {
  const { t } = useLanguage();
  const [isExceptionsOpen, setIsExceptionsOpen] = useState(false);

  if (!isOpen || !result) return null;

  const { settings } = kollelDetails;
  
  const timeToDecimal = (time: string): number => {
    if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return NaN;
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  };

  const getDailyDeficit = (detail: DailyDetail, sederId: number): number => {
      const seder = settings.sedarim.find(s => s.id === sederId);
      if (!seder || detail.rawTime === 'חופש') return 0;
      
      const sederDuration = timeToDecimal(seder.endTime) - timeToDecimal(seder.startTime);

      const attendedHours = detail.sederHours[sederId] || 0;
      return Math.max(0, sederDuration - attendedHours);
  };

  const handleSederAssignmentChange = (sederId: number, isChecked: boolean) => {
    const currentOverrides = settings.scholarOverrides?.[result.name] || {};
    const currentAssigned = currentOverrides.assignedSedarim || settings.sedarim.map(s => s.id);

    const newAssigned = isChecked
      ? [...currentAssigned, sederId]
      : currentAssigned.filter(id => id !== sederId);
    
    const newScholarOverrides = {
        ...settings.scholarOverrides,
        [result.name]: {
            ...currentOverrides,
            assignedSedarim: newAssigned,
        }
    };

    // If all sedarim are selected, we can remove the override
    if (newAssigned.length === settings.sedarim.length) {
        delete newScholarOverrides[result.name];
    }
    
    const newSettings = { ...settings, scholarOverrides: newScholarOverrides };
    onUpdateSettings(newSettings);

    // Recalculate stipend with new settings
    const scholarData = { name: result.name, details: result.details || [], bonusData: {}}; // bonusData is not available for recalc here, but it's ok
    const newResult = calculateStipendForScholar(scholarData, newSettings, null, monthYear);
    onUpdateScholarResult(newResult);
  };

  const handleApprovalChange = (dayIndex: number, sederId: number, type: 'absence' | 'lateness', isApproved: boolean) => {
      const newDetails = JSON.parse(JSON.stringify(result.details || []));
      const detail = newDetails[dayIndex];
      const seder = settings.sedarim.find(s => s.id === sederId);
      if (!seder) return;

      if (type === 'absence') {
          if (!detail.isAbsenceApproved) detail.isAbsenceApproved = {};
          detail.isAbsenceApproved[sederId] = isApproved;

          // New logic: Adjust approvedAbsenceHours
          if (!detail.approvedAbsenceHours) detail.approvedAbsenceHours = {};
          const deficit = getDailyDeficit(detail, sederId); // deficit is based on actual hours
          // When approving, we approve the entire deficit for that day.
          detail.approvedAbsenceHours[sederId] = isApproved ? deficit : 0;

      } else {
          if (!detail.isLatenessApproved) detail.isLatenessApproved = {};
          detail.isLatenessApproved[sederId] = isApproved;
          // Note: Lateness approval is handled separately in bonus calculation
          // and doesn't affect approvedAbsenceHours for now.
      }

      // Recalculate stipend with new details
      const scholarData = { name: result.name, details: newDetails, bonusData: {}};
      const newResult = calculateStipendForScholar(scholarData, settings, null, monthYear);
      onUpdateScholarResult(newResult);
  };

  const assignedSedarim = settings.scholarOverrides?.[result.name]?.assignedSedarim || settings.sedarim.map(s => s.id);
  const assignedSedarimDetails = settings.sedarim.filter(s => assignedSedarim.includes(s.id));
  
  const dailyRequiredHours = assignedSedarimDetails.reduce((total, seder) => {
    const start = timeToDecimal(seder.startTime);
    const end = timeToDecimal(seder.endTime);
    if (!isNaN(start) && !isNaN(end) && end > start) {
        return total + (end - start);
    }
    return total;
  }, 0);


  const getCalculationSteps = () => {
    const steps = [];
    
    // Improved Breakdown of Base Stipend Logic
    if (result.isHourlyFallbackApplied) {
        steps.push({
            label: `${t('base_stipend_label')} (${t('method_fallback')})`,
            value: `₪${Number(result.baseStipendUsed || 0).toFixed(2)}`,
            color: 'text-amber-600 dark:text-amber-400',
            sign: '+'
        });
        // Detail how we got here
        steps.push({
            label: `${result.totalHours.toFixed(2)} ${t('hours')} * ₪${result.hourlyRateApplied} ${t('per_hour_label')}`,
            value: '',
            color: 'text-xs text-slate-500'
        });

    } else if (settings.baseStipendType === 'daily') {
        steps.push({
            label: `${t('base_stipend_label')} (${t('type_daily')})`,
            value: `₪${Number(result.baseStipendUsed || 0).toFixed(2)}`,
            color: 'text-green-600 dark:text-green-400',
            sign: '+'
        });
         steps.push({
            label: `${result.workingDaysInMonth} ${t('days')} * ₪${settings.baseStipend} ${t('per_day_label')}`,
            value: '',
            color: 'text-xs text-slate-500'
        });
    } else {
         steps.push({ 
            label: `${t('base_stipend_label')} (${t('type_monthly')})`, 
            value: `₪${Number(result.baseStipendUsed || settings.baseStipend || 0).toFixed(2)}`, 
            color: 'text-green-600 dark:text-green-400', 
            sign: '+' 
        });
    }
    
    steps.push({ label: t('attendance_calc_header'), value: '' });
    if (result.workingDaysInMonth !== undefined && dailyRequiredHours > 0) {
      steps.push({ label: t('required_hours_breakdown'), value: `${result.workingDaysInMonth} ${t('days')} * ${dailyRequiredHours.toFixed(2)} ${t('hours')}` });
    }
    steps.push({ label: t('total_required_hours'), value: `${(result.requiredHours || 0).toFixed(2)} ${t('hours')}` });
    steps.push({ label: t('total_actual_hours'), value: `${(result.totalHours || 0).toFixed(2)} ${t('hours')}` });
    steps.push({ label: t('attendance_percent'), value: `${(result.attendancePercentage || 0).toFixed(1)}%`, color: 'font-bold' });

    if (result.deductionDetails && result.deductionDetails.length > 0) {
        steps.push({ label: t('deductions_header'), value: '' });
        result.deductionDetails.forEach(detail => {
            steps.push({
                label: `${t('deduction_label')} (${detail.sederName})`,
                value: `${detail.deficit.toFixed(2)} ${t('hours')} @ ₪${detail.rate.toFixed(2)}`,
            });
        });
        steps.push({ label: t('total_deduction_label'), value: `₪${(result.totalDeduction || 0).toFixed(2)}`, color: 'text-red-600 dark:text-red-400', sign: '-' });
    }

    if ((result.totalApprovedAbsenceHours && result.totalApprovedAbsenceHours > 0) || (result.totalApprovedLatenessCount && result.totalApprovedLatenessCount > 0)) {
        steps.push({ label: t('approvals_header'), value: '' });
        if (result.totalApprovedAbsenceHours && result.totalApprovedAbsenceHours > 0) {
            steps.push({
                label: t('approved_absence_hours'),
                value: `${result.totalApprovedAbsenceHours.toFixed(2)} ${t('hours')}`,
                color: 'text-slate-500 dark:text-slate-400',
            });
        }
        if (result.totalApprovedLatenessCount && result.totalApprovedLatenessCount > 0) {
            steps.push({
                label: t('approved_lateness'),
                value: `${result.totalApprovedLatenessCount} ${t('occurrences')}`,
                color: 'text-slate-500 dark:text-slate-400',
            });
        }
    }
    
    if (result.bonusDetails && result.bonusDetails.length > 0) {
      steps.push({ label: t('bonuses_header'), value: '' });
      result.bonusDetails.forEach(bonus => {
        steps.push({
          label: `${bonus.name} (${bonus.count})`,
          value: `₪${bonus.totalAmount.toFixed(2)}`,
          color: 'text-blue-600 dark:text-blue-400',
          sign: '+',
          failures: bonus.failures
        });
      });
    }

    const baseAmount = Number(result.baseStipendUsed || settings.baseStipend || 0);
    const deductionAmount = Number(result.totalDeduction || 0);
    const bonusAmount = result.bonusDetails?.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0) || 0;
    const calculatedStipend = baseAmount - deductionAmount + bonusAmount;

    if (settings.rounding === 'upTo10' && Math.ceil(calculatedStipend / 10) * 10 !== calculatedStipend) {
        steps.push({ label: t('rounding_header'), value: '' });
        steps.push({ label: t('pre_round_sum'), value: `₪${calculatedStipend.toFixed(2)}` });
        steps.push({ label: t('round_to_10'), value: `₪${(Math.ceil(calculatedStipend / 10) * 10 - calculatedStipend).toFixed(2)}`, color: 'text-purple-600 dark:text-purple-400', sign: '+' });
    }

    return steps;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-xl font-bold">{t('modal_title')}</h3>
            <p className="text-sm text-slate-500">{t('for_scholar')} {result.name} - {t('month')} {monthYear}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><CloseIcon className="w-6 h-6" /></button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Calculation Summary */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg h-fit">
                <h4 className="font-semibold mb-3">{t('calc_summary')}</h4>
                <div className="space-y-2">
                  {getCalculationSteps().map((step, index) => (
                    <div key={index} className="flex flex-col text-sm border-b border-slate-100 dark:border-slate-800 pb-1 last:border-0">
                      <div className="flex justify-between items-center">
                        <span className={`text-slate-600 dark:text-slate-300 ${step.value === '' ? 'w-full' : ''}`}>{step.label}:</span>
                        {step.value && <span className={`font-mono font-medium ${step.color || ''}`}>{step.sign && <span className="mr-1">{step.sign}</span>}{step.value}</span>}
                      </div>
                      {/* Show failures/lates if present in step data */}
                      {step.failures !== undefined && step.failures > 0 && (
                          <div className="text-xs text-red-500 mt-0.5 mr-2">
                             {t('bonus_failures')} {step.failures}
                          </div>
                      )}
                    </div>
                  ))}
                  <div className="border-t my-2 border-slate-200 dark:border-slate-700"></div>
                  <div className="flex justify-between items-center font-bold text-lg text-indigo-600 dark:text-indigo-400">
                    <span>{t('final_stipend')}</span>
                    <span className="font-mono">₪{Number(result.stipend || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Details & Exceptions */}
              <div className="space-y-4">
                  {/* Exception Management Accordion */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
                      <button onClick={() => setIsExceptionsOpen(!isExceptionsOpen)} className="w-full flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700/50">
                          <div className="flex items-center gap-2 font-semibold">
                              <AdjustmentsIcon className="w-5 h-5 text-indigo-500" />
                              <span>{t('exceptions_management')}</span>
                          </div>
                          <ChevronIcon className={`w-5 h-5 transition-transform ${isExceptionsOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isExceptionsOpen && <div className="p-4 space-y-4 animate-fade-in">
                          <div>
                              <h5 className="font-semibold mb-2">{t('fixed_sedarim')}</h5>
                              <p className="text-xs text-slate-500 mb-2">{t('fixed_sedarim_desc')}</p>
                              <div className="flex flex-wrap gap-4">
                                  {settings.sedarim.map(seder => (
                                      <label key={seder.id} className="flex items-center gap-2 cursor-pointer">
                                          <input type="checkbox"
                                              checked={assignedSedarim.includes(seder.id)}
                                              onChange={(e) => handleSederAssignmentChange(seder.id, e.target.checked)}
                                              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                                          />
                                          {seder.name}
                                      </label>
                                  ))}
                              </div>
                          </div>
                      </div>}
                  </div>
                  
                  {/* Daily Details */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold">{t('daily_details_month')}</h4>
                      <button onClick={() => exportDetailsToCsv(result)} className="flex items-center gap-2 text-sm bg-blue-500 text-white font-semibold py-1.5 px-3 rounded-md hover:bg-blue-600"><DownloadIcon className="w-4 h-4" />{t('export')}</button>
                    </div>
                    {result.details && result.details.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {(result.details as DailyDetail[]).map((detail, i) => {
                            // Fix: Explicitly type sum and h in reduce and handle sederHours as potential null
                            const dailyTotalHours = Object.values(detail.sederHours || {}).reduce((sum: number, h: number) => sum + h, 0);
                            
                            const isAbsent = detail.rawTime === 'נעדר';
                            
                            return (
                                <div key={i} className={`p-3 rounded-lg text-sm ${isAbsent ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-100 dark:bg-slate-700/50'}`}>
                                    <div className="flex justify-between items-center font-bold">
                                        <span>{detail.day}</span>
                                        <span className={isAbsent ? 'text-red-600 dark:text-red-400' : ''}>{detail.rawTime || t('absent')}</span>
                                        {/* Fix: Explicitly cast dailyTotalHours to number to call toFixed */}
                                        <span className="font-mono">{Number(dailyTotalHours) > 0 ? `${Number(dailyTotalHours).toFixed(2)} ${t('hours')}` : '-'}</span>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {settings.sedarim.filter(s => assignedSedarim.includes(s.id)).map(seder => {
                                            const deficit = getDailyDeficit(detail, seder.id);
                                            const isLate = seder.name.includes("א'") ? detail.isLateSederA : detail.isLateSederB;
                                            if (deficit > 0.1 || isLate) {
                                                return <div key={seder.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-1.5 rounded">
                                                    <span>{seder.name}: {isLate && <span className="text-amber-600">{t('late')}</span>} {deficit > 0.1 && <span className="text-red-600">{t('deficit')} {deficit.toFixed(2)} {t('hours')}</span>}</span>
                                                    <div className="flex gap-2">
                                                        {isLate && <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={detail.isLatenessApproved?.[seder.id]} onChange={e => handleApprovalChange(i, seder.id, 'lateness', e.target.checked)} className="h-3 w-3" /> {t('approve_late')}</label>}
                                                        {deficit > 0.1 && <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={detail.isAbsenceApproved?.[seder.id]} onChange={e => handleApprovalChange(i, seder.id, 'absence', e.target.checked)} className="h-3 w-3" /> {t('approve_absence')}</label>}
                                                    </div>
                                                </div>
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                      </div>
                    ) : <p className="text-center text-slate-500 py-4">{t('no_daily_details')}</p>}
                  </div>
              </div>
          </div>
        </main>

        <footer className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 text-right">
          <button onClick={onClose} className="py-2 px-6 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">{t('close')}</button>
        </footer>
      </div>
    </div>
  );
};

export default StipendDetailModal;
