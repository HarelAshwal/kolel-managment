import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogoutIcon } from './icons/LogoutIcon';
import { UserIcon } from './icons/UserIcon';

const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">מנהל כולל</span>
          </div>
          {isAuthenticated && user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <UserIcon className="w-5 h-5" />
                <span className="hidden sm:inline">
                  {user.name || user.email}
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 p-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="התנתקות"
              >
                <LogoutIcon className="w-5 h-5" />
                <span className="hidden sm:inline">התנתקות</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
