
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { StipendSettings, Seder, GeneralBonus } from '../types';
import { BackIcon } from './icons/BackIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { generateStipendSettingsFromPrompt } from '../services/api';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { InfoIcon } from './icons/InfoIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';

const ensureSettingsCompatibility = (settings: StipendSettings): StipendSettings => {
    let compatible: StipendSettings = JSON.parse(JSON.stringify(settings));

    if (!compatible.deductions) {
        compatible.deductions = {
            highRate: settings.deductionPerHour || 25,
            lowRate: (settings.deductionPerHour || 25) * 0.8,
            attendanceThresholdPercent: 90,
        };
        delete compatible.deductionPerHour;
    }

    if (compatible.singleSederSettings) {
        if (compatible.sedarim && compatible.sedarim.length > 0) {
            compatible.sedarim[0].partialStipendPercentage = compatible.singleSederSettings.sederAPercentage;
        }
        if (compatible.sedarim && compatible.sedarim.length > 1) {
            compatible.sedarim[1].partialStipendPercentage = compatible.singleSederSettings.sederBPercentage;
        }
        delete compatible.singleSederSettings;
    }

    compatible.sedarim = (compatible.sedarim || []).map((s: Seder) => ({
        ...s,
        punctualityBonusCancellationThreshold: s.punctualityBonusCancellationThreshold || 4,
        partialStipendPercentage: s.partialStipendPercentage || 0,
        useCustomDeductions: s.useCustomDeductions || false,
        deductions: s.deductions || { highRate: 25, lowRate: 20, attendanceThresholdPercent: 90 },
    }));

    compatible.generalBonuses = (compatible.generalBonuses || []).map((b: GeneralBonus) => {
        const bonus = { ...b, bonusType: b.bonusType || 'count' };
        if (!bonus.attendanceConditionType) {
            if (bonus.subjectToAttendanceThreshold) {
                bonus.attendanceConditionType = 'global';
            } else {
                bonus.attendanceConditionType = 'none';
            }
        }
        if (!bonus.customConditions) {
            bonus.customConditions = [];
        }
        return bonus;
    });

    compatible.bonusAttendanceThresholdEnabled = compatible.bonusAttendanceThresholdEnabled ?? true;
    compatible.bonusAttendanceThresholdPercent = compatible.bonusAttendanceThresholdPercent || 80;
    compatible.rounding = compatible.rounding || 'none';

    return compatible;
};


interface StipendSettingsProps {
  initialSettings: StipendSettings;
  onSave: (newSettings: StipendSettings) => void;
  onBack: () => void;
}

const timeToDecimal = (time: string): number => {
    if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return NaN;
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
};

