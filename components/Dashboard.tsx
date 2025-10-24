import React, { useState, useRef, useEffect } from 'react';
import type { KollelDetails, StipendResult, MonthlyData, StipendSettings } from '../types';
import { parseXlsxAndCalculateStipends } from '../services/parser';
import { exportSummaryToCsv } from '../services/exporter';
import { getSavedData, saveMonthlyData, deleteMonthlyData } from '../services/api';
import AttendanceTable from './AttendanceTable';
import Reports from './Reports';
// Fix: Renamed component import to avoid name collision with the StipendSettings type.
import StipendSettingsComponent from './StipendSettings';
import { UploadIcon } from './icons/UploadIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { SaveIcon } from './icons/SaveIcon';
import { BackIcon } from './icons/BackIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChartIcon } from './icons/ChartIcon';
import { CoinsIcon } from './icons/CoinsIcon';


interface DashboardProps {
  kollelDetails: KollelDetails;
  onSwitchKollel: () => void;
  onUpdateSettings: (settings: StipendSettings) => void;
}

type DashboardView = 'CHOICE' | 'VIEW_SAVED' | 'SHOW_RESULTS' | 'REPORTS' | 'STIPEND_SETTINGS';

const Dashboard: React.FC<DashboardProps> = ({ kollelDetails, onSwitchKollel, onUpdateSettings }) => {
  const [view, setView] = useState<DashboardView>('CHOICE');
  const [stipendResults, setStipendResults] = useState<StipendResult[] | null>(null);
  const [monthYear, setMonthYear] = useState<string | null>(null);
  const [savedData, setSavedData] = useState<MonthlyData[]>([]);

  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSavedData = async () => {
      if (!kollelDetails.id) {
        console.log('⚠️ No kollel ID provided, skipping data load');
        setIsDataLoading(false);
        return;
      }

      console.log('🔄 Loading saved data for kollel:', kollelDetails.id);
      setIsDataLoading(true);
      try {
        const data = await getSavedData(kollelDetails.id);
        console.log('✅ Successfully loaded saved data:', data);
        setSavedData(data);
      } catch (e) {
        console.error("❌ Failed to load saved data", e);
        setError("שגיאה בטעינת נתונים שמורים.");
        setSavedData([]);
      } finally {
        console.log('🏁 Finished loading data, setting isDataLoading to false');
        setIsDataLoading(false);
      }
    };

    loadSavedData();
    
    // Reset view state when kollel changes
    setView('CHOICE');
    setStipendResults(null);
    setMonthYear(null);
    setError('');
    setFileName('');
  }, [kollelDetails]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setStipendResults(null);
    setMonthYear(null);
    setFileName(file.name);
    setIsLoading(true);

    const fileNameLower = file.name.toLowerCase();
    const isSupported = fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls');

    if (!isSupported) {
      setError('יש להעלות קובץ מסוג XLSX או XLS בלבד.');
      setFileName('');
      setIsLoading(false);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (!content) {
          throw new Error('לא ניתן היה לקרוא את תוכן הקובץ.');
        }

        const { monthYear: newMonthYear, results } = parseXlsxAndCalculateStipends(content as ArrayBuffer, kollelDetails, file.name);

        setStipendResults(results);
        setMonthYear(newMonthYear);
        setView('SHOW_RESULTS');

      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('אירעה שגיאה בעיבוד הקובץ.');
        }
        setStipendResults(null);
        setMonthYear(null);
        setFileName('');
        setView('CHOICE');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError('שגיאה בקריאת הקובץ.');
      setFileName('');
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleUploadClick = () => {
    setError('');
    fileInputRef.current?.click();
  };

  const handleExportSummary = () => {
    if (stipendResults) {
      exportSummaryToCsv(stipendResults, kollelDetails.name, monthYear);
    }
  };

  const handleSaveCurrentMonth = async () => {
    if (!monthYear || !stipendResults) return;
    if (savedData.some(d => d.monthYear === monthYear)) return;

    const newData: MonthlyData = { monthYear, results: stipendResults };
    try {
      await saveMonthlyData(kollelDetails.id, newData);
      setSavedData(prev => [...prev, newData].sort((a, b) => b.monthYear.localeCompare(a.monthYear)));
    } catch (err) {
      console.error("Failed to save monthly data", err);
      alert("שגיאה בשמירת נתוני החודש.");
    }
  };

  const handleLoadMonth = (monthData: MonthlyData) => {
    setMonthYear(monthData.monthYear);
    setStipendResults(monthData.results);
    setFileName('');
    setError('');
    setView('SHOW_RESULTS');
  };

  const handleDeleteMonth = async (monthYearToDelete: string) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את הנתונים עבור חודש ${monthYearToDelete}? לא ניתן לשחזר פעולה זו.`)) {
      try {
        await deleteMonthlyData(kollelDetails.id, monthYearToDelete);
        setSavedData(prev => prev.filter(d => d.monthYear !== monthYearToDelete));
      } catch (err) {
        console.error("Failed to delete monthly data", err);
        alert("שגיאה במחיקת נתוני החודש.");
      }
    }
  };

  const resetToChoice = () => {
    setView('CHOICE');
    setStipendResults(null);
    setMonthYear(null);
    setError('');
    setFileName('');
  };

  const handleUpdateScholarResult = (updatedResult: StipendResult) => {
    setStipendResults(prevResults => {
      if (!prevResults) return null;
      return prevResults.map(r => r.name === updatedResult.name ? updatedResult : r);
    });
  };

  const isCurrentMonthSaved = monthYear ? savedData.some(d => d.monthYear === monthYear) : false;

  const renderChoiceView = () => {
    if (isDataLoading) {
      return <div className="text-center text-lg animate-pulse p-8">טוען נתונים שמורים...</div>;
    }
    return (
      <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-semibold mb-6">אפשרויות ניהול</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button onClick={handleUploadClick} disabled={isLoading} className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 transform hover:scale-105">
            <UploadIcon className="w-12 h-12 text-indigo-500 mb-3" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">העלאת דוח</span>
            <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">קובץ XLSX/XLS</span>
          </button>
          <button onClick={() => setView('VIEW_SAVED')} disabled={savedData.length === 0} className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
            <HistoryIcon className="w-12 h-12 text-teal-500 mb-3" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">נתונים שמורים</span>
            <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">{savedData.length} חודשים</span>
          </button>
          <button onClick={() => setView('REPORTS')} disabled={savedData.length === 0} className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
            <ChartIcon className="w-12 h-12 text-amber-500 mb-3" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">הפקת דוחות</span>
            <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">ניתוח נתונים</span>
          </button>
          <button onClick={() => setView('STIPEND_SETTINGS')} className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 transform hover:scale-105">
            <CoinsIcon className="w-12 h-12 text-lime-500 mb-3" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">הגדרות מלגה</span>
            <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">סכומים ובונוסים</span>
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel"
          className="hidden"
          disabled={isLoading}
        />
        {isLoading && <p className="mt-6 text-sm text-indigo-600 dark:text-indigo-400 animate-pulse">מעבד את <span className="font-medium">{fileName}</span>...</p>}
        {error && (
          <div className="mt-6 bg-red-100 dark:bg-red-900/30 border-r-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-lg text-right" role="alert">
            <p className="font-bold">שגיאה</p>
            <p>{error}</p>
          </div>
        )}
      </div>
    );
  };
  const renderSavedView = () => (
    <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-8 w-full max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">טעינת נתונים שמורים</h2>
        <button onClick={resetToChoice} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="חזרה">
          <BackIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
        </button>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {savedData.map(data => (
          <div key={data.monthYear} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-between gap-4">
            <span className="font-bold text-slate-800 dark:text-slate-100">חודש {data.monthYear}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => handleDeleteMonth(data.monthYear)} className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors" title="מחק נתונים">
                <TrashIcon className="w-5 h-5" />
              </button>
              <button onClick={() => handleLoadMonth(data)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">
                טעינה
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderResultsView = () => (
    <div className="w-full">
      {fileName && <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-4 rounded-lg mb-6 text-center">
        הקובץ <span className="font-medium">{fileName}</span> עובד בהצלחה.
      </div>}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div className="flex items-center gap-3">
          <button onClick={resetToChoice} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="חזרה">
            <BackIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </button>
          <h2 className="text-2xl font-semibold">תוצאות עבור חודש {monthYear}</h2>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleSaveCurrentMonth}
            disabled={isCurrentMonthSaved}
            className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            <SaveIcon className="w-5 h-5" />
            {isCurrentMonthSaved ? 'הנתונים נשמרו' : 'שמור נתוני חודש'}
          </button>
          <button
            onClick={handleExportSummary}
            className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300"
          >
            <DownloadIcon className="w-5 h-5" />
            ייצוא דוח כללי
          </button>
        </div>
      </div>
      {stipendResults && monthYear && <AttendanceTable 
          results={stipendResults} 
          kollelDetails={kollelDetails} 
          monthYear={monthYear}
          onUpdateScholarResult={handleUpdateScholarResult}
          onUpdateSettings={onUpdateSettings}
      />}
    </div>
  );

  const renderStipendSettingsView = () => (
    <StipendSettingsComponent
      initialSettings={kollelDetails.settings}
      onSave={(newSettings) => {
        onUpdateSettings(newSettings);
        alert('ההגדרות נשמרו בהצלחה!');
        setView('CHOICE');
      }}
      onBack={resetToChoice}
    />
  );

  const renderContent = () => {
    switch (view) {
      case 'CHOICE': return renderChoiceView();
      case 'VIEW_SAVED': return renderSavedView();
      case 'SHOW_RESULTS': return renderResultsView();
      case 'REPORTS': return <Reports savedData={savedData} onBack={resetToChoice} kollelDetails={kollelDetails} />;
      case 'STIPEND_SETTINGS': return renderStipendSettingsView();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="flex items-center justify-between pb-4 border-b-2 border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">{kollelDetails.name}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">מערכת לחישוב מלגות</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onSwitchKollel} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="ניהול כוללים">
            <SettingsIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline text-sm font-medium">ניהול כוללים</span>
          </button>
        </div>
      </header>
      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;