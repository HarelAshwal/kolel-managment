import type { StipendResult, DailyDetail, KollelDetails, ParseResult, StipendSettings, Seder } from '../types';
import { calculateStipendForScholar } from './calculator';

const timeStringToDecimalHours = (timeStr: string): number => {
    if (!timeStr) return 0;
    const cleanedTimeStr = timeStr.trim().replace('*', '');
    if (!/^\d{1,3}:\d{2}$/.test(cleanedTimeStr)) return 0;
    const [hours, minutes] = cleanedTimeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours + minutes / 60;
};

const fourDigitTimeToDecimal = (time: string | number): number => {
    // This function will now robustly parse numeric time values, including floats from Excel.
    // The 'מ' logic is handled in the main processing function which calls this.
    const timeStr = String(time || '').replace(/,/g, '').trim();
    
    const parsedNum = parseFloat(timeStr);
    if (isNaN(parsedNum)) return 0;

    const intNum = Math.floor(parsedNum);
    const numStr = String(intNum);

    // Allow 1-4 digits, for times like '900' or '0'.
    if (!/^\d{1,4}$/.test(numStr)) return 0;
    
    const paddedTimeStr = numStr.padStart(4, '0');
    const hoursStr = paddedTimeStr.slice(0, -2);
    const minutesStr = paddedTimeStr.slice(-2);
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) return 0;
    return hours + minutes / 60;
};


const timeToDecimal = (timeStr: string): number => {
    if (!/^\d{1,2}:\d{2}$/.test(timeStr)) return NaN;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
};

const isMultiScholarFormat = (rows: (string | number)[][]): boolean => {
    if (rows.length < 3) return false;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i] || [];
        if (row.some(cell => typeof cell === 'string' && (cell.trim() === 'שם' || cell.trim() === "שם האברך"))) {
            return true;
        }
    }
    return false;
};

