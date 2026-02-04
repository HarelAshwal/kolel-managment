
import type { StipendResult, ScholarReportData, StipendSettings, MonthlyData, KollelDetails } from '../types';

/**
 * Creates a CSV string from headers and rows.
 * @param headers An array of strings for the header row.
 * @param rows An array of arrays, where each inner array is a row.
 * @returns A string in CSV format.
 */
const createCsvContent = (headers: string[], rows: (string | number)[][]): string => {
  const headerRow = headers.join(',');
  const rowStrings = rows.map(row =>
    row.map(cell => {
      const stringCell = String(cell);
      // Escape commas and quotes
      if (stringCell.includes(',') || stringCell.includes('"')) {
        return `"${stringCell.replace(/"/g, '""')}"`;
      }
      return stringCell;
    }).join(',')
  );
  return `\uFEFF${[headerRow, ...rowStrings].join('\n')}`; // \uFEFF for UTF-8 BOM
};

/**
 * Triggers a file download in the browser.
 * @param filename The desired name of the file.
 * @param content The content of the file.
 * @param mimeType The MIME type of the file.
 */
const downloadFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Exports the summary stipend results to a CSV file.
 * @param results The array of stipend results.
 * @param kollelName The name of the Kollel for the filename.
 * @param monthYear The month and year string (e.g., "07/2024").
 */
export const exportSummaryToCsv = (results: StipendResult[], kollelName: string, monthYear: string | null) => {
  const headers = ['שם האברך', 'סה"כ שעות לימוד', 'מלגה לתשלום (ש"ח)'];
  const rows = results.map(r => [
    r.name,
    r.totalHours.toFixed(2),
    r.stipend.toFixed(2),
  ]);

  const csvContent = createCsvContent(headers, rows);
  const dateStr = monthYear 
    ? monthYear.replace('/', '-') 
    : new Date().toLocaleDateString('he-IL').replace(/\./g, '-');
  const filename = `סיכום מלגות - ${kollelName} - ${dateStr}.csv`;
  
  downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
};

/**
 * Exports the daily details for a single scholar to a CSV file.
 * @param result The stipend result object for a single scholar.
 */
export const exportDetailsToCsv = (result: StipendResult) => {
  if (!result.details || result.details.length === 0) {
    alert('אין פירוט יומי לייצוא עבור אברך זה.');
    return;
  }

  const headers = ['תאריך', 'זמן / סטטוס', 'שעות (עשרוני)'];
  let totalSum = 0;
  const rows = result.details.map(d => {
    // Fix: Explicitly type sum and h in reduce to avoid 'unknown' errors
    const dailyTotalHours = Object.values(d.sederHours).reduce((sum: number, h: number) => sum + h, 0);
    totalSum += dailyTotalHours;
    return [
        d.day,
        d.rawTime,
        dailyTotalHours.toFixed(2),
    ];
  });
  
  // Add total row
  rows.push(['', 'סה"כ שעות', totalSum.toFixed(2)]);

  const csvContent = createCsvContent(headers, rows);
  const date = new Date().toLocaleDateString('he-IL').replace(/\./g, '-');
  const filename = `פירוט יומי - ${result.name} - ${date}.csv`;

  downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
};

/**
 * Exports aggregated report data to a CSV file.
 * @param reportData The processed report data for scholars.
 */
export const exportReportToCsv = (reportData: ScholarReportData[]) => {
    const headers = ['שם האברך', 'סה"כ שעות', 'מספר חודשים', 'ממוצע שעות לחודש', 'אחוז נוכחות (%)'];
    const rows = reportData.map(r => [
      r.name,
      r.totalHours.toFixed(2),
      r.monthsCount,
      r.averageHoursPerMonth.toFixed(2),
      r.attendancePercentage.toFixed(2),
    ]);

    const csvContent = createCsvContent(headers, rows);
    const date = new Date().toLocaleDateString('he-IL').replace(/\./g, '-');
    const filename = `דוח נוכחות מסכם - ${date}.csv`;

    downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
};

/**
 * Generates a detailed multi-sheet Excel report containing Bonuses, Attendance, Exams, and Payment Summary.
 * @param monthData The data for a specific month.
 * @param kollelDetails The kollel settings and details.
 */
