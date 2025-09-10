import type { StipendResult, ScholarReportData } from '../types';

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
  const rows = result.details.map(d => [
    d.day,
    d.rawTime,
    d.hours.toFixed(2),
  ]);

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