const processMultiScholarSheet = (
    rows: (string|number)[][], 
    settings: StipendSettings,
    fileName?: string
): { scholarsData: { name: string; details: DailyDetail[]; bonusData: { [key: string]: number } }[], monthYear: string, activeDays: Set<string> } => {
    
    const XLSX = (window as any).XLSX;
    let dateRowIndex = -1, sederRowIndex = -1, typeRowIndex = -1, nameRowIndex = -1;
    let nameColIndex = -1;
    const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
    const numericDayRegex = /^\d{1,2}$/;

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i] || [];
        const stringRowForHeaders = row.map(c => String(c || '').trim());
        
        const dateLikeCells = row.filter(c => {
            if (typeof c === 'number' && c > 25569) return true; // Check for Excel serial date number
            const s = String(c).trim();
            if (dateRegex.test(s)) return true;
            if (numericDayRegex.test(s)) {
                const num = Number(s);
                return num > 0 && num < 32;
            }
            return false;
        }).length;

        if (dateLikeCells > 2 && dateRowIndex === -1) {
            dateRowIndex = i;
        }
        if ((stringRowForHeaders.includes('בוקר') || stringRowForHeaders.includes('ערב') || stringRowForHeaders.includes('צהריים')) && sederRowIndex === -1) {
            sederRowIndex = i;
        }
        if (stringRowForHeaders.includes('כניסה') && stringRowForHeaders.includes('יציאה') && typeRowIndex === -1) {
            typeRowIndex = i;
        }
        const currentNameColIndex = stringRowForHeaders.findIndex(c => c === 'שם' || c === 'שם האברך');
        if (currentNameColIndex !== -1 && nameColIndex === -1) {
            nameColIndex = currentNameColIndex;
            nameRowIndex = i;
        }
    }

    if (dateRowIndex === -1 || sederRowIndex === -1 || typeRowIndex === -1) {
        throw new Error(`שגיאת איתור כותרות: לא זוהו כל שורות הכותרת הנדרשות (תאריך, סדר, סוג). ודא שהקובץ תקין. Indices found: date=${dateRowIndex}, seder=${sederRowIndex}, type=${typeRowIndex}`);
    }
    if (nameColIndex === -1) {
        throw new Error(`שגיאת איתור כותרות: לא נמצאה עמודת 'שם' או 'שם האברך'.`);
    }

    const dateRow = rows[dateRowIndex];
    const sederRow = rows[sederRowIndex];
    const typeRow = rows[typeRowIndex];
    
    const dataStartRow = Math.max(dateRowIndex, sederRowIndex, typeRowIndex, nameRowIndex) + 1;
    if (dataStartRow >= rows.length) {
        throw new Error("לא נמצאו שורות נתונים של אברכים מתחת לכותרות.");
    }
    
    let monthYear = '';
    const monthYearRegex = /(\d{1,2})\/(\d{2,4})/;
    const monthYearFromNameRegex = /(\d{2})[-_.](\d{2})/;

    if (fileName) {
        const nameMatch = fileName.match(monthYearFromNameRegex);
        if (nameMatch) {
            monthYear = `${nameMatch[1]}/20${nameMatch[2]}`;
        }
    }

    if (!monthYear) {
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            if (rows[i]) {
                for (const cell of rows[i]) {
                    if (typeof cell === 'number' && cell > 25569) {
                        const date = XLSX.SSF.parse_date_code(cell);
                        monthYear = `${String(date.m).padStart(2, '0')}/${date.y}`;
                        break;
                    }
                    const sCell = String(cell);
                    let match = sCell.match(dateRegex);
                    if (match) {
                        const month = match[2].padStart(2, '0');
                        const year = match[3].length === 2 ? `20${match[3]}` : match[3];
                        monthYear = `${month}/${year}`;
                        break;
                    }
                    match = sCell.match(monthYearRegex);
                    if (match) {
                        const month = match[1].padStart(2, '0');
                        const year = match[2].length === 2 ? `20${match[2]}` : match[2];
                        monthYear = `${month}/${year}`;
                        break;
                    }
                }
            }
            if (monthYear) break;
        }
    }

    if (!monthYear) throw new Error(`לא ניתן היה למצוא את חודש ושנת הדוח.`);

    const columnMap: { [colIndex: number]: { date: string, sederName: string, type: string } } = {};
    let currentDate: string | null = null;
    let currentSeder: string | null = null;

    for (let j = 0; j < Math.max(dateRow.length, sederRow.length, typeRow.length); j++) {
        const dateCell = dateRow[j];
        if (dateCell !== null && dateCell !== undefined && dateCell !== '') {
            let dayPart: string | null = null;
            if (typeof dateCell === 'number' && dateCell > 25569) { // Excel serial date
                const date = XLSX.SSF.parse_date_code(dateCell);
                if (date) dayPart = String(date.d);
            } else { // String date
                const dateCellStr = String(dateCell).trim();
                const dateMatch = dateCellStr.match(dateRegex);
                if (dateMatch) {
                    dayPart = dateMatch[1];
                } else if (numericDayRegex.test(dateCellStr) && Number(dateCellStr) > 0 && Number(dateCellStr) < 32) {
                    dayPart = dateCellStr;
                }
            }
            if (dayPart) currentDate = dayPart;
        }
        
        const sederCell = String(sederRow[j] || '').trim();
        if (sederCell && isNaN(Number(sederCell))) {
            currentSeder = sederCell;
        }

        const type = String(typeRow[j] || '').trim();

        if (['כניסה', 'יציאה', 'בונוס'].includes(type) && currentDate && currentSeder) {
            columnMap[j] = { date: currentDate, sederName: currentSeder, type };
        }
    }
    
    if (Object.keys(columnMap).length === 0) {
        throw new Error("לא זוהו עמודות נתונים יומיות. בדוק את מבנה הכותרות (תאריך, סדר, סוג).");
    }

    const activeDays = new Set<string>();
    const dailyDataColIndices = Object.keys(columnMap).map(Number);

    for (let i = dataStartRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const name = String(row[nameColIndex] || '').trim();
        if (!name || name.includes('סה"כ')) continue;

        for (const colIndex of dailyDataColIndices) {
            const cellValue = row[colIndex];
            if (cellValue && String(cellValue).trim() !== '') {
                const mapInfo = columnMap[colIndex];
                if (mapInfo) activeDays.add(mapInfo.date);
            }
        }
    }
    
    const bonusColMap: { [bonusName: string]: number } = {};
    const dailyDataCols = new Set(Object.keys(columnMap).map(Number));
    (settings.generalBonuses || []).forEach(b => {
        const searchName = b.name.includes(' ') ? b.name.split(' ')[1] : b.name;
        for (let j = 0; j < Math.max(dateRow.length, sederRow.length, typeRow.length); j++) {
            if (j === nameColIndex || dailyDataCols.has(j)) continue;
            const header1 = String(rows[dateRowIndex]?.[j] || '').trim();
            const header2 = String(rows[sederRowIndex]?.[j] || '').trim();
            const header3 = String(rows[typeRowIndex]?.[j] || '').trim();
            if (header1.includes(searchName) || header2.includes(searchName) || header3.includes(searchName)) {
                if(!Object.values(bonusColMap).includes(j)){ 
                    bonusColMap[b.name] = j;
                    break;
                }
            }
        }
    });

    const scholarsMap = new Map<string, { details: DailyDetail[], bonusData: { [key: string]: number } }>();

    for (let i = dataStartRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const name = String(row[nameColIndex] || '').trim();
        if (!name || name.includes('סה"כ')) continue;

        if (!scholarsMap.has(name)) {
            const initialBonusData: { [key: string]: number } = {};
            (settings.generalBonuses || []).forEach(b => {
                const colIndex = bonusColMap[b.name];
                if (colIndex !== undefined) {
                    const cellValue = row[colIndex];
                    initialBonusData[b.name] = Number(cellValue) || 0;
                }
            });
            scholarsMap.set(name, { details: [], bonusData: initialBonusData });
        }
        
        const scholarInfo = scholarsMap.get(name)!;
        const dailyData = new Map<string, { entries: any, exits: any, bonuses: any }>();

        Object.entries(columnMap).forEach(([colIndex, mapInfo]) => {
            const dayKey = mapInfo.date;
            if (!dailyData.has(dayKey)) {
                dailyData.set(dayKey, { entries: {}, exits: {}, bonuses: {} });
            }
            const day = dailyData.get(dayKey)!;
            const cellValue = row[parseInt(colIndex)];
            
            if (mapInfo.type === 'כניסה') day.entries[mapInfo.sederName] = cellValue;
            if (mapInfo.type === 'יציאה') day.exits[mapInfo.sederName] = cellValue;
            if (mapInfo.type === 'בונוס') day.bonuses[mapInfo.sederName] = cellValue;
        });
        
        const getSederKeyFromFile = (sederConfigName: string): string | null => {
            if (sederConfigName.includes('בוקר') || sederConfigName.includes("א'")) return 'בוקר';
            if (sederConfigName.includes('ערב') || sederConfigName.includes("ב'") || sederConfigName.includes('צהריים')) return 'ערב';
            return sederConfigName;
        };

        scholarInfo.details = Array.from(dailyData.entries()).map(([date, data]) => {
            const dailyDetail: DailyDetail = {
                day: `${date}/${monthYear}`,
                sederHours: {},
                rawTime: '',
                isLateSederA: false,
                isLateSederB: false,
                isAbsenceApproved: {},
                isLatenessApproved: {},
            };

            const rawTimeParts: string[] = [];
            
            const formatTime = (val: string | number) => {
                const cleanStr = String(val || '0').replace('מ', '').trim();
                const num = parseFloat(cleanStr.replace(/,/g, ''));
                if (isNaN(num)) return (String(val).trim() === 'מ') ? 'מאושר' : '00:00';
                const str = String(Math.floor(num));
                return str.padStart(4, '0').replace(/(\d{1,2})(\d{2})/, '$1:$2');
            };
            
            settings.sedarim.forEach(sederConfig => {
                const sederKey = getSederKeyFromFile(sederConfig.name);
                if (!sederKey || !data.entries.hasOwnProperty(sederKey)) return;
                
                const entryTimeRaw = data.entries[sederKey];
                const exitTimeRaw = data.exits[sederKey];

                const entryStr = String(entryTimeRaw || '').trim();
                const exitStr = String(exitTimeRaw || '').trim();

                const isEntryApproved = entryStr.includes('מ');
                const isExitApproved = exitStr.includes('מ');

                let entryNum = entryStr.replace('מ','');
                let exitNum = exitStr.replace('מ','');

                let entryTime = fourDigitTimeToDecimal(entryNum);
                let exitTime = fourDigitTimeToDecimal(exitNum);
                
                const sederStart = timeToDecimal(sederConfig.startTime);
                const sederEnd = timeToDecimal(sederConfig.endTime);

                if (entryStr === 'מ') {
                   entryTime = sederStart;
                   entryNum = sederConfig.startTime.replace(':','');
                }
                if (exitStr === 'מ') {
                   exitTime = sederEnd;
                   exitNum = sederConfig.endTime.replace(':','');
                }

                if (exitTime > entryTime) {
                    let isLate = false;
                    if (entryTime > sederStart + (sederConfig.punctualityLateThresholdMinutes / 60)) {
                       isLate = true;
                       if (sederKey === 'בוקר') dailyDetail.isLateSederA = true;
                       else dailyDetail.isLateSederB = true;
                    }

                    if (isEntryApproved || isExitApproved) {
                        dailyDetail.isAbsenceApproved![sederConfig.id] = true;
                        if(isLate) {
                           dailyDetail.isLatenessApproved![sederConfig.id] = true;
                        }
                    }

                    const validDuration = Math.max(0, Math.min(exitTime, sederEnd) - Math.max(entryTime, sederStart));
                    dailyDetail.sederHours[sederConfig.id] = validDuration;
                    
                    rawTimeParts.push(`${formatTime(entryNum)}-${formatTime(exitNum)}`);
                } else if (entryStr || exitStr) {
                     rawTimeParts.push(`${formatTime(entryNum)}-${formatTime(exitNum)}`);
                }
            });

            dailyDetail.rawTime = rawTimeParts.join(' | ') || '-';
            return dailyDetail;
        });
    }
    
    const scholarsData = Array.from(scholarsMap.entries()).map(([name, data]) => ({ name, ...data }));
    return { scholarsData, monthYear, activeDays };
};

