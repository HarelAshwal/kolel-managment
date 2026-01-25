
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { StipendSettings, Seder, GeneralBonus, PunctualityTier } from '../types';
import { BackIcon } from './icons/BackIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { generateStipendSettingsFromPrompt } from '../services/api';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { InfoIcon } from './icons/InfoIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';
import { useLanguage } from '../contexts/LanguageContext';

const ensureSettingsCompatibility = (settings: StipendSettings): StipendSettings => {
    // 1. Deep copy
    let compatible: StipendSettings = JSON.parse(JSON.stringify(settings));
    
    // 2. Helper for number conversion that handles strings/numbers safely
    const toNumber = (val: any, defaultVal: number = 0) => {
        const num = Number(val);
        return isNaN(num) ? defaultVal : num;
    };

    // 3. Root Level Defaults
    compatible.baseStipend = toNumber(compatible.baseStipend, 0);
    compatible.baseStipendType = compatible.baseStipendType || 'monthly';
    compatible.baseStipendCalculationMethod = compatible.baseStipendCalculationMethod || 'deduction';
    compatible.fallbackHourlyRate = toNumber(compatible.fallbackHourlyRate, 10);
    compatible.bonusAttendanceThresholdPercent = toNumber(compatible.bonusAttendanceThresholdPercent, 80);
    compatible.rounding = compatible.rounding || 'none';

    // 4. Deductions
    if (!compatible.deductions) {
        compatible.deductions = { highRate: 25, lowRate: 20, attendanceThresholdPercent: 90 };
    } else {
        compatible.deductions.highRate = toNumber(compatible.deductions.highRate, 25);
        compatible.deductions.lowRate = toNumber(compatible.deductions.lowRate, 20);
        compatible.deductions.attendanceThresholdPercent = toNumber(compatible.deductions.attendanceThresholdPercent, 90);
    }

    // 5. Sedarim
    compatible.sedarim = (compatible.sedarim || []).map((s, index) => {
        const sederDeductions = s.deductions || { highRate: 25, lowRate: 20, attendanceThresholdPercent: 90 };
        return {
            ...s,
            id: s.id || Date.now() + index, // Ensure ID
            earlyExitToleranceMinutes: toNumber(s.earlyExitToleranceMinutes, 0),
            punctualityLateThresholdMinutes: toNumber(s.punctualityLateThresholdMinutes, 0),
            punctualityBonusType: s.punctualityBonusType || 'fixed',
            punctualityTiers: (s.punctualityTiers || []).map(t => ({
                maxFailures: toNumber(t.maxFailures, 0),
                amount: toNumber(t.amount, 0)
            })),
            partialStipendPercentage: toNumber(s.partialStipendPercentage, 0),
            punctualityBonusAmount: toNumber(s.punctualityBonusAmount, 0),
            useCustomDeductions: !!s.useCustomDeductions,
            deductions: {
                highRate: toNumber(sederDeductions.highRate, 25),
                lowRate: toNumber(sederDeductions.lowRate, 20),
                attendanceThresholdPercent: toNumber(sederDeductions.attendanceThresholdPercent, 90)
            }
        };
    });

    // 6. Bonuses
    compatible.generalBonuses = (compatible.generalBonuses || []).map((b, index) => ({
        ...b,
        id: b.id || Date.now() + index,
        amount: toNumber(b.amount, 0),
        attendanceConditionType: b.attendanceConditionType || (b.subjectToAttendanceThreshold ? 'global' : 'none'),
        customConditions: (b.customConditions || []).map(c => ({
            threshold: toNumber(c.threshold, 0),
            percent: toNumber(c.percent, 0)
        }))
    }));

    return compatible;
};

const HelpTooltip: React.FC<{ text: string }> = ({ text }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    return (
        <span 
            className="relative inline-flex items-center mx-1 align-middle group"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onClick={(e) => { e.preventDefault(); setIsVisible(!isVisible); }}
            role="tooltip"
        >
            <InfoIcon className="w-4 h-4 text-slate-400 hover:text-indigo-500 cursor-help transition-colors" />
            
            {isVisible && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 p-2 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-[100] whitespace-normal font-normal text-center leading-relaxed">
                    {text}
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                </div>
            )}
        </span>
    );
};

