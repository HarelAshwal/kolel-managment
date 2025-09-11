import type { StipendResult, DailyDetail, KollelDetails, ParseResult } from '../types';

/**
 * Converts a time string like "HH:mm" to a decimal number of hours.
 * Returns 0 if format is invalid.
 * @param timeStr The time string to convert.
 * @returns Total hours as a decimal.
 */
const timeStringToDecimalHours = (timeStr: string): number => {
    if (!timeStr || !/^\d{1,3}:\d{2}$/.test(timeStr.trim())) { // Allow more than 99 hours, e.g., 120:30
        return 0;
    }
    const [hours, minutes] = timeStr.trim().split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
        return 0;
    }
    return hours + minutes / 60;
};

/**
 * Processes a single sheet from the XLSX file, corresponding to one scholar.
 * @param rows An array of arrays representing the sheet.
 * @param sheetName The name of the sheet, which is the scholar's name.
 * @returns An object with the scholar's name, attendance details, and the month/year.
 */
const processSingleScholarSheet = (rows: (string|number)[][], sheetName: string): { name: string; details: DailyDetail[]; monthYear: string } => {
    const name = sheetName;
    let monthYear = '';
    const details: DailyDetail[] = [];

    const monthYearRegex = /(\d{2}\/\d{2,4})/;
    let dataStartRow = -1;
    let dayColIndex = -1;
    let totalHoursColIndex = -1;

    // 1. Find metadata (month), column indices, and the start of data
    for (let i = 0; i < Math.min(rows.length, 15); i++) { // Scan first 15 rows
        const row = rows[i];
        if (!row) continue;

        // Find month/year from any cell in the top rows
        if (!monthYear) {
            for (const cell of row) {
                const match = String(cell).match(monthYearRegex);
                if (match && match[1]) {
                    let capturedDate = match[1];
                    const dateParts = capturedDate.split('/');
                    if (dateParts.length === 2 && dateParts[1].length === 2) {
                        monthYear = `${dateParts[0]}/20${dateParts[1]}`;
                    } else {
                        monthYear = capturedDate;
                    }
                    break;
                }
            }
        }
        
        // Find column indices
        if (dayColIndex === -1) {
            dayColIndex = row.findIndex(cell => String(cell).trim() === 'יום');
        }
        if (totalHoursColIndex === -1) {
            totalHoursColIndex = row.findIndex(cell => String(cell).trim() === 'סה"כ');
        }

        // Find the start of the actual data by looking for a date pattern in the "day" column
        if (dataStartRow === -1 && dayColIndex !== -1 && String(row[dayColIndex]).match(/\d{1,2}\/\d{1,2}/)) {
            dataStartRow = i;
        }
    }

    if (!monthYear) {
         throw new Error(`לא ניתן היה למצוא את חודש ושנת הדוח עבור ${name}.`);
    }
    if (dayColIndex === -1 || totalHoursColIndex === -1) {
        throw new Error(`לא ניתן היה למצוא את העמודות "יום" ו"סה\\"כ" עבור ${name}.`);
    }
    if (dataStartRow === -1) {
        throw new Error(`לא ניתן היה למצוא את שורת הנתונים הראשונה עבור ${name}.`);
    }

    // 2. Extract daily attendance data from the table
    for (let i = dataStartRow; i < rows.length; i++) {
        const row = rows[i];
        
        // Stop if we hit a separator or a summary row (where the "day" column might have 'סה"כ')
        if (!row || !row[dayColIndex] || String(row[dayColIndex]).trim().startsWith('--') || String(row[dayColIndex]).trim() === 'סה"כ') {
            continue; 
        }
        
        const dayAndDateStr = String(row[dayColIndex] || '').trim();
        const totalTimeStr = String(row[totalHoursColIndex] || '').trim();
        
        const isDayOff = Object.values(row).some(cell => String(cell).trim() === 'חופש');
        const rawTime = isDayOff ? "חופש" : totalTimeStr;
        
        if (dayAndDateStr && totalTimeStr && totalTimeStr !== '-' && totalTimeStr !== '') {
             const hours = timeStringToDecimalHours(totalTimeStr);
             details.push({ day: dayAndDateStr, hours, rawTime: totalTimeStr });
        } else if (dayAndDateStr) { // Handle days off or zero-hour days
             details.push({ day: dayAndDateStr, hours: 0, rawTime: rawTime || '-' });
        }
    }
    
    return { name, details, monthYear };
};


/**
 * Parses a multi-sheet XLSX ArrayBuffer where each sheet is a scholar's report,
 * calculates study hours, and computes stipends.
 * @param xlsxBuffer The raw ArrayBuffer of the XLSX file.
 * @param kollelDetails The full kollel details including settings.
 * @returns A ParseResult object.
 */
export const parseXlsxAndCalculateStipends = (xlsxBuffer: ArrayBuffer, kollelDetails: KollelDetails): ParseResult => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
        throw new Error('ספריית עיבוד קבצי האקסל (XLSX) לא נטענה. אנא בדוק את חיבור האינטרנט שלך, נסה לרענן את הדף, או השבת חוסמי פרסומות שעלולים להפריע.');
    }

    const workbook = XLSX.read(xlsxBuffer, { type: 'array' });
    const sheetNames = workbook.SheetNames;

    if (!sheetNames || sheetNames.length === 0) {
        throw new Error('קובץ ה-XLSX לא מכיל גיליונות.');
    }

    const allResults: StipendResult[] = [];
    let commonMonthYear: string | null = null;

    for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;

        const rows: (string|number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

        // Skip empty or very small sheets that are unlikely to contain data
        if (rows.length < 10) continue;

        try {
            const scholarData = processSingleScholarSheet(rows, sheetName);
            
            if (!commonMonthYear && scholarData.monthYear) {
                commonMonthYear = scholarData.monthYear;
            } else if (scholarData.monthYear && commonMonthYear !== scholarData.monthYear) {
                // This is a warning, not a fatal error. We'll proceed but let the user know.
                console.warn(`חודש לא תואם בגיליון "${sheetName}". מצופה ${commonMonthYear}, נמצא ${scholarData.monthYear}.`);
            }
            
            const totalHours = scholarData.details.reduce((sum, d) => sum + d.hours, 0);

            const activeDays = scholarData.details.filter(d => d.hours > 0).length;
            const requiredHours = activeDays * kollelDetails.settings.dailyHoursTarget;
            const hourDeficit = Math.max(0, requiredHours - totalHours);
            const totalDeduction = hourDeficit * kollelDetails.settings.deductionPerHour;
            const finalStipend = kollelDetails.settings.baseStipend - totalDeduction;

            allResults.push({
                name: scholarData.name,
                totalHours,
                stipend: Math.max(0, finalStipend),
                details: scholarData.details,
            });

        } catch (e) {
            console.warn(`שגיאה בעיבוד גיליון "${sheetName}": ${(e as Error).message}. מדלג על גיליון זה.`);
        }
    }
    
    if (allResults.length === 0) {
        throw new Error('לא נמצאו נתוני אברכים תקינים בקובץ. ודא שהקובץ בפורמט הנכון וכל גיליון מכיל שם אברך ונתוני נוכחות.');
    }

    if (!commonMonthYear) {
        throw new Error('לא ניתן היה לקבוע את חודש הדוח מאף אחד מהגיליונות.');
    }

    allResults.sort((a, b) => a.name.localeCompare(b.name, 'he'));

    return { monthYear: commonMonthYear, results: allResults };
};