export const generateDetailedExcelReport = (monthData: MonthlyData, kollelDetails: KollelDetails) => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
        alert('ספריית אקסל לא נטענה. אנא נסה שוב.');
        return;
    }

    const { results, monthYear } = monthData;
    const { settings } = kollelDetails;
    const wb = XLSX.utils.book_new();
    const sheetTitleSuffix = ` - ${monthYear}`;

    // --- Helper to safely get bonus info ---
    const getBonusInfo = (result: StipendResult, searchName: string) => {
        // searchName is partial, e.g. "סדר א'"
        const bonus = result.bonusDetails?.find(b => b.name.includes(searchName));
        return bonus ? { count: bonus.count, amount: bonus.totalAmount } : { count: 0, amount: 0 };
    };

    // --- Sheet 1: Bonuses Report (דו"ח בונוסים) ---
    const bonusesHeader = [
        "שם האברך",
        ...settings.sedarim.flatMap(s => [`${s.name} - כמות`, `${s.name} - סה"כ`]),
        "סה\"כ בונוסים"
    ];
    
    const bonusesData = results.map(r => {
        const row: any[] = [r.name];
        let totalBonuses = 0;
        
        settings.sedarim.forEach(s => {
            // Logic to match bonus name from calculator.ts: `שמירת ${seder.name}`
            // We search for the seder name inside the bonus name
            const info = getBonusInfo(r, s.name);
            row.push(info.count || 0);
            row.push(info.amount || 0);
            totalBonuses += info.amount;
        });
        
        row.push(totalBonuses);
        return row;
    });

    const wsBonuses = XLSX.utils.aoa_to_sheet([[`דו"ח בונוסים${sheetTitleSuffix}`], bonusesHeader, ...bonusesData]);
    XLSX.utils.book_append_sheet(wb, wsBonuses, "בונוסים");


    // --- Sheet 2: Attendance Report (דו"ח נוכחות) ---
    const attendanceHeader = [
        "שם האברך",
        "ימי לימוד",
        "שעות תקן",
        "שעות בפועל",
        "שעות חיסור",
        "שעות מאושרות",
        "שעות לחישוב (בפועל+מאושר)",
        "אחוז נוכחות"
    ];

    const attendanceData = results.map(r => {
        const actual = r.totalHours || 0;
        const approved = r.totalApprovedAbsenceHours || 0;
        const required = r.requiredHours || 0;
        // Deficit in calculation usually implies (Required - Credited). Credited = Actual + Approved.
        // So Deficit = Required - (Actual + Approved).
        // r.hourDeficit is typically this value.
        const deficit = Math.max(0, required - (actual + approved));
        
        return [
            r.name,
            r.workingDaysInMonth || 0,
            required.toFixed(2),
            actual.toFixed(2),
            deficit.toFixed(2),
            approved.toFixed(2),
            (actual + approved).toFixed(2),
            `${(r.attendancePercentage || 0).toFixed(1)}%`
        ];
    });

    const wsAttendance = XLSX.utils.aoa_to_sheet([[`דו"ח נוכחות${sheetTitleSuffix}`], attendanceHeader, ...attendanceData]);
    XLSX.utils.book_append_sheet(wb, wsAttendance, "נוכחות");


    // --- Sheet 3: Exams & Summaries (דו"ח סיכומים ומבחנים) ---
    // Identify General Bonus Columns
    const generalBonusTypes = settings.generalBonuses || [];
    const examsHeader = [
        "שם האברך",
        ...generalBonusTypes.flatMap(b => [`${b.name} - כמות`, `${b.name} - סכום`]),
        "סה\"כ תוספות"
    ];

    const examsData = results.map(r => {
        const row: any[] = [r.name];
        let totalGeneral = 0;

        generalBonusTypes.forEach(b => {
             // Exact name match or partial if cleaner
             const bonus = r.bonusDetails?.find(d => d.name.startsWith(b.name)); 
             const count = bonus ? bonus.count : 0;
             const amount = bonus ? bonus.totalAmount : 0;
             row.push(count);
             row.push(amount);
             totalGeneral += amount;
        });

        row.push(totalGeneral);
        return row;
    });

    const wsExams = XLSX.utils.aoa_to_sheet([[`דו"ח מבחנים${sheetTitleSuffix}`], examsHeader, ...examsData]);
    XLSX.utils.book_append_sheet(wb, wsExams, "מבחנים");


    // --- Sheet 4: Payment Summary (סה"כ לתשלום) ---
    const paymentHeader = [
        "שם האברך",
        "מלגת בסיס",
        "בסיס לאחר חישוב",
        "סה\"כ ניכויים",
        "סה\"כ בונוס סדרים",
        "סה\"כ מבחנים/תוספות",
        "סה\"כ לתשלום"
    ];

    const paymentData = results.map(r => {
        const baseStipend = settings.baseStipendType === 'daily' 
            ? (settings.baseStipend * (r.workingDaysInMonth || 0))
            : settings.baseStipend;
            
        const baseUsed = r.baseStipendUsed || baseStipend;
        
        // Split bonuses into Sedarim vs General
        let sederBonusesTotal = 0;
        let generalBonusesTotal = 0;

        (r.bonusDetails || []).forEach(b => {
            // Check if this bonus name relates to a seder
            const isSederBonus = settings.sedarim.some(s => b.name.includes(s.name));
            if (isSederBonus) {
                sederBonusesTotal += b.totalAmount;
            } else {
                generalBonusesTotal += b.totalAmount;
            }
        });

        return [
            r.name,
            baseStipend,
            baseUsed.toFixed(2),
            (r.totalDeduction || 0).toFixed(2),
            sederBonusesTotal.toFixed(2),
            generalBonusesTotal.toFixed(2),
            r.stipend.toFixed(2)
        ];
    });

    const wsPayment = XLSX.utils.aoa_to_sheet([[`סה"כ לתשלום${sheetTitleSuffix}`], paymentHeader, ...paymentData]);
    XLSX.utils.book_append_sheet(wb, wsPayment, "תשלומים");

    // RTL for all sheets
    wb.Sheets["בונוסים"]['!cols'] = Array(bonusesHeader.length).fill({ wch: 15 });
    wb.Sheets["בונוסים"]['!dir'] = 'rtl';
    
    wb.Sheets["נוכחות"]['!cols'] = Array(attendanceHeader.length).fill({ wch: 15 });
    wb.Sheets["נוכחות"]['!dir'] = 'rtl';

    wb.Sheets["מבחנים"]['!cols'] = Array(examsHeader.length).fill({ wch: 15 });
    wb.Sheets["מבחנים"]['!dir'] = 'rtl';

    wb.Sheets["תשלומים"]['!cols'] = Array(paymentHeader.length).fill({ wch: 15 });
    wb.Sheets["תשלומים"]['!dir'] = 'rtl';

    const cleanName = kollelDetails.name.replace(/[^\u0590-\u05FF\w\s-]/g, '');
    XLSX.writeFile(wb, `דוחות מפורטים - ${cleanName} - ${monthYear.replace('/', '-')}.xlsx`);
};