const processSingleScholarSheet = (
    rows: (string|number)[][], 
    sheetName: string,
    settings: StipendSettings
): { name: string; details: DailyDetail[]; monthYear: string; bonusData: { [key: string]: number } } => {
    const name = sheetName;
    let monthYear = '';
    const details: DailyDetail[] = [];
    const monthYearRegex = /(\d{2}\/\d{2,4})/;

    for (let i = 0; i < 5 && i < rows.length; i++) {
        if (rows[i]) {
            for (const cell of rows[i]) {
                const match = String(cell).match(monthYearRegex);
                if (match && match[1]) {
                    monthYear = match[1].length === 5 ? `${match[1].slice(0, 3)}20${match[1].slice(3)}` : match[1];
                    break;
                }
            }
        }
        if (monthYear) break;
    }
    if (!monthYear) throw new Error(`לא ניתן היה למצוא את חודש ושנת הדוח עבור ${name}.`);

    let headerRowIndex = rows.findIndex(row => row && row.some(c => String(c).trim() === 'יום') && row.some(c => String(c).trim() === 'כניסה'));
    if (headerRowIndex === -1) throw new Error(`לא ניתן היה למצוא את שורת הכותרות עבור ${name}.`);

    const headerRow = rows[headerRowIndex];
    const dayColIndex = headerRow.findIndex(cell => String(cell).trim() === 'יום');
    
    const bonusColIndices: { [key: string]: number } = {};
    const bonusData: { [key: string]: number } = {};
    (settings.generalBonuses || []).forEach(b => {
        const colIndex = headerRow.findIndex(cell => String(cell).trim().includes(b.name.split(' ')[1] || b.name)); // Simple matching
        if(colIndex > -1) bonusColIndices[b.name] = colIndex;
        bonusData[b.name] = 0;
    });

    const entryIndices = headerRow.map((c, i) => String(c).trim() === 'כניסה' ? i : -1).filter(i => i !== -1);
    const exitIndices = headerRow.map((c, i) => String(c).trim() === 'יציאה' ? i : -1).filter(i => i !== -1);
    
    let dataStartRow = rows.findIndex((row, i) => i > headerRowIndex && row && String(row[dayColIndex]).match(/\d{1,2}\/\d{1,2}/));
    if (dataStartRow === -1) throw new Error(`לא ניתן היה למצוא נתוני נוכחות עבור ${name}.`);
    
    const sedarimConfig = (settings.sedarim || []).map(s => ({
        ...s,
        startDecimal: timeToDecimal(s.startTime),
        endDecimal: timeToDecimal(s.endTime)
    }));
    
    for (let i = dataStartRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[dayColIndex] || String(row[dayColIndex]).trim().startsWith('--') || String(row[dayColIndex]).trim() === 'סה"כ') continue;

        Object.keys(bonusColIndices).forEach(bonusName => {
            const colIndex = bonusColIndices[bonusName];
            const cellValue = row[colIndex];
            const numValue = Number(cellValue);
            if (!isNaN(numValue) && numValue > 0) {
                bonusData[bonusName] += numValue;
            }
        });

        const dayAndDateStr = String(row[dayColIndex] || '').trim();
        const dailyDetail: DailyDetail = {
            day: dayAndDateStr,
            sederHours: {},
            rawTime: '',
            isLateSederA: false,
            isLateSederB: false,
        };

        if (Object.values(row).some(cell => String(cell).trim() === 'חופש')) {
            dailyDetail.rawTime = 'חופש';
            details.push(dailyDetail);
            continue;
        }
        
        const rawTimeParts: string[] = [];

        for(let sederIndex = 0; sederIndex < sedarimConfig.length; sederIndex++) {
            if(sederIndex >= entryIndices.length) break;

            const seder = sedarimConfig[sederIndex];
            const entryTime = timeStringToDecimalHours(String(row[entryIndices[sederIndex]] || ''));
            const exitTime = timeStringToDecimalHours(String(row[exitIndices[sederIndex]] || ''));
            
            if (exitTime > entryTime) {
                if(entryTime > seder.startDecimal + (seder.punctualityLateThresholdMinutes / 60)) {
                    if (seder.name.includes("א'")) dailyDetail.isLateSederA = true;
                    if (seder.name.includes("ב'")) dailyDetail.isLateSederB = true;
                }
                const validDuration = Math.max(0, Math.min(exitTime, seder.endDecimal) - Math.max(entryTime, seder.startDecimal));
                dailyDetail.sederHours[seder.id] = validDuration;
                rawTimeParts.push(`${String(row[entryIndices[sederIndex]] || '')}-${String(row[exitIndices[sederIndex]] || '')}`);
            }
        }
        
        dailyDetail.rawTime = rawTimeParts.join(' | ') || '-';
        details.push(dailyDetail);
    }
    
    return { name, details, monthYear, bonusData };
};

