import React, { useState } from 'react';
import type { StipendSettings } from '../types';
import { BackIcon } from './icons/BackIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { generateStipendSettingsFromPrompt } from '../services/api';

interface StipendSettingsProps {
  initialSettings: StipendSettings;
  onSave: (newSettings: StipendSettings) => void;
  onBack: () => void;
  // Add props to make this a controlled component
  prompt: string;
  setPrompt: (prompt: string) => void;
  generatedSettings: StipendSettings | null;
  setGeneratedSettings: (settings: StipendSettings | null) => void;
}

const StipendSettingsComponent: React.FC<StipendSettingsProps> = ({ 
  initialSettings, 
  onSave, 
  onBack,
  prompt,
  setPrompt,
  generatedSettings,
  setGeneratedSettings
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('יש לכתוב תיאור לחישוב המלגה.');
      return;
    }
    setError('');
    setIsLoading(true);
    setGeneratedSettings(null);
    try {
      const settings = await generateStipendSettingsFromPrompt(prompt);
      setGeneratedSettings(settings);
    } catch (err) {
      console.error("Failed to generate settings from prompt", err);
      setError('שגיאה ביצירת ההגדרות. נסו לנסח את הבקשה באופן ברור יותר או נסו שוב מאוחר יותר.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (generatedSettings) {
      // Also save the prompt that generated these settings
      const settingsToSave: StipendSettings = {
        ...generatedSettings,
        lastAiPrompt: prompt,
      };
      onSave(settingsToSave);
    }
  };
  
  const examplePrompts = [
      "מלגה חודשית של 2200 שקלים. על כל שעת חיסור מתחת ל-7 שעות ביום, יש להוריד 25 שקלים.",
      "סכום הבסיס הוא 1800 ש\"ח. יעד השעות היומי הוא 6.5. הניכוי הוא 20 ש\"ח לשעה. סדר א' מתשע עד אחת, סדר ב' מארבע עד שבע בערב.",
      "אני רוצה מלגה של 2000, ניכוי של 30 לשעה, ויעד של 8 שעות ביום."
  ];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="חזרה">
          <BackIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
        </button>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">הגדרות מלגה חכמות (AI)</h2>
      </div>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            תאר במילים פשוטות כיצד לחשב את המלגה
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="mt-1 w-full block p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="לדוגמה: מלגה חודשית של 2000 שקלים. על כל שעת חיסור מתחת ל-7 שעות ביום, יש להוריד 25 שקלים."
            disabled={isLoading}
            aria-label="הזן תיאור לחישוב המלגה"
          />
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <p className="font-medium">דוגמאות:</p>
            <ul className="list-disc list-inside">
              {examplePrompts.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        </div>
        
        <button 
          onClick={handleGenerate} 
          disabled={isLoading || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>מעבד...</span>
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              <span>יצירת הגדרות עם AI</span>
            </>
          )}
        </button>

        {error && <p className="text-red-500 text-sm text-center" role="alert">{error}</p>}

        {generatedSettings && (
          <div className="p-4 border-2 border-dashed border-green-400 dark:border-green-600 rounded-md bg-green-50 dark:bg-green-900/20 space-y-4 animate-fade-in" role="status">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">הגדרות שנוצרו:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div><span className="font-medium text-slate-600 dark:text-slate-300">סכום בסיס:</span> ₪{generatedSettings.baseStipend}</div>
                <div><span className="font-medium text-slate-600 dark:text-slate-300">ניכוי לשעה:</span> ₪{generatedSettings.deductionPerHour}</div>
                <div><span className="font-medium text-slate-600 dark:text-slate-300">שעות תקן:</span> {generatedSettings.dailyHoursTarget}</div>
                <div><span className="font-medium text-slate-600 dark:text-slate-300">סדר א':</span> {generatedSettings.sederA_start} - {generatedSettings.sederA_end}</div>
                <div><span className="font-medium text-slate-600 dark:text-slate-300">סדר ב':</span> {generatedSettings.sederB_start} - {generatedSettings.sederB_end}</div>
                <div><span className="font-medium text-slate-600 dark:text-slate-300">בונוס מבחן:</span> ₪{generatedSettings.testBonus}</div>
                <div><span className="font-medium text-slate-600 dark:text-slate-300">בונוס סיכום:</span> ₪{generatedSettings.summaryBonus}</div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">אם ההגדרות נראות תקינות, לחץ על "שמירת שינויים". אחרת, שנה את התיאור ונסה שוב.</p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button 
            type="button" 
            onClick={handleSave} 
            disabled={!generatedSettings || isLoading}
            className="w-full sm:w-auto flex justify-center py-3 px-8 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
          >
            שמירת שינויים
          </button>
        </div>
      </div>
    </div>
  );
};

export default StipendSettingsComponent;