const StipendSettingsComponent: React.FC<{ initialSettings: StipendSettings; onSave: (s: StipendSettings) => void; onBack: () => void; }> = ({ initialSettings, onSave, onBack }) => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<StipendSettings>(() => ensureSettingsCompatibility(initialSettings));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formKey, setFormKey] = useState(0); // Used to force re-render on import

  const handleSettingsChange = (f: keyof StipendSettings, v: any) => setSettings(p => ({...p, [f]: v}));
  const handleNestedChange = (a: keyof StipendSettings, f: string, v: any) => setSettings(p => ({...p, [a]: { ...(p[a] as any), [f]: v } }));
  const handleSederChange = (id: number, f: keyof Seder, v: any) => setSettings(p => ({...p, sedarim: p.sedarim.map(s => s.id === id ? { ...s, [f]: v } : s)}));

  const handleAddSederTier = (id: number) => setSettings(p => ({...p, sedarim: p.sedarim.map(s => s.id === id ? {...s, punctualityTiers: [...(s.punctualityTiers||[]), {maxFailures: 3, amount: 10}]} : s)}));
  const handleRemoveSederTier = (sederId: number, tierIdx: number) => setSettings(p => ({...p, sedarim: p.sedarim.map(s => s.id === sederId ? {...s, punctualityTiers: s.punctualityTiers?.filter((_, i) => i !== tierIdx)} : s)}));
  
  const handleAddBonusTier = (id: number) => setSettings(p => ({...p, generalBonuses: p.generalBonuses.map(b => b.id === id ? {...b, customConditions: [...(b.customConditions||[]), {threshold: 75, percent: 100}]} : b)}));
  const handleRemoveBonusTier = (bonusId: number, tierIdx: number) => setSettings(p => ({...p, generalBonuses: p.generalBonuses.map(b => b.id === bonusId ? {...b, customConditions: b.customConditions?.filter((_, i) => i !== tierIdx)} : b)}));

  const handleExportSettings = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "stipend_settings.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset to ensure onChange fires even for same file
        fileInputRef.current.click();
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content === 'string') {
          const importedSettings = JSON.parse(content);
          
          // Removed window.confirm to streamline process and avoid blocking issues
          const compatible = ensureSettingsCompatibility(importedSettings);
          setSettings(compatible);
          setFormKey(prev => prev + 1); // Force form re-render to update inputs
          setTimeout(() => alert(t('settings_loaded')), 100);
        }
      } catch (err) {
        console.error('Failed to parse settings file', err);
        alert(t('error'));
      }
    };
    reader.readAsText(file);
  };

  const renderManualMode = () => (
    <div className="space-y-6 animate-fade-in" key={formKey}>
      <fieldset className="p-4 border rounded-md">
        <legend className="px-2 font-medium">{t('base_settings')}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium flex items-center mb-1">
                    {t('calc_method')}
                    <HelpTooltip text={t('help_calc_method')} />
                </label>
                <select value={settings.baseStipendCalculationMethod} onChange={e => handleSettingsChange('baseStipendCalculationMethod', e.target.value)} className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:border-slate-600">
                    <option value="deduction">{t('method_regular')}</option>
                    <option value="hourly_fallback">{t('method_fallback')}</option>
                </select>
            </div>
            {settings.baseStipendCalculationMethod === 'hourly_fallback' && (
                <div>
                    <label className="block text-sm font-medium flex items-center mb-1">
                        {t('fallback_rate_label')}
                        <HelpTooltip text={t('help_fallback_rate')} />
                    </label>
                    <input type="number" value={settings.fallbackHourlyRate} onChange={e => handleSettingsChange('fallbackHourlyRate', Number(e.target.value))} className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
                </div>
            )}
            <div>
                <label className="block text-sm font-medium flex items-center mb-1">
                    {t('full_stipend')}
                    <HelpTooltip text={t('help_full_stipend')} />
                </label>
                <input type="number" value={settings.baseStipend} onChange={e => handleSettingsChange('baseStipend', Number(e.target.value))} className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
                <label className="block text-sm font-medium flex items-center mb-1">
                    {t('threshold_full')}
                    <HelpTooltip text={t('help_threshold')} />
                </label>
                <input type="number" value={settings.deductions.attendanceThresholdPercent} onChange={e => handleNestedChange('deductions', 'attendanceThresholdPercent', Number(e.target.value))} className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
                <label className="block text-sm font-medium flex items-center mb-1">
                    {t('high_deduction')}
                    <HelpTooltip text={t('help_deduction_rate')} />
                </label>
                <input type="number" value={settings.deductions.highRate} onChange={e => handleNestedChange('deductions', 'highRate', Number(e.target.value))} className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
            </div>
             <div>
                <label className="block text-sm font-medium flex items-center mb-1">
                    {t('low_deduction')}
                    <HelpTooltip text={t('help_deduction_rate')} />
                </label>
                <input type="number" value={settings.deductions.lowRate} onChange={e => handleNestedChange('deductions', 'lowRate', Number(e.target.value))} className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
            </div>
        </div>
      </fieldset>

      <fieldset className="p-4 border rounded-md">
        <legend className="px-2 font-medium">{t('sedarim')}</legend>
        <div className="space-y-4">
            {settings.sedarim.map(seder => (
                <div key={seder.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border dark:border-slate-600">
                    <div className="flex justify-between items-center mb-3">
                        <input type="text" value={seder.name} onChange={e => handleSederChange(seder.id, 'name', e.target.value)} className="font-semibold bg-transparent border-0 border-b-2 dark:border-slate-600 focus:ring-0 px-0" />
                        <button onClick={() => setSettings(p => ({...p, sedarim: p.sedarim.filter(s => s.id !== seder.id)}))}><TrashIcon className="w-5 h-5 text-red-400"/></button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                        <div>
                            <label className="flex items-center mb-1">{t('hours')}<HelpTooltip text={t('help_seder_times')} /></label>
                            <div className="flex gap-1">
                                <input type="text" value={seder.startTime} onChange={e => handleSederChange(seder.id, 'startTime', e.target.value)} className="w-full p-1 border rounded text-center dark:bg-slate-800 dark:border-slate-600" placeholder="09:00" />
                                <span className="self-center">-</span>
                                <input type="text" value={seder.endTime} onChange={e => handleSederChange(seder.id, 'endTime', e.target.value)} className="w-full p-1 border rounded text-center dark:bg-slate-800 dark:border-slate-600" placeholder="13:00" />
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center mb-1">{t('stipend_pct_half_day')}<HelpTooltip text={t('help_partial_pct')} /></label>
                            <input type="number" value={seder.partialStipendPercentage} onChange={e => handleSederChange(seder.id, 'partialStipendPercentage', Number(e.target.value))} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600" />
                        </div>
                        <div>
                            <label className="flex items-center mb-1">סף יציאה (דק')<HelpTooltip text={t('help_early_exit')} /></label>
                            <input type="number" value={seder.earlyExitToleranceMinutes} onChange={e => handleSederChange(seder.id, 'earlyExitToleranceMinutes', Number(e.target.value))} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600" />
                        </div>
                        <div>
                            <label className="flex items-center mb-1">{t('late_threshold_min')}<HelpTooltip text={t('help_punctuality_late')} /></label>
                            <input type="number" value={seder.punctualityLateThresholdMinutes} onChange={e => handleSederChange(seder.id, 'punctualityLateThresholdMinutes', Number(e.target.value))} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600" />
                        </div>
                        <div>
                            <label className="flex items-center mb-1">בונוס נוכחות<HelpTooltip text={t('help_punctuality')} /></label>
                            <input type="number" value={seder.punctualityBonusAmount} onChange={e => handleSederChange(seder.id, 'punctualityBonusAmount', Number(e.target.value))} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600" />
                        </div>
                    </div>
                    
                    <div className="mt-3 bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-600">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold flex items-center">מדרגות ביטול בונוס (לפי חיסורים/שעות)<HelpTooltip text={t('help_punctuality_tiers')} /></span>
                            <button onClick={() => handleAddSederTier(seder.id)} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">+ מדרגה</button>
                        </div>
                        <div className="space-y-1">
                            {(seder.punctualityTiers || []).map((tier, idx) => (
                                <div key={idx} className="flex gap-2 items-center text-[10px]">
                                    <span>עד</span>
                                    <input type="number" value={tier.maxFailures} onChange={e => handleSederChange(seder.id, 'punctualityTiers', seder.punctualityTiers?.map((v, i) => i === idx ? {...v, maxFailures: Number(e.target.value)} : v))} className="w-10 p-0.5 border rounded dark:bg-slate-700 dark:border-slate-500" />
                                    <span>חיסורים → בונוס:</span>
                                    <input type="number" value={tier.amount} onChange={e => handleSederChange(seder.id, 'punctualityTiers', seder.punctualityTiers?.map((v, i) => i === idx ? {...v, amount: Number(e.target.value)} : v))} className="w-10 p-0.5 border rounded dark:bg-slate-700 dark:border-slate-500" />
                                    <span>₪</span>
                                    <button onClick={() => handleRemoveSederTier(seder.id, idx)} className="ml-auto text-slate-400 hover:text-red-500 transition-colors">
                                        <TrashIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
            <button onClick={() => handleSederChange(Date.now(), 'id', Date.now())} className="w-full py-2 border-2 border-dashed rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 text-slate-500">+ הוסף סדר</button>
        </div>
      </fieldset>

      <fieldset className="p-4 border rounded-md">
        <legend className="px-2 font-medium">{t('bonuses')}</legend>
        <div className="space-y-3">
            {settings.generalBonuses.map(bonus => (
                <div key={bonus.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border dark:border-slate-600">
                    <div className="flex gap-2 mb-2 items-center">
                        <div className="flex-grow">
                            <label className="text-[10px] text-slate-500 dark:text-slate-400 block flex items-center">{t('bonus_name_ph')} <HelpTooltip text={t('help_bonus_name')} /></label>
                            <input type="text" value={bonus.name} onChange={e => setSettings(p => ({...p, generalBonuses: p.generalBonuses.map(b => b.id === bonus.id ? {...b, name: e.target.value} : b)}))} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600" />
                        </div>
                        <div className="w-24">
                            <label className="text-[10px] text-slate-500 dark:text-slate-400 block flex items-center">{t('amount_ph')} <HelpTooltip text={t('help_bonus_amount')} /></label>
                            <input type="number" value={bonus.amount} onChange={e => setSettings(p => ({...p, generalBonuses: p.generalBonuses.map(b => b.id === bonus.id ? {...b, amount: Number(e.target.value)} : b)}))} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600" />
                        </div>
                        <button onClick={() => setSettings(p => ({...p, generalBonuses: p.generalBonuses.filter(b => b.id !== bonus.id)}))} className="mt-4 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><TrashIcon className="w-4 h-4 text-red-400"/></button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-600 text-[10px]">
                        <div className="flex justify-between items-center mb-1">
                            <span className="flex items-center">תנאי זכאות (לפי % נוכחות חודשי)<HelpTooltip text={t('help_bonus_attendance')} /></span>
                            <button onClick={() => handleAddBonusTier(bonus.id)} className="bg-indigo-50 dark:bg-indigo-900/30 px-2 rounded text-indigo-600 dark:text-indigo-400">+ תנאי</button>
                        </div>
                        {bonus.customConditions?.map((cond, idx) => (
                            <div key={idx} className="flex gap-2 items-center mt-1">
                                <span>נוכחות {'>'}=</span>
                                <input type="number" value={cond.threshold} onChange={e => setSettings(p => ({...p, generalBonuses: p.generalBonuses.map(b => b.id === bonus.id ? {...b, customConditions: b.customConditions?.map((v, i) => i === idx ? {...v, threshold: Number(e.target.value)} : v)} : b)}))} className="w-10 p-0.5 border rounded dark:bg-slate-700 dark:border-slate-500" />
                                <span>% → קבל</span>
                                <input type="number" value={cond.percent} onChange={e => setSettings(p => ({...p, generalBonuses: p.generalBonuses.map(b => b.id === bonus.id ? {...b, customConditions: b.customConditions?.map((v, i) => i === idx ? {...v, percent: Number(e.target.value)} : v)} : b)}))} className="w-10 p-0.5 border rounded dark:bg-slate-700 dark:border-slate-500" />
                                <span>%</span>
                                <button onClick={() => handleRemoveBonusTier(bonus.id, idx)} className="ml-auto text-slate-400 hover:text-red-500 transition-colors">
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <button onClick={() => setSettings(p => ({...p, generalBonuses: [...p.generalBonuses, {id: Date.now(), name: 'בונוס חדש', amount: 100, bonusType: 'count', subjectToAttendanceThreshold: false, attendanceConditionType: 'custom', customConditions: []}]}))} className="w-full py-2 border-2 border-dashed rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 text-slate-500">+ הוסף בונוס/מבחן</button>
        </div>
      </fieldset>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6 w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 pb-4 border-b dark:border-slate-700">
        <div className="flex items-center gap-3"><button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><BackIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" /></button><h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('settings_title')}</h2></div>
        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportFile} 
                className="hidden" 
                accept=".json"
            />
            <button onClick={handleImportClick} className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                <UploadIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('import_json')}</span>
            </button>
            <button onClick={handleExportSettings} className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                <DownloadIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('export_json')}</span>
            </button>
        </div>
      </div>
      {renderManualMode()}
      <div className="mt-8 pt-6 border-t dark:border-slate-700 flex justify-end gap-4">
        <button onClick={onBack} className="px-6 py-2 border rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-slate-200">{t('cancel')}</button>
        <button onClick={() => onSave(settings)} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium shadow-md">{t('save_changes')}</button>
      </div>
    </div>
  );
};

export default StipendSettingsComponent;
