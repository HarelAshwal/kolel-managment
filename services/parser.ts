import type { StipendResult, DailyDetail, KollelDetails, ParseResult } from '../types';

/**
 * Converts a time string like "HH:mm" or "*HH:mm" to a decimal number of hours.
 * Returns 0 if format is invalid.
 * @param timeStr The time string to convert.
 * @returns Total hours as a decimal.
 */
const timeStringToDecimalHours = (timeStr: string): number => {
    if (!timeStr) return 0;
    const cleanedTimeStr = timeStr.trim().replace('*', ''); // Clean the '*'
    if (!/^\d{1,3}:\d{2}$/.test(cleanedTimeStr)) {
        return 0;
    }
    const [hours, minutes] = cleanedTimeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
        return 0;
    }
    return hours + minutes / 60;
};

/**
 * Processes a single sheet from the XLSX file, corresponding to one scholar.
 * It now parses multiple entry/exit pairs per day and considers Seder times.
 * @param rows An array of arrays representing the sheet.
 * @param sheetName The name of the sheet, which is the scholar's name.
 * @param sedarim An array of Seder time ranges.
 * @returns An object with the scholar's name, attendance details, and the month/year.
 */
const processSingleScholarSheet = (
    rows: (string|number)[][], 
    sheetName: string,
    sedarim: { start: number, end: number }[]
): { name: string; details: DailyDetail[]; monthYear: string } => {
    const name = sheetName;
    let monthYear = '';
    const details: DailyDetail[] = [];
    const monthYearRegex = /(\d{2}\/\d{2,4})/;

    // 1. Find month/year from top rows
    for (let i = 0; i < 5; i++) {
        if (rows[i]) {
            for (const cell of rows[i]) {
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
        if (monthYear) break;
    }
    if (!monthYear) {
        throw new Error(`לא ניתן היה למצוא את חודש ושנת הדוח עבור ${name}.`);
    }
    
    // 2. Find header row and column indices
    let headerRowIndex = -1;
    let dayColIndex = -1;
    const entryExitPairs: { entry: number; exit: number }[] = [];

    for (let i = 0; i < 15; i++) {
        const row = rows[i];
        if (row && row.some(c => String(c).trim() === 'יום') && row.some(c => String(c).trim() === 'כניסה')) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        throw new Error(`לא ניתן היה למצוא את שורת הכותרות עם "יום" ו"כניסה" עבור ${name}.`);
    }

    const headerRow = rows[headerRowIndex];
    dayColIndex = headerRow.findIndex(cell => String(cell).trim() === 'יום');

    const entryIndices = headerRow.map((c, i) => String(c).trim() === 'כניסה' ? i : -1).filter(i => i !== -1);
    const exitIndices = headerRow.map((c, i) => String(c).trim() === 'יציאה' ? i : -1).filter(i => i !== -1);
    const usedExitIndices = new Set<number>();

    entryIndices.forEach(entryIndex => {
        let bestExitIndex = -1;
        let minDistance = Infinity;
        exitIndices.forEach(exitIndex => {
            if (!usedExitIndices.has(exitIndex) && exitIndex > entryIndex) {
                const distance = exitIndex - entryIndex;
                if (distance < minDistance) {
                    minDistance = distance;
                    bestExitIndex = exitIndex;
                }
            }
        });
        if (bestExitIndex !== -1) {
            entryExitPairs.push({ entry: entryIndex, exit: bestExitIndex });
            usedExitIndices.add(bestExitIndex);
        }
    });
    entryExitPairs.sort((a, b) => a.entry - b.entry);

    if (dayColIndex === -1 || entryExitPairs.length === 0) {
        throw new Error(`לא ניתן היה למצוא את עמודת "יום" או זוגות "כניסה"/"יציאה" עבור ${name}.`);
    }
    
    // 3. Find data start row
    let dataStartRow = -1;
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        if (rows[i] && String(rows[i][dayColIndex]).match(/\d{1,2}\/\d{1,2}/)) {
            dataStartRow = i;
            break;
        }
    }
    if (dataStartRow === -1) {
        throw new Error(`לא ניתן היה למצוא את שורת הנתונים הראשונה עבור ${name}.`);
    }

    // 4. Extract daily data
    for (let i = dataStartRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[dayColIndex] || String(row[dayColIndex]).trim().startsWith('--') || String(row[dayColIndex]).trim() === 'סה"כ') {
            continue;
        }

        const dayAndDateStr = String(row[dayColIndex] || '').trim();
        const isDayOff = Object.values(row).some(cell => String(cell).trim() === 'חופש');

        if (isDayOff) {
            details.push({ day: dayAndDateStr, hours: 0, rawTime: 'חופש' });
            continue;
        }
        
        let dailyTotalHours = 0;
        let dailyOutOfSederHours = 0;
        const rawTimeParts: string[] = [];

        for (const pair of entryExitPairs) {
            const entryTimeStr = String(row[pair.entry] || '').trim();
            const exitTimeStr = String(row[pair.exit] || '').trim();

            if (entryTimeStr && exitTimeStr && entryTimeStr !== '-' && exitTimeStr !== '') {
                const entryHours = timeStringToDecimalHours(entryTimeStr);
                const exitHours = timeStringToDecimalHours(exitTimeStr);

                if (exitHours > entryHours) {
                    const originalDuration = exitHours - entryHours;
                    let validDuration = 0;
                    
                    for (const seder of sedarim) {
                        const intersectionStart = Math.max(entryHours, seder.start);
                        const intersectionEnd = Math.min(exitHours, seder.end);
                        if (intersectionEnd > intersectionStart) {
                            validDuration += (intersectionEnd - intersectionStart);
                        }
                    }
                    dailyTotalHours += validDuration;
                    dailyOutOfSederHours += (originalDuration - validDuration);
                    rawTimeParts.push(`${entryTimeStr}-${exitTimeStr}`);
                }
            }
        }
        
        if (dayAndDateStr) {
            details.push({ 
                day: dayAndDateStr, 
                hours: dailyTotalHours, 
                rawTime: dailyTotalHours + dailyOutOfSederHours > 0 ? rawTimeParts.join(' | ') : '-',
                outOfSederHours: dailyOutOfSederHours > 0.01 ? dailyOutOfSederHours : undefined,
            });
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

    const { settings } = kollelDetails;
    const timeToDecimal = (timeStr: string): number => {
        if (!/^\d{1,2}:\d{2}$/.test(timeStr)) return NaN;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours + minutes / 60;
    };
    const sedarim = [
        { start: timeToDecimal(settings.sederA_start), end: timeToDecimal(settings.sederA_end) },
        { start: timeToDecimal(settings.sederB_start), end: timeToDecimal(settings.sederB_end) }
    ].filter(s => !isNaN(s.start) && !isNaN(s.end) && s.end > s.start);

    const allResults: StipendResult[] = [];
    let commonMonthYear: string | null = null;

    for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;

        const rows: (string|number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

        if (rows.length < 10) continue;

        try {
            const scholarData = processSingleScholarSheet(rows, sheetName, sedarim);
            
            if (!commonMonthYear && scholarData.monthYear) {
                commonMonthYear = scholarData.monthYear;
            } else if (scholarData.monthYear && commonMonthYear !== scholarData.monthYear) {
                console.warn(`חודש לא תואם בגיליון "${sheetName}". מצופה ${commonMonthYear}, נמצא ${scholarData.monthYear}.`);
            }
            
            const totalValidHours = scholarData.details.reduce((sum, d) => sum + d.hours, 0);
            const totalOutOfSederHours = scholarData.details.reduce((sum, d) => sum + (d.outOfSederHours || 0), 0);
            const activeDays = scholarData.details.filter(d => d.hours > 0).length;
            const requiredHours = activeDays * settings.dailyHoursTarget;
            const hourDeficit = Math.max(0, requiredHours - totalValidHours);
            const totalDeduction = hourDeficit * settings.deductionPerHour;
            const finalStipend = settings.baseStipend - totalDeduction;

            allResults.push({
                name: scholarData.name,
                totalHours: totalValidHours,
                stipend: Math.max(0, finalStipend),
                details: scholarData.details,
                totalOutOfSederHours,
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