export const parseXlsxAndCalculateStipends = (xlsxBuffer: ArrayBuffer, kollelDetails: KollelDetails, fileName?: string): ParseResult => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) throw new Error('ספריית עיבוד קבצי האקסל (XLSX) לא נטענה.');

    const workbook = XLSX.read(xlsxBuffer, { type: 'array' });
    const allResults: StipendResult[] = [];
    let commonMonthYear: string | null = null;
    
    const settings = ensureSettingsCompatibility(kollelDetails.settings);

    const firstSheetName = workbook.SheetNames[0];
    const firstWorksheet = workbook.Sheets[firstSheetName];
    if (!firstWorksheet) throw new Error("הקובץ ריק או לא תקין.");
    
    // Read with raw:false first to reliably check format based on strings like "שם"
    const firstSheetRowsForCheck: (string|number)[][] = XLSX.utils.sheet_to_json(firstWorksheet, { header: 1, raw: false, defval: '' });

    if (isMultiScholarFormat(firstSheetRowsForCheck)) {
        // Now, re-read with raw:true for more reliable date (number) parsing
        const firstSheetRowsRaw: (string|number)[][] = XLSX.utils.sheet_to_json(firstWorksheet, { header: 1, raw: true, defval: '' });
        try {
            const { scholarsData, monthYear, activeDays } = processMultiScholarSheet(firstSheetRowsRaw, settings, fileName);
            commonMonthYear = monthYear;
            scholarsData.forEach(scholarData => {
                const scholarResult = calculateStipendForScholar(scholarData, settings, activeDays, monthYear);
                allResults.push(scholarResult);
            });
        } catch (e) {
            console.error(`שגיאה בעיבוד גיליון "${firstSheetName}" בפורמט החדש: ${(e as Error).message}.`);
            throw e;
        }

    } else {
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) continue;
            // Use raw:false for old format to handle time strings like "09:00"
            const rows: (string|number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
            if (rows.length < 10) continue;

            try {
                const { name, details, monthYear, bonusData } = processSingleScholarSheet(rows, sheetName, settings);
                if (!commonMonthYear) commonMonthYear = monthYear;
                
                const scholarResult = calculateStipendForScholar({ name, details, bonusData }, settings, null, monthYear);
                allResults.push(scholarResult);

            } catch (e) {
                console.warn(`שגיאה בעיבוד גיליון "${sheetName}": ${(e as Error).message}.`);
            }
        }
    }
    
    if (allResults.length === 0) throw new Error('לא נמצאו נתוני אברכים תקינים בקובץ.');
    if (!commonMonthYear) throw new Error('לא ניתן היה לקבוע את חודש הדוח.');

    allResults.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    return { monthYear: commonMonthYear, results: allResults };
};

