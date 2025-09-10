import React, { useState } from 'react';
import type { StipendSettings } from '../types';
import { BackIcon } from './icons/BackIcon';

interface StipendSettingsProps {
  initialSettings: StipendSettings;
  onSave: (newSettings: StipendSettings) => void;
  onBack: () => void;
}

const StipendSettings: React.FC<StipendSettingsProps> = ({ initialSettings, onSave, onBack }) => {
  const [settings, setSettings] = useState<StipendSettings>(initialSettings);
  const [error, setError] = useState('');

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.baseStipend <= 0 || settings.dailyHoursTarget <= 0 || settings.deductionPerHour < 0) {
      setError('יש למלא את כל שדות החובה. הערכים המספריים חייבים להיות חיוביים.');
      return;
    }
    setError('');
    onSave(settings);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="חזרה">
              <BackIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </button>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">הגדרות מלגה</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="p-4 border rounded-md border-slate-300 dark:border-slate-600">
          <legend className="px-2 font-medium">הגדרות בסיס</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            <div>
              <label htmlFor="baseStipend" className="block text-sm font-medium text-slate-700 dark:text-slate-300">סכום בסיס (חודשי)</label>
              <input type="number" id="baseStipend" name="baseStipend" value={settings.baseStipend} onChange={handleSettingsChange} required className="mt-1 w-full block p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
            </div>
            <div>
              <label htmlFor="deductionPerHour" className="block text-sm font-medium text-slate-700 dark:text-slate-300">ניכוי לשעת חיסור</label>
              <input type="number" id="deductionPerHour" name="deductionPerHour" value={settings.deductionPerHour} onChange={handleSettingsChange} required className="mt-1 w-full block p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
            </div>
            <div>
              <label htmlFor="dailyHoursTarget" className="block text-sm font-medium text-slate-700 dark:text-slate-300">שעות תקן (יומי)</label>
              <input type="number" id="dailyHoursTarget" name="dailyHoursTarget" value={settings.dailyHoursTarget} onChange={handleSettingsChange} required min="1" step="0.1" className="mt-1 w-full block p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
            </div>
          </div>
        </fieldset>

        <fieldset className="p-4 border rounded-md border-slate-300 dark:border-slate-600">
          <legend className="px-2 font-medium">זמני סדרים (הכנה לעתיד)</legend>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
             <div>
              <label htmlFor="sederA_start" className="block text-sm">סדר א' - התחלה</label>
              <input type="time" id="sederA_start" name="sederA_start" value={settings.sederA_start} onChange={handleSettingsChange} className="mt-1 w-full block p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
            </div>
            <div>
              <label htmlFor="sederA_end" className="block text-sm">סדר א' - סיום</label>
              <input type="time" id="sederA_end" name="sederA_end" value={settings.sederA_end} onChange={handleSettingsChange} className="mt-1 w-full block p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
            </div>
             <div>
              <label htmlFor="sederB_start" className="block text-sm">סדר ב' - התחלה</label>
              <input type="time" id="sederB_start" name="sederB_start" value={settings.sederB_start} onChange={handleSettingsChange} className="mt-1 w-full block p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
            </div>
            <div>
              <label htmlFor="sederB_end" className="block text-sm">סדר ב' - סיום</label>
              <input type="time" id="sederB_end" name="sederB_end" value={settings.sederB_end} onChange={handleSettingsChange} className="mt-1 w-full block p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
            </div>
          </div>
        </fieldset>

         <fieldset className="p-4 border rounded-md border-slate-300 dark:border-slate-600">
          <legend className="px-2 font-medium">בונוסים (הכנה לעתיד)</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label htmlFor="testBonus" className="block text-sm">בונוס על מבחן</label>
              <input type="number" id="testBonus" name="testBonus" value={settings.testBonus} onChange={handleSettingsChange} className="mt-1 w-full block p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
            </div>
            <div>
              <label htmlFor="summaryBonus" className="block text-sm">בונוס על סיכום</label>
              <input type="number" id="summaryBonus" name="summaryBonus" value={settings.summaryBonus} onChange={handleSettingsChange} className="mt-1 w-full block p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
            </div>
          </div>
        </fieldset>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <div className="flex justify-end pt-4">
          <button type="submit" className="w-full sm:w-auto flex justify-center py-3 px-8 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            שמירת שינויים
          </button>
        </div>
      </form>
    </div>
  );
};

export default StipendSettings;