const StipendSettingsComponent: React.FC<StipendSettingsProps> = ({
  initialSettings,
  onSave,
  onBack,
}) => {
  const [mode, setMode] = useState<'ai' | 'manual'>('manual');
  const [aiPrompt, setAiPrompt] = useState(initialSettings.lastAiPrompt || 'מלגה חודשית של 2000 שקלים. על כל שעת חיסור מתחת ל-7 שעות ביום, יש להוריד 25 שקלים.');
  const [settings, setSettings] = useState<StipendSettings>(() => ensureSettingsCompatibility(initialSettings));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sederErrors, setSederErrors] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(ensureSettingsCompatibility(initialSettings));
  }, [initialSettings]);
  
  useEffect(() => {
    const newErrors: Record<number, string> = {};
    const sedarim = settings.sedarim || [];
    for (let i = 0; i < sedarim.length; i++) {
        const s1 = sedarim[i];
        const start1 = timeToDecimal(s1.startTime);
        const end1 = timeToDecimal(s1.endTime);
        if (isNaN(start1) || isNaN(end1) || start1 >= end1) {
            newErrors[s1.id] = 'זמן הסיום חייב להיות אחרי זמן ההתחלה.';
            continue;
        }
        for (let j = i + 1; j < sedarim.length; j++) {
            const s2 = sedarim[j];
            const start2 = timeToDecimal(s2.startTime);
            const end2 = timeToDecimal(s2.endTime);
            if (isNaN(start2) || isNaN(end2)) continue;
            if (start1 < end2 && end1 > start2) {
                newErrors[s1.id] = `חפיפה עם '${s2.name}'`;
                newErrors[s2.id] = `חפיפה עם '${s1.name}'`;
            }
        }
    }
    setSederErrors(newErrors);
  }, [settings.sedarim]);

  const dailyHoursTarget = useMemo(() => {
    return (settings.sedarim || []).reduce((total, seder) => {
        const start = timeToDecimal(seder.startTime);
        const end = timeToDecimal(seder.endTime);
        if (!isNaN(start) && !isNaN(end) && end > start) return total + (end - start);
        return total;
    }, 0);
  }, [settings.sedarim]);

  const isSaveDisabled = Object.keys(sederErrors).length > 0;

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) { setError('יש לכתוב תיאור לחישוב המלגה.'); return; }
    setError(''); setIsLoading(true);
    try {
      const generated = await generateStipendSettingsFromPrompt(aiPrompt);
      const compatibleGenerated = ensureSettingsCompatibility(generated);
      setSettings({ ...settings, ...compatibleGenerated, lastAiPrompt: aiPrompt });
      setMode('manual');
    } catch (err) {
      setError('שגיאה ביצירת ההגדרות. נסו לנסח את הבקשה באופן ברור יותר.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSettingsChange = (field: keyof StipendSettings, value: any) => setSettings(p => ({...p, [field]: value}));
  const handleNestedChange = (area: keyof StipendSettings, field: string, value: any) => setSettings(p => ({...p, [area]: {...p[area], [field]: value}}));
  const handleSederChange = (id: number, field: keyof Seder, value: any) => setSettings(p => ({...p, sedarim: p.sedarim.map(s => s.id === id ? { ...s, [field]: value } : s)}));
  const handleSederDeductionChange = (id: number, field: string, value: any) => setSettings(p => ({...p, sedarim: p.sedarim.map(s => s.id === id ? { ...s, deductions: { ...s.deductions, [field]: value } } : s)}));
  const handleBonusChange = (id: number, field: keyof GeneralBonus, value: any) => setSettings(p => ({...p, generalBonuses: p.generalBonuses.map(b => b.id === id ? { ...b, [field]: value } : b)}));

  const handleAddBonusCondition = (bonusId: number) => {
      setSettings(p => ({
          ...p,
          generalBonuses: p.generalBonuses.map(b => {
              if (b.id !== bonusId) return b;
              const newConditions = [...(b.customConditions || [])];
              newConditions.push({ threshold: 65, percent: 50 });
              return { ...b, customConditions: newConditions };
          })
      }));
  };

  const handleUpdateBonusCondition = (bonusId: number, index: number, field: 'threshold' | 'percent', value: string) => {
      setSettings(p => ({
          ...p,
          generalBonuses: p.generalBonuses.map(b => {
              if (b.id !== bonusId) return b;
              const newConditions = [...(b.customConditions || [])];
              newConditions[index] = { ...newConditions[index], [field]: Number(value) };
              return { ...b, customConditions: newConditions };
          })
      }));
  };

  const handleRemoveBonusCondition = (bonusId: number, index: number) => {
      setSettings(p => ({
          ...p,
          generalBonuses: p.generalBonuses.map(b => {
              if (b.id !== bonusId) return b;
              const newConditions = b.customConditions?.filter((_, i) => i !== index);
              return { ...b, customConditions: newConditions };
          })
      }));
  };

  const handleAddSeder = () => setSettings(p => ({ ...p, sedarim: [...p.sedarim, { id: Date.now(), name: `סדר ${p.sedarim.length + 1}`, startTime: '09:00', endTime: '13:00', punctualityBonusEnabled: false, punctualityLateThresholdMinutes: 10, punctualityBonusAmount: 0, punctualityBonusCancellationThreshold: 4, partialStipendPercentage: 50, useCustomDeductions: false, deductions: { highRate: 25, lowRate: 20, attendanceThresholdPercent: 90 } }] }));
  const handleRemoveSeder = (id: number) => setSettings(p => ({ ...p, sedarim: p.sedarim.filter(s => s.id !== id) }));
  
  const handleAddBonus = () => setSettings(p => ({ ...p, generalBonuses: [...p.generalBonuses, { id: Date.now(), name: 'בונוס חדש', amount: 100, bonusType: 'count', subjectToAttendanceThreshold: false, attendanceConditionType: 'none', customConditions: [] }] }));
  const handleRemoveBonus = (id: number) => setSettings(p => ({ ...p, generalBonuses: p.generalBonuses.filter(b => b.id !== id) }));

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `stipend_settings_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
        fileReader.readAsText(event.target.files[0], "UTF-8");
        fileReader.onload = (e) => {
            if (e.target?.result) {
                try {
                    const parsedSettings = JSON.parse(e.target.result as string);
                    const compatibleSettings = ensureSettingsCompatibility(parsedSettings);
                    
                    if (window.confirm('האם אתה בטוח שברצונך לדרוס את ההגדרות הנוכחיות עם ההגדרות מהקובץ?')) {
                        setSettings(prev => ({
                            ...compatibleSettings,
                            // Ensure we keep necessary fields if they are missing (unlikely if valid file)
                            lastAiPrompt: compatibleSettings.lastAiPrompt || prev.lastAiPrompt
                        }));
                        if (compatibleSettings.lastAiPrompt) {
                            setAiPrompt(compatibleSettings.lastAiPrompt);
                        }
                        alert('ההגדרות נטענו בהצלחה!');
                    }
                } catch (error) {
                    console.error(error);
                    alert('שגיאה בטעינת קובץ ההגדרות. ודא שהקובץ תקין.');
                }
            }
        };
        // Reset the input so the same file can be selected again if needed
        event.target.value = '';
    }
  };

  const handleSave = () => {
    if (isSaveDisabled) return;
    const settingsToSave = JSON.parse(JSON.stringify(settings), (key, value) => {
        if (['baseStipend', 'highRate', 'lowRate', 'attendanceThresholdPercent', 'punctualityLateThresholdMinutes', 'punctualityBonusAmount', 'punctualityBonusCancellationThreshold', 'amount', 'bonusAttendanceThresholdPercent', 'partialStipendPercentage'].includes(key)) {
            return Number(value);
        }
        return value;
    });
    onSave(settingsToSave);
  };

  const renderAiMode = () => (
    <div className="space-y-6 animate-fade-in">
        <p className="text-sm text-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg">
            מצב AI מיועד ליצירת תבנית ראשונית. לאחר היצירה תוכלו לערוך את כל ההגדרות המורכבות במצב הידני.
        </p>
        <textarea id="prompt" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3} className="mt-1 w-full block p-3 border rounded-md" placeholder="לדוגמה: מלגה חודשית של 2000 שקלים..." disabled={isLoading}/>
        <button onClick={handleGenerate} disabled={isLoading || !aiPrompt.trim()} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400">
            {isLoading ? <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>מעבד...</> : <><SparklesIcon className="w-5 h-5" />יצירת הגדרות ועריכה</>}
        </button>
    </div>
  );

  const renderManualMode = () => (
    <div className="space-y-6 animate-fade-in">
      <fieldset className="p-4 border rounded-md">
        <legend className="px-2 font-medium">הגדרות בסיס וניכויים גלובליים</legend>
        <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
                <label className="block text-sm font-medium">מלגת בסיס (ש"ח)</label>
                <input type="number" value={settings.baseStipend} onChange={e => handleSettingsChange('baseStipend', e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium">יעד שעות יומי (אוטומטי)</label>
                <div className="mt-1 w-full p-2 border rounded-md bg-slate-100 dark:bg-slate-800 font-bold">{dailyHoursTarget.toFixed(2)} שעות</div>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div>
                <label className="flex items-center gap-1 text-sm font-medium">
                    <span>ניכוי גבוה (ש"ח לשעה)</span>
                    <span title="הסכום שיורד על כל שעת חיסור כאשר הנוכחות הכללית של האברך נמוכה מהסף שנקבע.">
                        <InfoIcon className="w-4 h-4 text-slate-400 cursor-help" />
                    </span>
                </label>
                <input type="number" value={settings.deductions.highRate} onChange={e => handleNestedChange('deductions', 'highRate', e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
                <label className="flex items-center gap-1 text-sm font-medium">
                    <span>ניכוי נמוך (ש"ח לשעה)</span>
                     <span title="הסכום שיורד על כל שעת חיסור כאשר הנוכחות הכללית של האברך גבוהה או שווה לסף שנקבע.">
                        <InfoIcon className="w-4 h-4 text-slate-400 cursor-help" />
                    </span>
                </label>
                <input type="number" value={settings.deductions.lowRate} onChange={e => handleNestedChange('deductions', 'lowRate', e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
                <label className="flex items-center gap-1 text-sm font-medium">
                    <span>סף נוכחות לניכוי נמוך (%)</span>
                     <span title="אחוז הנוכחות הכללי שהאברך צריך לעמוד בו כדי להיות זכאי לניכוי הנמוך. אם נוכחותו נמוכה מסף זה, יחול הניכוי הגבוה.">
                        <InfoIcon className="w-4 h-4 text-slate-400 cursor-help" />
                    </span>
                </label>
                <input type="number" value={settings.deductions.attendanceThresholdPercent} onChange={e => handleNestedChange('deductions', 'attendanceThresholdPercent', e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
            </div>
        </div>
      </fieldset>
      
      <fieldset className="p-4 border rounded-md">
        <legend className="px-2 font-medium">סדרי לימוד</legend>
        <div className="space-y-4 mt-2">
            {settings.sedarim.map(seder => (
                <div key={seder.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border">
                   <div className="flex items-center justify-between mb-3">
                     <input type="text" value={seder.name} onChange={e => handleSederChange(seder.id, 'name', e.target.value)} className="font-semibold bg-transparent text-lg border-0 border-b-2" />
                     <button onClick={() => handleRemoveSeder(seder.id)} className="p-1 text-slate-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                   </div>
                   <div className="grid grid-cols-2 gap-4 mb-2">
                       <input type="text" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" placeholder="HH:mm התחלה" value={seder.startTime} onChange={e => handleSederChange(seder.id, 'startTime', e.target.value)} className={`w-full p-2 border rounded-md font-mono ${sederErrors[seder.id] ? 'border-red-500' : ''}`} maxLength={5} />
                       <input type="text" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" placeholder="HH:mm סיום" value={seder.endTime} onChange={e => handleSederChange(seder.id, 'endTime', e.target.value)} className={`w-full p-2 border rounded-md font-mono ${sederErrors[seder.id] ? 'border-red-500' : ''}`} maxLength={5} />
                   </div>
                    {sederErrors[seder.id] && <p className="text-xs text-red-600 text-center">{sederErrors[seder.id]}</p>}
                    
                    <div className="mt-3 pt-3 border-t">
                      <label className="flex items-center gap-1 text-sm font-medium">
                          <span>אחוז מלגה (לנוכחים בסדר זה בלבד)</span>
                          <span title="מגדיר איזה אחוז מהמלגה החודשית יקבל אברך שנכח רק בסדר זה ולא בסדרים אחרים. שימושי לקביעת מלגות שונות לאברכי בוקר/ערב.">
                              <InfoIcon className="w-4 h-4 text-slate-400 cursor-help" />
                          </span>
                      </label>
                      <input type="number" value={seder.partialStipendPercentage} onChange={e => handleSederChange(seder.id, 'partialStipendPercentage', e.target.value)} className="mt-1 w-full p-2 border rounded-md" placeholder="לדוגמה: 55" />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-sm mt-3"><input type="checkbox" checked={seder.punctualityBonusEnabled} onChange={e => handleSederChange(seder.id, 'punctualityBonusEnabled', e.target.checked)} className="h-4 w-4 rounded" />הפעל "שמירת סדרים"</label>
                    {seder.punctualityBonusEnabled && (
                       <div className="grid grid-cols-3 gap-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-md animate-fade-in mt-2">
                           <div><label className="block text-xs font-medium">סף איחור (דקות)</label><input type="number" value={seder.punctualityLateThresholdMinutes} onChange={e => handleSederChange(seder.id, 'punctualityLateThresholdMinutes', e.target.value)} className="mt-1 w-full p-2 border rounded-md" /></div>
                           <div><label className="block text-xs font-medium">סכום בונוס (ש"ח)</label><input type="number" value={seder.punctualityBonusAmount} onChange={e => handleSederChange(seder.id, 'punctualityBonusAmount', e.target.value)} className="mt-1 w-full p-2 border rounded-md" /></div>
                           <div><label className="block text-xs font-medium">ביטול אחרי X איחורים</label><input type="number" value={seder.punctualityBonusCancellationThreshold} onChange={e => handleSederChange(seder.id, 'punctualityBonusCancellationThreshold', e.target.value)} className="mt-1 w-full p-2 border rounded-md" /></div>
                       </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer text-sm mt-3"><input type="checkbox" checked={seder.useCustomDeductions} onChange={e => handleSederChange(seder.id, 'useCustomDeductions', e.target.checked)} className="h-4 w-4 rounded" />הפעל כללי ניכויים מיוחדים לסדר זה</label>
                    {seder.useCustomDeductions && (
                       <div className="grid grid-cols-3 gap-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-md animate-fade-in mt-2">
                           <div>
                                <label className="flex items-center gap-1 text-xs font-medium">
                                    <span>ניכוי גבוה</span>
                                    <span title="הסכום שיורד על כל שעת חיסור כאשר הנוכחות הכללית של האברך נמוכה מהסף שנקבע.">
                                        <InfoIcon className="w-3 h-3 text-slate-400 cursor-help" />
                                    </span>
                                </label>
                                <input type="number" value={seder.deductions.highRate} onChange={e => handleSederDeductionChange(seder.id, 'highRate', e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                           </div>
                           <div>
                                <label className="flex items-center gap-1 text-xs font-medium">
                                    <span>ניכוי נמוך</span>
                                    <span title="הסכום שיורד על כל שעת חיסור כאשר הנוכחות הכללית של האברך גבוהה או שווה לסף שנקבע.">
                                        <InfoIcon className="w-3 h-3 text-slate-400 cursor-help" />
                                    </span>
                                </label>
                                <input type="number" value={seder.deductions.lowRate} onChange={e => handleSederDeductionChange(seder.id, 'lowRate', e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                           </div>
                           <div>
                                <label className="flex items-center gap-1 text-xs font-medium">
                                    <span>סף (%)</span>
                                    <span title="אחוז הנוכחות הכללי שהאברך צריך לעמוד בו כדי להיות זכאי לניכוי הנמוך. אם נוכחותו נמוכה מסף זה, יחול הניכוי הגבוה.">
                                        <InfoIcon className="w-3 h-3 text-slate-400 cursor-help" />
                                    </span>
                                </label>
                                <input type="number" value={seder.deductions.attendanceThresholdPercent} onChange={e => handleSederDeductionChange(seder.id, 'attendanceThresholdPercent', e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                           </div>
                       </div>
                    )}
                </div>
            ))}
            <button onClick={handleAddSeder} className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed rounded-md text-sm hover:bg-slate-100"><PlusIcon className="w-5 h-5"/> הוסף סדר</button>
        </div>
      </fieldset>

      <fieldset className="p-4 border rounded-md">
        <legend className="px-2 font-medium">בונוסים ותוספות</legend>
        <div className="mt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input 
                    type="checkbox" 
                    checked={settings.bonusAttendanceThresholdEnabled} 
                    onChange={e => handleSettingsChange('bonusAttendanceThresholdEnabled', e.target.checked)} 
                    className="h-4 w-4 rounded" 
                />
                הפעל סף נוכחות גלובלי (ברירת מחדל לבונוסים)
            </label>
            {settings.bonusAttendanceThresholdEnabled && (
                <div className="animate-fade-in pl-6 mt-1">
                    <label className="block text-sm font-medium">סף נוכחות נדרש (%)</label>
                    <input 
                        type="number" 
                        value={settings.bonusAttendanceThresholdPercent} 
                        onChange={e => handleSettingsChange('bonusAttendanceThresholdPercent', e.target.value)} 
                        className="mt-1 w-24 p-2 border rounded-md"
                        placeholder="80"
                    />
                </div>
            )}
        </div>
        <div className="space-y-3 mt-4">
            {settings.generalBonuses.map(bonus => (
                <div key={bonus.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border">
                    <div className="flex flex-wrap gap-2 items-center justify-between mb-2">
                         <div className="flex gap-2 items-center flex-grow">
                             <input type="text" placeholder="שם הבונוס" value={bonus.name} onChange={e => handleBonusChange(bonus.id, 'name', e.target.value)} className="p-2 border rounded-md flex-grow min-w-[120px]"/>
                             <input type="number" placeholder="סכום" value={bonus.amount} onChange={e => handleBonusChange(bonus.id, 'amount', e.target.value)} className="w-20 p-2 border rounded-md" />
                         </div>
                         <div className="flex gap-2 items-center">
                             <select value={bonus.bonusType} onChange={e => handleBonusChange(bonus.id, 'bonusType', e.target.value)} className="p-2 border rounded-md text-sm"><option value="count">לפי כמות</option><option value="amount">סכום ישיר</option></select>
                             <button onClick={() => handleRemoveBonus(bonus.id)} className="p-2 text-slate-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                         </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 text-sm">
                        <span className="text-slate-600 dark:text-slate-300">תנאי נוכחות:</span>
                        <select 
                            value={bonus.attendanceConditionType} 
                            onChange={e => handleBonusChange(bonus.id, 'attendanceConditionType', e.target.value)}
                            className="p-1 border rounded bg-white dark:bg-slate-800"
                        >
                            <option value="none">ללא תנאי (תמיד)</option>
                            <option value="global">סף גלובלי ({settings.bonusAttendanceThresholdPercent}%)</option>
                            <option value="custom">מותאם אישית (מדורג)</option>
                        </select>
                    </div>

                    {bonus.attendanceConditionType === 'custom' && (
                        <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded animate-fade-in text-sm">
                             <div className="mb-2 font-medium text-xs text-slate-500">מדרגות בונוס לפי נוכחות:</div>
                             {(bonus.customConditions || []).map((cond, idx) => (
                                 <div key={idx} className="flex items-center gap-2 mb-2">
                                     <span>אם נוכחות &ge;</span>
                                     <input 
                                         type="number" 
                                         value={cond.threshold} 
                                         onChange={e => handleUpdateBonusCondition(bonus.id, idx, 'threshold', e.target.value)} 
                                         className="w-16 p-1 border rounded text-center" 
                                         placeholder="%"
                                     />
                                     <span>% -> קבל</span>
                                     <input 
                                         type="number" 
                                         value={cond.percent} 
                                         onChange={e => handleUpdateBonusCondition(bonus.id, idx, 'percent', e.target.value)} 
                                         className="w-16 p-1 border rounded text-center"
                                         placeholder="%"
                                     />
                                     <span>% מהבונוס</span>
                                     <button onClick={() => handleRemoveBonusCondition(bonus.id, idx)} className="text-red-400 hover:text-red-600 px-2">×</button>
                                 </div>
                             ))}
                             <button onClick={() => handleAddBonusCondition(bonus.id)} className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold">+ הוסף מדרגה</button>
                        </div>
                    )}
                </div>
            ))}
            <button onClick={handleAddBonus} className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed rounded-md text-sm hover:bg-slate-100"><PlusIcon className="w-5 h-5"/> הוסף בונוס/תוספת</button>
        </div>
      </fieldset>
      
      <fieldset className="p-4 border rounded-md">
        <legend className="px-2 font-medium">הגדרות מתקדמות</legend>
         <div className="mt-2">
            <label className="block text-sm font-medium">עיגול סכום סופי</label>
            <select value={settings.rounding} onChange={e => handleSettingsChange('rounding', e.target.value)} className="mt-1 w-full p-2 border rounded-md"><option value="none">ללא</option><option value="upTo10">עגל למעלה ל-10 הקרוב</option></select>
         </div>
         
         <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-medium mb-2">ניהול הגדרות</label>
            <div className="flex gap-4">
                <button 
                    onClick={handleExportSettings}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-sm font-medium transition-colors"
                >
                    <DownloadIcon className="w-4 h-4" />
                    ייצוא הגדרות (JSON)
                </button>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-sm font-medium transition-colors"
                >
                    <UploadIcon className="w-4 h-4" />
                    ייבוא הגדרות
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImportSettings} 
                    className="hidden" 
                    accept=".json" 
                />
            </div>
         </div>
      </fieldset>
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6"><button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200"><BackIcon className="w-6 h-6" /></button><h2 className="text-3xl font-bold">הגדרות מלגה</h2></div>
      <div className="mb-6 flex p-1 bg-slate-100 dark:bg-slate-700 rounded-lg"><button onClick={() => setMode('ai')} className={`w-1/2 p-2 rounded-md font-semibold ${mode === 'ai' ? 'bg-white shadow' : ''}`}>הגדרה עם AI</button><button onClick={() => setMode('manual')} className={`w-1/2 p-2 rounded-md font-semibold ${mode === 'manual' ? 'bg-white shadow' : ''}`}>הגדרה ידנית</button></div>
      {mode === 'ai' ? renderAiMode() : renderManualMode()}
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      <div className="flex justify-end pt-4 border-t mt-6"><button type="button" onClick={handleSave} disabled={isLoading || isSaveDisabled} className="w-full sm:w-auto py-3 px-8 rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400" title={isSaveDisabled ? "יש לתקן שגיאות חפיפה בסדרים" : ""}>שמירת שינויים</button></div>
    </div>
  );
};

export default StipendSettingsComponent;