const ensureSettingsCompatibility = (settings: StipendSettings): StipendSettings => {
    let compatible: StipendSettings = JSON.parse(JSON.stringify(settings));

    if (!compatible.deductions) {
        compatible.deductions = {
            highRate: settings.deductionPerHour || 25,
            lowRate: (settings.deductionPerHour || 25) * 0.8,
            attendanceThresholdPercent: 90,
        };
        delete compatible.deductionPerHour;
    }
    
    if (compatible.singleSederSettings) {
        if (compatible.sedarim && compatible.sedarim.length > 0) {
            compatible.sedarim[0].partialStipendPercentage = compatible.singleSederSettings.sederAPercentage;
        }
        if (compatible.sedarim && compatible.sedarim.length > 1) {
            compatible.sedarim[1].partialStipendPercentage = compatible.singleSederSettings.sederBPercentage;
        }
        delete compatible.singleSederSettings;
    }

    compatible.sedarim = (compatible.sedarim || []).map((s: Seder) => ({
        ...s,
        punctualityBonusCancellationThreshold: s.punctualityBonusCancellationThreshold || 4,
        partialStipendPercentage: s.partialStipendPercentage || 0,
        useCustomDeductions: s.useCustomDeductions || false,
        deductions: s.deductions || { highRate: 25, lowRate: 20, attendanceThresholdPercent: 90 },
    }));

    compatible.generalBonuses = (compatible.generalBonuses || []).map(b => ({ ...b, bonusType: b.bonusType || 'count', subjectToAttendanceThreshold: b.subjectToAttendanceThreshold || false }));
    compatible.bonusAttendanceThresholdPercent = compatible.bonusAttendanceThresholdPercent || 80;
    compatible.rounding = compatible.rounding || 'none';
    
    return compatible;
};