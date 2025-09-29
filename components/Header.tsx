import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogoutIcon } from './icons/LogoutIcon';
import { UserIcon } from './icons/UserIcon';

interface HeaderProps {
}

const Header: React.FC<HeaderProps> = () => {
    const { isAuthenticated, user, logout } = useAuth();

    return (
        <header className={`bg-white dark:bg-slate-800 shadow-md sticky top-0 z-40 ${user?.isSuperAdmin ? 'border-b-2 border-purple-500' : ''}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${user?.isSuperAdmin ? 'text-purple-600 dark:text-purple-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            מנהל כולל
                        </span>
                        {/* Small Super Admin Crown Indicator */}
                        {user?.isSuperAdmin && (
                            <span className="text-lg" title="מנהל מערכת">👑</span>
                        )}
                    </div>
                    {isAuthenticated && user && (
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-2 text-sm ${user.isSuperAdmin ? 'text-purple-600 dark:text-purple-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                <UserIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">
                                    {user.name || user.email}
                                </span>
                                {/* Small Super Admin Badge */}
                                {user.isSuperAdmin && (
                                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded-full font-semibold">
                                        מנהל
                                    </span>
                                )}
                            </div>

                            {/* Removed ניהול מערכת button for super admin */}

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