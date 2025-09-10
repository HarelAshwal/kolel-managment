import React from 'react';
import type { KollelDetails } from '../types';
import { BuildingIcon } from './icons/BuildingIcon';
import { ShekelIcon } from './icons/ShekelIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { EditIcon } from './icons/EditIcon';
import { UserIcon } from './icons/UserIcon';


interface KollelSelectionProps {
  kollels: KollelDetails[];
  onSelect: (kollelId: string) => void;
  onDelete: (kollelId: string) => void;
  onAdd: () => void;
  onEdit: (kollelId: string) => void;
}

const KollelSelection: React.FC<KollelSelectionProps> = ({ kollels, onSelect, onDelete, onAdd, onEdit }) => {
  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-8">
      <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-2">בחירת כולל</h2>
      <p className="text-center text-slate-500 dark:text-slate-400 mb-8">
        יש לבחור את הכולל אותו ברצונך לנהל.
      </p>

      <div className="space-y-4 mb-8 max-h-96 overflow-y-auto pr-2">
        {kollels.length > 0 ? (
          kollels.map((kollel) => (
            <div key={kollel.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-between gap-4">
                <div className="flex-grow">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                        <BuildingIcon className="w-5 h-5 text-slate-500" />
                        <span>{kollel.name}</span>
                    </div>
                    {kollel.managerName && (
                       <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                          <UserIcon className="w-4 h-4" />
                          <span>{kollel.managerName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                        <ShekelIcon className="w-4 h-4" />
                        <span>סכום בסיס: {kollel.settings.baseStipend} ש"ח</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                    <button 
                        onClick={() => onEdit(kollel.id)} 
                        className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors" 
                        title="ערוך פרטי כולל"
                    >
                        <EditIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => onDelete(kollel.id)} 
                        className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors" 
                        title="מחק כולל"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => onSelect(kollel.id)}
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        בחירה
                    </button>
                </div>
            </div>
          ))
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">לא נמצאו כוללים שמורים. יש להוסיף כולל חדש.</p>
        )}
      </div>

      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300"
      >
        <PlusIcon className="w-5 h-5"/>
        הוספת כולל חדש
      </button>
    </div>
  );
};

export default KollelSelection;