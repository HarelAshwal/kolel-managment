import React, { useState, useEffect } from 'react';
import type { KollelDetails } from '../types';
import { getAllKollelsForAdmin } from '../services/api';

interface SuperAdminPanelProps {
    onSelectKollel: (kollel: KollelDetails) => void;
}

const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({ onSelectKollel }) => {
    const [allKollels, setAllKollels] = useState<KollelDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAllKollels = async () => {
            try {
                setLoading(true);
                const kollels = await getAllKollelsForAdmin();
                console.log('Super Admin: Fetched all kollels:', kollels);
                setAllKollels(kollels);
                setError(null);
            } catch (err) {
                console.error('Super Admin: Error fetching all kollels:', err);
                setError('שגיאה בטעינת כוללים. אנא נסה שנית.');
            } finally {
                setLoading(false);
            }
        };

        fetchAllKollels();
    }, []);

    const formatDate = (date: string | Date) => {
        return new Intl.DateTimeFormat('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">טוען כוללים...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                    <div className="text-red-800">
                        <h3 className="text-sm font-medium">שגיאה</h3>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            padding: '2rem',
            backgroundColor: '#f8f9fa',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e8e5f3 100%)'
        }}>
            {/* Super Admin Header Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #6f42c1 0%, #5a2d91 100%)',
                color: 'white',
                padding: '1.5rem 2rem',
                borderRadius: '12px',
                marginBottom: '2rem',
                boxShadow: '0 8px 16px rgba(111, 66, 193, 0.3)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                textAlign: 'center' as const
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '2rem' }}>👑</span>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
                            Super Admin Panel
                        </h1>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', opacity: 0.9 }}>
                            ניהול כל הכוללים במערכת • Manage All Kollels in System
                        </p>
                    </div>
                    <span style={{ fontSize: '2rem' }}>👑</span>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">
                            🛡️ פאנל מנהל מערכת - כל הכוללים
                        </h2>
                        <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                            Super Admin
                        </div>
                    </div>

                    {allKollels.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-400 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">אין כוללים במערכת</h3>
                            <p className="text-gray-500">עדיין לא נוצרו כוללים במערכת.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-sm text-gray-600 mb-4">
                                סה"כ כוללים במערכת: <span className="font-semibold">{allKollels.length}</span>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {allKollels.map((kollel) => (
                                    <div
                                        key={kollel.id}
                                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                                        onClick={() => onSelectKollel(kollel)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                                                {kollel.name}
                                            </h3>
                                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                                צפה
                                            </button>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center text-gray-600">
                                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.899a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {/* Fix: Property 'location' does not exist on type 'KollelDetails'. Use 'address' instead. */}
                                                {kollel.address}
                                            </div>

                                            {/* Owner Information - Only visible to super admin */}
                                            {(kollel as any).userId && (
                                                <div className="flex items-center text-gray-600">
                                                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    <span className="text-blue-600 font-medium">
                                                        {(kollel as any).userId?.name || (kollel as any).userId?.email}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center text-gray-600">
                                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2v-6a2 2 0 012-2z" />
                                                </svg>
                                                {kollel.totalStudents} תלמידים
                                            </div>

                                            {kollel.establishedDate && (
                                                <div className="flex items-center text-gray-600">
                                                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2v-6a2 2 0 012-2z" />
                                                    </svg>
                                                    נוסד ב{formatDate(kollel.establishedDate)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                {/* Fix: Property 'stipendSettings' does not exist on type 'KollelDetails'. Use 'settings' instead. */}
                                                <span>שכר יומי: ₪{kollel.settings?.dailyAmount || 0}</span>
                                                <span className={`px-2 py-1 rounded-full ${kollel.isActive
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {kollel.isActive ? 'פעיל' : 'לא פעיל'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; export default SuperAdminPanel;
