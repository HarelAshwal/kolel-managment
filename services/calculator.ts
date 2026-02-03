
import type { StipendResult, DailyDetail, StipendSettings, Seder } from '../types';

const timeToDecimal = (timeStr: string): number => {
    if (!/^\d{1,2}:\d{2}$/.test(timeStr)) return NaN;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
};

const getDayOfWeek = (dayInput: string, monthYearContext?: string | null): number => {
    try {
        if (dayInput.includes('/')) {
            const parts = dayInput.split('/');
            if (parts.length === 3) {
                 let year = parseInt(parts[2]);
                 if (year < 100) year += 2000;
                 return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0])).getDay();
            }
        }
        if (monthYearContext) {
             const parts = monthYearContext.split('/');
             if (parts.length >= 2) {
                 let year = parseInt(parts[1]);
                 if (year < 100) year += 2000;
                 return new Date(year, parseInt(parts[0]) - 1, parseInt(dayInput)).getDay();
             }
        }
    } catch(e) { return -1; }
    return -1;
};

export const calculateStipendForScholar = (
  scholarData: { name: string; details: DailyDetail[]; bonusData: { [key: string]: number } },
  settings: StipendSettings,
  activeDays?: Set<string> | null,
  monthYear?: string | null
): StipendResult => {
    const { name, details, bonusData } = scholarData;
    let currentMonthYear = monthYear;
    if (!currentMonthYear && details.length > 0) {
        const match = details[0].day.match(/\d{1,2}\/(\d{1,2}\/\d{2,4})/);
        if (match) currentMonthYear = match[1];
    }

    const scholarOverrides = settings.scholarOverrides?.[name];
    const assignedSedarimIds = scholarOverrides?.assignedSedarim?.length
        ? scholarOverrides.assignedSedarim
        : settings.sedarim.map(s => s.id);
    const assignedSedarim = settings.sedarim.filter(s => assignedSedarimIds.includes(s.id));
    
    let workingDaysCount = 0;
    
    // Deep copy details to ensure we calculate on a fresh copy and can modify it 
    // without affecting source.
    // Use integer-based keys to avoid "01" vs "1" mismatches.
    const detailsByDay = new Map<string, DailyDetail>();
    details.forEach(d => {
        const dayNumMatch = d.day.match(/^\d+/);
        if (dayNumMatch) {
            // Normalize "01" to "1"
            const key = String(parseInt(dayNumMatch[0], 10));
            detailsByDay.set(key, JSON.parse(JSON.stringify(d)));
        }
    });

    const relevantDays = activeDays ? Array.from(activeDays) : details.map(d => d.day.match(/^\d+/)?.[0]).filter(Boolean) as string[];
    relevantDays.forEach(dayNum => {
        const key = String(parseInt(dayNum, 10));
        const dow = getDayOfWeek(dayNum, currentMonthYear);
        const detail = detailsByDay.get(key);
        if (dow !== 5 && dow !== 6 && detail?.rawTime !== 'חופש') {
            workingDaysCount++;
        }
    });

    let baseStipend = settings.baseStipend;
    if (settings.baseStipendType === 'daily') baseStipend = settings.baseStipend * workingDaysCount;
    
    if (assignedSedarim.length < settings.sedarim.length) {
         const assignedPercentageSum = assignedSedarim.reduce((sum, s) => sum + (s.partialStipendPercentage || 0), 0);
         if (assignedPercentageSum > 0 && assignedPercentageSum <= 100) {
             baseStipend = baseStipend * (assignedPercentageSum / 100);
         }
    }
    
    let totalDeduction = 0;
    let totalCreditedHours = 0;
    let totalActualHours = 0;
    let totalRequiredHours = 0;
    let totalApprovedAbsenceHours = 0;
    const deductionDetails: any[] = [];

    for (const seder of assignedSedarim) {
        const sederStart = timeToDecimal(seder.startTime);
        const sederEnd = timeToDecimal(seder.endTime);
        const sederDuration = sederEnd - sederStart;
        if (isNaN(sederDuration) || sederDuration <= 0) continue;

        let sederTotalCreditedHours = 0;
        let sederTotalActualHours = 0;
        
        relevantDays.forEach(dayNum => {
            const key = String(parseInt(dayNum, 10));
            const detail = detailsByDay.get(key);
            const dow = getDayOfWeek(dayNum, currentMonthYear);
            if (dow === 5 || dow === 6 || detail?.rawTime === 'חופש') return;

            if (detail) { 
                let attendedHours = detail.sederHours[seder.id] || 0;
                
                // NOTE: Tolerance logic removed as per user request to calculate based on raw hours only.
                
                // Update the detail to ensure consistency
                detail.sederHours[seder.id] = attendedHours;
                
                const approvedHours = detail.approvedAbsenceHours?.[seder.id] || 0;
                
                sederTotalActualHours += attendedHours;
                sederTotalCreditedHours += attendedHours + approvedHours;
                totalApprovedAbsenceHours += approvedHours;
            }
        });

        const sederRequiredHours = workingDaysCount * sederDuration;
        totalRequiredHours += sederRequiredHours;
        totalCreditedHours += sederTotalCreditedHours;
        totalActualHours += sederTotalActualHours;

        const rules = seder.useCustomDeductions ? seder.deductions : settings.deductions;
        const sederHourDeficit = Math.max(0, sederRequiredHours - sederTotalCreditedHours);
        
        // Use a single deduction rate for everything (High Rate as standard)
        // User requested removing 'Low Rate' and having one field.
        const deductionRate = rules.highRate;

        const sederDeduction = sederHourDeficit * deductionRate;

        // Calculate deductions regardless of calculation method first
        totalDeduction += sederDeduction;
        if (sederHourDeficit > 0.01) { 
            deductionDetails.push({ sederName: seder.name, deficit: sederHourDeficit, rate: deductionRate, total: sederDeduction });
        }
    }

    const overallAttendancePercentage = totalRequiredHours > 0 ? (totalCreditedHours / totalRequiredHours) * 100 : 100;
    let isHourlyFallbackApplied = false;
    let hourlyRateApplied: number | undefined;

    if (settings.baseStipendCalculationMethod === 'hourly_fallback') {
        const threshold = settings.deductions.attendanceThresholdPercent || 80;
        if (overallAttendancePercentage < threshold) {
            isHourlyFallbackApplied = true;
            const fallbackRate = settings.fallbackHourlyRate || 10;
            hourlyRateApplied = fallbackRate;
            baseStipend = totalCreditedHours * fallbackRate;
            
            // If fallback is applied, we don't use the standard deductions
            totalDeduction = 0;
            deductionDetails.length = 0; 
        } 
        // If overallAttendancePercentage >= threshold:
        // We use the baseStipend (calculated at start) AND apply the totalDeduction calculated in loop.
    }

    let totalBonus = 0;
    const bonusDetails: any[] = [];
    let totalApprovedLatenessCount = 0;
    
    assignedSedarim.forEach(seder => {
        if (!seder.punctualityBonusEnabled) return;
        
        // CHANGE: If hourly fallback is active, we IGNORE the global bonus threshold check.
        // We let the specific tables/tiers decide.
        if (settings.bonusAttendanceThresholdEnabled && 
            overallAttendancePercentage < settings.bonusAttendanceThresholdPercent && 
            !isHourlyFallbackApplied) {
            return;
        }

        const isSederA = seder.name.includes("א'");
        let failureCount = 0; // absences or hours deficit depending on model
        let successCount = 0;

        let sederTotalActualHoursLocal = 0;
        let sederTotalApprovedHoursLocal = 0;

        relevantDays.forEach(dayNum => {
             const key = String(parseInt(dayNum, 10));
             const d = detailsByDay.get(key);
             const dow = getDayOfWeek(dayNum, currentMonthYear);
             if (dow === 5 || dow === 6 || !d || d.rawTime === 'חופש') return;

             const isLate = isSederA ? d.isLateSederA : d.isLateSederB;
             const attendedHours = d.sederHours[seder.id] || 0;
             const approvedLate = d.isLatenessApproved?.[seder.id];
             const approvedAbsence = d.isAbsenceApproved?.[seder.id];

             sederTotalActualHoursLocal += attendedHours;
             sederTotalApprovedHoursLocal += d.approvedAbsenceHours?.[seder.id] || 0;

             if (attendedHours <= 0) {
                 if (!approvedAbsence) failureCount++;
             } else {
                 if (isLate && !approvedLate) failureCount++;
                 else successCount++;
             }
             if (isLate && approvedLate) totalApprovedLatenessCount++;
        });

        // Use total deficit hours as failure count for tiered logic if relevant
        const totalSederDeficit = Math.max(0, (workingDaysCount * (timeToDecimal(seder.endTime) - timeToDecimal(seder.startTime))) - (sederTotalActualHoursLocal + sederTotalApprovedHoursLocal));

        let bonusRate = seder.punctualityBonusAmount;
        let bonusName = `שמירת ${seder.name}`;

        const tiers = seder.punctualityTiers;
        if (tiers && tiers.length > 0) {
            bonusRate = 0;
            const sortedTiers = [...tiers].sort((a, b) => a.maxFailures - b.maxFailures);
            // Comparison based on failures (absences/lates). Use hours if needed.
            const metric = failureCount; 
            for (const tier of sortedTiers) {
                if (metric <= tier.maxFailures) {
                    bonusRate = tier.amount;
                    break;
                }
            }
        } else if (failureCount >= seder.punctualityBonusCancellationThreshold) {
            bonusRate = 0;
        }

        const bonusAmount = successCount * bonusRate;
        if (bonusAmount > 0 || failureCount > 0) {
            if (bonusAmount > 0) totalBonus += bonusAmount;
            bonusDetails.push({ name: bonusName, count: successCount, failures: failureCount, totalAmount: bonusAmount });
        }
    });

    (settings.generalBonuses || []).forEach(bonusDef => {
        const val = bonusData[bonusDef.name] || 0;
        if (val <= 0) return;
        let multiplier = 1;
        if (bonusDef.attendanceConditionType === 'global') {
             // We keep the global restriction for general bonuses unless specifically requested otherwise,
             // but technically the user prompt focused on 'The table of bonus cancellation tiers', which refers to Punctuality.
             // If general bonuses should also be allowed in hourly mode, uncomment the part in parentheses:
             if (overallAttendancePercentage < settings.bonusAttendanceThresholdPercent /* && !isHourlyFallbackApplied */) multiplier = 0;
        } else if (bonusDef.attendanceConditionType === 'custom' && bonusDef.customConditions?.length) {
             multiplier = 0;
             const sorted = [...bonusDef.customConditions].sort((a, b) => b.threshold - a.threshold);
             for (const c of sorted) {
                 if (overallAttendancePercentage >= c.threshold) {
                     multiplier = c.percent / 100;
                     break;
                 }
             }
        } 
        if (multiplier > 0) {
            const amt = (bonusDef.bonusType === 'count' ? val * bonusDef.amount : val) * multiplier;
            totalBonus += amt;
            bonusDetails.push({ name: bonusDef.name + (multiplier < 1 ? ` (${(multiplier * 100).toFixed(0)}%)` : ''), count: bonusDef.bonusType === 'count' ? val : 1, totalAmount: amt });
        }
    });
    
    let finalStipend = baseStipend - totalDeduction + totalBonus;
    if (settings.rounding === 'upTo10') finalStipend = Math.ceil(finalStipend / 10) * 10;

    return {
        name,
        totalHours: totalActualHours,
        stipend: Math.max(0, finalStipend),
        details: Array.from(detailsByDay.values()).sort((a,b) => {
             // Improved sort safe parsing
             const dayA = parseInt(a.day.match(/^\d+/)?.[0] || '0', 10);
             const dayB = parseInt(b.day.match(/^\d+/)?.[0] || '0', 10);
             return dayA - dayB;
        }),
        bonusDetails,
        attendancePercentage: overallAttendancePercentage,
        baseStipendUsed: baseStipend,
        totalDeduction,
        hourDeficit: totalRequiredHours - totalCreditedHours,
        requiredHours: totalRequiredHours,
        deductionDetails,
        workingDaysInMonth: workingDaysCount,
        totalApprovedAbsenceHours,
        totalApprovedLatenessCount,
        isHourlyFallbackApplied,
        hourlyRateApplied,
    };
};
