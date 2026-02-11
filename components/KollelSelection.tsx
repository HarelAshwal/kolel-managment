
import React, { useRef } from 'react';
import type { KollelDetails } from '../types';
import { BuildingIcon } from './icons/BuildingIcon';
import { ShekelIcon } from './icons/ShekelIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { EditIcon } from './icons/EditIcon';
import { UserIcon } from './icons/UserIcon';
import { DatabaseIcon } from './icons/DatabaseIcon'; // New icon for backup
import { UploadIcon } from './icons/UploadIcon';
import { useLanguage } from '../contexts/LanguageContext';
import { exportFullKollel, importFullKollel } from '../services/api';

interface KollelSelectionProps {
  kollels: KollelDetails[];
  onSelect: (kollelId: string) => void;
  onDelete: (kollelId: string) => void;
  onAdd: () => void;
  onEdit: (kollelId: string) => void;
  onImport?: () => void; // New prop to refresh data after import
  isSuperAdmin?: boolean;
}

const KollelSelection: React.FC<KollelSelectionProps> = ({ kollels, onSelect, onDelete, onAdd, onEdit, onImport, isSuperAdmin }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug logging for super admin
  if (isSuperAdmin) {
    console.log('🔍 KollelSelection: Super admin mode, kollels data:', kollels);
    kollels.forEach((kollel, index) => {
      console.log(`🔍 Kollel ${index + 1}:`, {
        name: kollel.name,
        userId: kollel.userId,
        userIdType: typeof kollel.userId,
        hasUserId: !!kollel.userId
      });
    });
  }

  const getSubtitle = () => {
      if (isSuperAdmin) {
          return t('select_kollel_admin_subtitle').replace('{0}', kollels.length.toString());
      }
      return t('select_kollel_subtitle');
  };

  const handleBackup = async (kollelId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
          const data = await exportFullKollel(kollelId);
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
          const downloadAnchorNode = document.createElement('a');
          downloadAnchorNode.setAttribute("href", dataStr);
          downloadAnchorNode.setAttribute("download", `backup_${data.kollel.name}_${new Date().toISOString().slice(0, 10)}.json`);
          document.body.appendChild(downloadAnchorNode);
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
          // Optional: Show success toast
          // alert(t('backup_success')); 
      } catch (err) {
          console.error("Backup failed", err);
          alert(t('error'));
      }
  };

  const handleImportClick = () => {
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
          fileInputRef.current.click();
      }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const content = e.target?.result;
              if (typeof content === 'string') {
                  const backupData = JSON.parse(content);
                  if (!backupData.kollel || !backupData.data) throw new Error("Invalid backup file");
                  
                  await importFullKollel(backupData);
                  alert(t('restore_success'));
                  if (onImport) onImport();
              }
          } catch (err) {
              console.error('Failed to import backup', err);
              alert(t('error'));
          }
      };
      reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-8">
      <h2 className="text-3xl font-bold text-center mb-2 text-slate-900 dark:text-white">
        {t('select_kollel_title')}
      </h2>
      <p className="text-center text-slate-500 dark:text-slate-400 mb-8">
        {getSubtitle()}
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
                {/* Always show Gmail user who created the kolel */}
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                    <span>📧</span>
                    <span>
                      {t('created_by')}{' '}
                      {kollel.userId
                        ? typeof kollel.userId === 'object'
                          ? kollel.userId.email || kollel.userId.name || 'N/A'
                          : kollel.userId
                        : 'Legacy'}
                    </span>
                  </div>
                  {Array.isArray(kollel.sharedWith) && kollel.sharedWith.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/40 px-2 py-1 rounded">
                      <span>🤝</span>
                      <span>{t('shared_with')}</span>
                      <span>{kollel.sharedWith.join(', ')}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                  <ShekelIcon className="w-4 h-4" />
                  <span>{t('base_amount')} {kollel.settings.baseStipend} ₪</span>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={(e) => handleBackup(kollel.id, e)}
                  className="p-2 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                  title={t('backup_kollel')}
                >
                  <DatabaseIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onEdit(kollel.id)}
                  className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  title={t('edit')}
                >
                  <EditIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDelete(kollel.id)}
                  className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title={t('delete')}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onSelect(kollel.id)}
                  className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  {t('select_btn')}
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">{t('no_kollels')}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onAdd}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300"
          >
            <PlusIcon className="w-5 h-5" />
            {t('add_new_kollel')}
          </button>
          
          <button
            onClick={handleImportClick}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none transition-colors duration-300"
          >
            <UploadIcon className="w-5 h-5" />
            {t('restore_kollel')}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".json"
          />
      </div>
    </div>
  );
};

export default KollelSelection;
