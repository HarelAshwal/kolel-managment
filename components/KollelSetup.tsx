import React, { useState, useEffect } from 'react';
import type { KollelDetails } from '../types';

interface KollelSetupProps {
  onSetupComplete: (details: { name: string; managerName?: string; phone?: string; address?: string; }) => void;
  onCancel?: () => void;
  existingKollel?: KollelDetails | null;
}

const KollelSetup: React.FC<KollelSetupProps> = ({ onSetupComplete, onCancel, existingKollel }) => {
  const [name, setName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingKollel) {
      setName(existingKollel.name);
      setManagerName(existingKollel.managerName || '');
      setPhone(existingKollel.phone || '');
      setAddress(existingKollel.address || '');
    } else {
      setName('');
      setManagerName('');
      setPhone('');
      setAddress('');
    }
  }, [existingKollel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('יש למלא את שם הכולל.');
      return;
    }
    setError('');
    onSetupComplete({ name, managerName, phone, address });
  };

  const title = existingKollel ? 'עריכת פרטי כולל' : 'הגדרת כולל חדש';
  const buttonText = existingKollel ? 'שמירת שינויים' : 'שמירה והמשך';

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-8">
      <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-6">{title}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="kollelName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">שם הכולל <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            id="kollelName" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            className="mt-1 w-full block p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-indigo-500 focus:border-indigo-500" 
            placeholder="לדוגמה: כולל 'תורת חיים'"
          />
        </div>

        <div>
          <label htmlFor="managerName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">שם מנהל הכולל</label>
          <input 
            type="text" 
            id="managerName" 
            value={managerName} 
            onChange={e => setManagerName(e.target.value)} 
            className="mt-1 w-full block p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-indigo-500 focus:border-indigo-500" 
            placeholder="לדוגמה: ישראל ישראלי"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">טלפון ליצירת קשר</label>
          <input 
            type="tel" 
            id="phone" 
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
            className="mt-1 w-full block p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-indigo-500 focus:border-indigo-500" 
            placeholder="לדוגמה: 050-1234567"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-slate-300">כתובת הכולל</label>
          <input 
            type="text" 
            id="address" 
            value={address} 
            onChange={e => setAddress(e.target.value)} 
            className="mt-1 w-full block p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-indigo-500 focus:border-indigo-500" 
            placeholder="לדוגמה: רחוב התורה 1, ירושלים"
          />
        </div>
        
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <div className={`flex gap-4 ${onCancel ? 'justify-between' : 'justify-center'} pt-4`}>
          {onCancel && (
            <button type="button" onClick={onCancel} className="w-auto py-3 px-6 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
              ביטול
            </button>
          )}
          <button type="submit" className="w-full flex justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            {buttonText}
          </button>
        </div>
      </form>
    </div>
  );
};

export default KollelSetup;