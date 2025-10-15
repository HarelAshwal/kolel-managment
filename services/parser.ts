import type { StipendResult, DailyDetail, KollelDetails, ParseResult, StipendSettings, Seder } from '../types';

const timeStringToDecimalHours = (timeStr: string): number => {
    if (!timeStr) return 0;
    const cleanedTimeStr = timeStr.trim().replace('*', '');
    if (!/^\d{1,3}:\d{2}$/.test(cleanedTimeStr)) return 0;
    const [hours, minutes] = cleanedTimeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours + minutes / 60;
};

const timeToDecimal = (timeStr: string): number => {
    if (!/^\d{1,2}:\d{2}$/.test(timeStr)) return NaN;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
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

export const parseXlsxAndCalculateStipends = (xlsxBuffer: ArrayBuffer, kollelDetails: KollelDetails): ParseResult => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) throw new Error('ספריית עיבוד קבצי האקסל (XLSX) לא נטענה.');

    const workbook = XLSX.read(xlsxBuffer, { type: 'array' });
    const allResults: StipendResult[] = [];
    let commonMonthYear: string | null = null;
    
    const settings = ensureSettingsCompatibility(kollelDetails.settings);

    for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;
        const rows: (string|number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
        if (rows.length < 10) continue;

        try {
            const { name, details, monthYear, bonusData } = processSingleScholarSheet(rows, sheetName, settings);
            if (!commonMonthYear) commonMonthYear = monthYear;
            
            // --- Partial Stipend Calculation ---
            const attendedSederIds = new Set<number>();
            details.forEach(d => {
                Object.keys(d.sederHours).forEach(sederId => {
                     if(d.sederHours[Number(sederId)] > 0) attendedSederIds.add(Number(sederId));
                });
            });

            let baseStipend = settings.baseStipend;
            if (attendedSederIds.size === 1) {
                const singleSederId = attendedSederIds.values().next().value;
                const singleSeder = settings.sedarim.find(s => s.id === singleSederId);
                if (singleSeder && singleSeder.partialStipendPercentage > 0) {
                    baseStipend *= (singleSeder.partialStipendPercentage / 100);
                }
            }
            
            // --- Per-Seder Deduction Calculation ---
            let totalDeduction = 0;
            let totalValidHours = 0;
            let totalRequiredHours = 0;
            const deductionDetails: StipendResult['deductionDetails'] = [];

            for (const seder of settings.sedarim) {
                const rules = seder.useCustomDeductions ? seder.deductions : settings.deductions;
                const sederDuration = timeToDecimal(seder.endTime) - timeToDecimal(seder.startTime);

                const sederTotalHours = details.reduce((sum, d) => sum + (d.sederHours[seder.id] || 0), 0);
                const sederActiveDays = details.filter(d => (d.sederHours[seder.id] || 0) > 0).length;

                if (sederActiveDays === 0) continue; // Skip if never attended this seder

                const sederRequiredHours = sederActiveDays * sederDuration;
                const sederAttendancePercentage = sederRequiredHours > 0 ? (sederTotalHours / sederRequiredHours) * 100 : 100;
                const sederHourDeficit = Math.max(0, sederRequiredHours - sederTotalHours);
                
                const deductionRate = sederAttendancePercentage >= rules.attendanceThresholdPercent ? rules.lowRate : rules.highRate;
                const sederDeduction = sederHourDeficit * deductionRate;

                totalDeduction += sederDeduction;
                totalValidHours += sederTotalHours;
                totalRequiredHours += sederRequiredHours;

                deductionDetails.push({ sederName: seder.name, deficit: sederHourDeficit, rate: deductionRate, total: sederDeduction });
            }

            const overallAttendancePercentage = totalRequiredHours > 0 ? (totalValidHours / totalRequiredHours) * 100 : 100;
            
            // --- Bonus Calculation ---
            let totalBonus = 0;
            const bonusDetails: { name: string; count: number; totalAmount: number }[] = [];
            
            (settings.sedarim || []).forEach(seder => {
                if (!seder.punctualityBonusEnabled) return;
                const isSederA = seder.name.includes("א'");
                const lateCount = details.filter(d => (isSederA ? d.isLateSederA : d.isLateSederB)).length;
                if (lateCount >= seder.punctualityBonusCancellationThreshold) return;
                
                const onTimeCount = details.filter(d => (d.sederHours[seder.id] || 0) > 0 && !(isSederA ? d.isLateSederA : d.isLateSederB)).length;
                const bonusAmount = onTimeCount * seder.punctualityBonusAmount;
                if (bonusAmount > 0) {
                    totalBonus += bonusAmount;
                    bonusDetails.push({ name: `שמירת ${seder.name}`, count: onTimeCount, totalAmount: bonusAmount });
                }
            });

            (settings.generalBonuses || []).forEach(bonusDef => {
                if (bonusDef.subjectToAttendanceThreshold && overallAttendancePercentage < settings.bonusAttendanceThresholdPercent) return;
                
                const countOrAmount = bonusData[bonusDef.name] || 0;
                if (countOrAmount <= 0) return;

                const bonusAmount = bonusDef.bonusType === 'count' ? countOrAmount * bonusDef.amount : countOrAmount;
                totalBonus += bonusAmount;
                bonusDetails.push({ name: bonusDef.name, count: bonusDef.bonusType === 'count' ? countOrAmount : 1, totalAmount: bonusAmount });
            });
            
            // --- Final Calculation ---
            let finalStipend = baseStipend - totalDeduction + totalBonus;
            if (settings.rounding === 'upTo10') {
                finalStipend = Math.ceil(finalStipend / 10) * 10;
            }

            allResults.push({
                name,
                totalHours: totalValidHours,
                stipend: Math.max(0, finalStipend),
                details,
                bonusDetails,
                attendancePercentage: overallAttendancePercentage,
                baseStipendUsed: baseStipend,
                totalDeduction,
                hourDeficit: totalRequiredHours - totalValidHours,
                requiredHours: totalRequiredHours,
                deductionDetails,
            });
        } catch (e) {
            console.warn(`שגיאה בעיבוד גיליון "${sheetName}": ${(e as Error).message}.`);
        }
    }
    
    if (allResults.length === 0) throw new Error('לא נמצאו נתוני אברכים תקינים בקובץ.');
    if (!commonMonthYear) throw new Error('לא ניתן היה לקבוע את חודש הדוח.');

    allResults.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    return { monthYear: commonMonthYear, results: allResults };
};

// Helper to migrate old settings structure to new one
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
    
    // Migrate singleSederSettings to per-seder partialStipendPercentage
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
