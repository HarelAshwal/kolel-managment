import type { StipendResult, DailyDetail, KollelDetails, ParseResult } from '../types';

// Add declaration for the XLSX library loaded via script tag
declare var XLSX: any;

/**
 * Converts a time string like "HH:mm" to a decimal number of hours.
 * Returns 0 if format is invalid.
 * @param timeStr The time string to convert.
 * @returns Total hours as a decimal.
 */
const timeStringToDecimalHours = (timeStr: string): number => {
    if (!timeStr || !/^\d{1,2}:\d{2}$/.test(timeStr)) {
        return 0;
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
        return 0;
    }
    return hours + minutes / 60;
};

/**
 * Converts a monthly hours string (HHH:mm) to a decimal number.
 * @param timeStr The time string to convert.
 * @returns Total hours as a decimal.
 */
const monthlyHoursToDecimal = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length !== 2) {
        throw new Error(`פורמט שעות חודשי לא תקין: "${timeStr}".`);
    }
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) {
        throw new Error(`פורמט שעות חודשי לא תקין: "${timeStr}".`);
    }
    return hours + minutes / 60;
};


/**
 * Processes rows from a monthly summary report using the advanced stipend settings.
 * @param rows An array of arrays representing the sheet.
 * @param kollelDetails The full kollel details including settings.
 * @returns A ParseResult object containing the month/year and stipend results.
 */
const processMonthlySummaryRows = (rows: (string|number)[][], kollelDetails: KollelDetails): ParseResult => {
    let headerIndex = -1;
    let nameColIndex = -1;
    let totalHoursColIndex = -1;
    let monthYear = '';
    // This regex looks for "חודש" (month) followed by a date like 06/25 or 07/2024
    const monthYearRegex = /(?:חודש)\s*(\d{2}\/\d{2,4})/;

    // Find the month/year in the first few rows
    for (let i = 0; i < 5 && i < rows.length; i++) {
        const row = rows[i];
        if (row) {
            // Search for the pattern in any cell of the row
            for (const cell of row) {
                if (cell) {
                    const match = String(cell).match(monthYearRegex);
                    if (match && match[1]) {
                        let capturedDate = match[1];
                        const dateParts = capturedDate.split('/');
                        // Handle MM/YY format by converting to MM/20YY
                        if (dateParts.length === 2 && dateParts[1].length === 2) {
                            monthYear = `${dateParts[0]}/20${dateParts[1]}`;
                        } else {
                            monthYear = capturedDate;
                        }
                        break; // Exit inner loop once found
                    }
                }
            }
        }
        if (monthYear) {
            break; // Exit outer loop once found
        }
    }

    if (!monthYear) {
        throw new Error('לא ניתן היה למצוא את חודש ושנת הדוח בכותרת הקובץ (לדוגמה: "חודש 06/25"). ודא שהכותרת קיימת באחת מ-5 השורות הראשונות של הקובץ.');
    }

    // Find the header row and column indices
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        
        const nameIndex = row.findIndex(cell => String(cell).trim() === 'שם עובד');
        const hoursIndex = row.findIndex(cell => String(cell).replace(/\r?\n/g, ' ').trim() === 'שעות בחודש');

        if (nameIndex !== -1 && hoursIndex !== -1) {
            headerIndex = i;
            nameColIndex = nameIndex;
            totalHoursColIndex = hoursIndex;
            break;
        }
    }

    if (headerIndex === -1) {
        throw new Error('לא ניתן היה למצוא את הכותרות "שם עובד" ו"שעות בחודש" בקובץ. ודא שהקובץ הוא דוח סיכום חודשי תקין.');
    }
    
    const headerRow = rows[headerIndex];
    const results: StipendResult[] = [];

    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length <= Math.max(nameColIndex, totalHoursColIndex)) {
            continue;
        }

        const name = String(row[nameColIndex] || '').trim();
        const totalHoursStr = String(row[totalHoursColIndex] || '').trim();

        if (!name || !totalHoursStr) {
            continue;
        }

        const details: DailyDetail[] = [];
        const detailStartCol = Math.min(nameColIndex, totalHoursColIndex) + 1;
        const detailEndCol = Math.max(nameColIndex, totalHoursColIndex);

        // Iterate through day columns between name and total hours
        for (let j = detailStartCol; j < detailEndCol; j++) {
            const dayHeader = String(headerRow[j] || '').trim();
            const dailyHoursValue = String(row[j] || '').trim();
            if (dayHeader && dailyHoursValue) {
                const hours = timeStringToDecimalHours(dailyHoursValue);
                details.push({ day: dayHeader, hours, rawTime: dailyHoursValue });
            }
        }

        try {
            const totalHours = monthlyHoursToDecimal(totalHoursStr);
            if (isNaN(totalHours)) continue;

            const activeDays = details.filter(d => d.hours > 0).length;
            const requiredHours = activeDays * kollelDetails.settings.dailyHoursTarget;
            const hourDeficit = Math.max(0, requiredHours - totalHours);
            const totalDeduction = hourDeficit * kollelDetails.settings.deductionPerHour;
            const finalStipend = kollelDetails.settings.baseStipend - totalDeduction;
            
            results.push({
                name,
                totalHours,
                stipend: Math.max(0, finalStipend), // Stipend can't be negative
                details,
            });
        } catch (e) {
            if (e instanceof Error) {
                console.warn(`מדלג על שורה עבור "${name}" עקב פורמט שעות לא תקין: "${totalHoursStr}" (${e.message})`);
            } else {
                console.warn(`מדלג על שורה עבור "${name}" עקב שגיאה לא ידועה.`);
            }
        }
    }

    if (results.length === 0) {
      throw new Error('לא נמצאו רשומות תקינות בקובץ סיכום חודשי.');
    }

    results.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    return { monthYear, results };
}

/**
 * Universal parser entry point. Detects file type and processes accordingly.
 * @param rows The data rows from the file.
 * @param kollelDetails The full kollel details including settings.
 * @returns A ParseResult object.
 */
const processAttendanceRows = (rows: (string|number)[][], kollelDetails: KollelDetails): ParseResult => {
    // Detection logic: Check for "דוח סיכום שעות" in the first 5 rows to identify a monthly report.
    const isMonthlyReport = rows.slice(0, 5).some(row => 
        row && row.some(cell => cell && String(cell).includes('דוח סיכום שעות'))
    );

    if (isMonthlyReport) {
        return processMonthlySummaryRows(rows, kollelDetails);
    } else {
        throw new Error('יש להשתמש בדוח סיכום שעות חודשי בלבד. פורמטים אחרים אינם נתמכים.');
    }
};

/**
 * Parses an XLSX ArrayBuffer, calculates study hours, and computes stipends.
 * @param xlsxBuffer The raw ArrayBuffer of the XLSX file.
 * @param kollelDetails The full kollel details including settings.
 * @returns A ParseResult object.
 */
export const parseXlsxAndCalculateStipends = (xlsxBuffer: ArrayBuffer, kollelDetails: KollelDetails): ParseResult => {
  const workbook = XLSX.read(xlsxBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
      throw new Error('קובץ ה-XLSX לא מכיל גיליונות.');
  }
  const worksheet = workbook.Sheets[sheetName];
  const rows: (string|number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

  return processAttendanceRows(rows, kollelDetails);
}