
import React, { useState } from 'react';
import type { MonthlyData, KollelDetails, StipendResult } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { generateDetailedExcelReport } from '../services/exporter';

interface DetailedReportsPreviewProps {
    monthData: MonthlyData;
    kollelDetails: KollelDetails;
    onClose: () => void;
}

const DetailedReportsPreview: React.FC<DetailedReportsPreviewProps> = ({ monthData, kollelDetails, onClose }) => {
    const [activeTab, setActiveTab] = useState<'bonuses' | 'attendance' | 'exams' | 'payment'>('bonuses');
    const { results } = monthData;
    const { settings } = kollelDetails;

    const getBonusInfo = (result: StipendResult, searchName: string) => {
        const bonus = result.bonusDetails?.find(b => b.name.includes(searchName));
        return bonus ? { count: bonus.count, amount: bonus.totalAmount } : { count: 0, amount: 0 };
    };

    const renderBonusesTable = () => {
        const headers = [
            "שם האברך",
            ...settings.sedarim.flatMap(s => [`${s.name} - כמות`, `${s.name} - סה"כ`]),
            "סה\"כ בונוסים"
        ];
        
        return (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                    <tr>
                        {headers.map((h, i) => <th key={i} className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {results.map((r, idx) => {
                        let totalBonuses = 0;
                        return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{r.name}</td>
                                {settings.sedarim.map(s => {
                                    const info = getBonusInfo(r, s.name);
                                    totalBonuses += info.amount;
                                    return (
                                        <React.Fragment key={s.id}>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{info.count || '-'}</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{info.amount ? info.amount.toFixed(2) : '-'}</td>
                                        </React.Fragment>
                                    );
                                })}
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-indigo-600 dark:text-indigo-400">{totalBonuses.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    const renderAttendanceTable = () => {
        const headers = [
            "שם האברך", "ימי לימוד", "שעות תקן", "שעות בפועל", "שעות חיסור", "שעות מאושרות", "שעות לחישוב", "אחוז נוכחות"
        ];

        return (
             <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                    <tr>
                        {headers.map((h, i) => <th key={i} className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {results.map((r, idx) => {
                        const actual = r.totalHours || 0;
                        const approved = r.totalApprovedAbsenceHours || 0;
                        const required = r.requiredHours || 0;
                        const deficit = Math.max(0, required - (actual + approved));
                        return (
                             <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{r.name}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{r.workingDaysInMonth}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{required.toFixed(2)}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{actual.toFixed(2)}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-red-500">{deficit > 0.01 ? deficit.toFixed(2) : '-'}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">{approved > 0 ? approved.toFixed(2) : '-'}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{(actual + approved).toFixed(2)}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-slate-700 dark:text-slate-200">{(r.attendancePercentage || 0).toFixed(1)}%</td>
                             </tr>
                        )
                    })}
                </tbody>
             </table>
        );
    }

    const renderExamsTable = () => {
        const generalBonusTypes = settings.generalBonuses || [];
        const headers = [
            "שם האברך",
            ...generalBonusTypes.flatMap(b => [`${b.name} - כמות`, `${b.name} - סכום`]),
            "סה\"כ תוסxxx"
        ];

        return (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                    <tr>
                        {headers.map((h, i) => <th key={i} className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {results.map((r, idx) => {
                        let totalGeneral = 0;
                        return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{r.name}</td>
                                {generalBonusTypes.map(b => {
                                     const bonus = r.bonusDetails?.find(d => d.name.startsWith(b.name)); 
                                     const count = bonus ? bonus.count : 0;
                                     const amount = bonus ? bonus.totalAmount : 0;
                                     totalGeneral += amount;
                                     return (
                                        <React.Fragment key={b.id}>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{count || '-'}</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{amount ? amount.toFixed(2) : '-'}</td>
                                        </React.Fragment>
                                     );
                                })}
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-indigo-600 dark:text-indigo-400">{totalGeneral.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    const renderPaymentTable = () => {
        const headers = [
            "שם האברך", "מלגת בסיס", "בסיס לאחר חישוב", "סה\"כ ניכויים", "סה\"כ בונוס סדרים", "סה\"כ מבחנים/תוספות", "סה\"כ לתשלום"
        ];

        return (
             <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                    <tr>
                        {headers.map((h, i) => <th key={i} className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {results.map((r, idx) => {
                        const baseStipend = settings.baseStipendType === 'daily' 
                            ? (settings.baseStipend * (r.workingDaysInMonth || 0))
                            : settings.baseStipend;
                        const baseUsed = r.baseStipendUsed || baseStipend;
                        
                        let sederBonusesTotal = 0;
                        let generalBonusesTotal = 0;

                        (r.bonusDetails || []).forEach(b => {
                            const isSederBonus = settings.sedarim.some(s => b.name.includes(s.name));
                            if (isSederBonus) {
                                sederBonusesTotal += b.totalAmount;
                            } else {
                                generalBonusesTotal += b.totalAmount;
                            }
                        });

                        return (
                             <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{r.name}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{baseStipend.toFixed(2)}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{baseUsed.toFixed(2)}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-red-500">{(r.totalDeduction || 0).toFixed(2)}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">{sederBonusesTotal.toFixed(2)}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">{generalBonusesTotal.toFixed(2)}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-indigo-600 dark:text-indigo-400">{r.stipend.toFixed(2)}</td>
                             </tr>
                        )
                    })}
                </tbody>
             </table>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">תצוגה מקדימה - דוחות מפורטים ({monthData.monthYear})</h3>
                    <div className="flex gap-2">
                         <button onClick={() => generateDetailedExcelReport(monthData, kollelDetails)} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 text-sm font-medium shadow-sm transition-colors">
                            <DownloadIcon className="w-4 h-4" /> הורד אקסל
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><CloseIcon className="w-5 h-5 text-slate-500 dark:text-slate-400"/></button>
                    </div>
                </div>
                
                <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto bg-slate-50 dark:bg-slate-900/50">
                     {['bonuses', 'attendance', 'exams', 'payment'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors focus:outline-none ${activeTab === tab ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                        >
                            {tab === 'bonuses' && 'דו"ח בונוסים'}
                            {tab === 'attendance' && 'דו"ח נוכחות'}
                            {tab === 'exams' && 'דו"ח מבחנים וסיכומים'}
                            {tab === 'payment' && 'דו"ח תשלומים סופי'}
                        </button>
                     ))}
                </div>

                <div className="flex-1 overflow-auto p-0 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                    {activeTab === 'bonuses' && renderBonusesTable()}
                    {activeTab === 'attendance' && renderAttendanceTable()}
                    {activeTab === 'exams' && renderExamsTable()}
                    {activeTab === 'payment' && renderPaymentTable()}
                </div>
             </div>
        </div>
    );
};

export default DetailedReportsPreview;
