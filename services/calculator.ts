import type { StipendResult, DailyDetail, StipendSettings, Seder } from '../types';

const timeToDecimal = (timeStr: string): number => {
    if (!/^\d{1,2}:\d{2}$/.test(timeStr)) return NaN;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
};

export const calculateStipendForScholar = (
  scholarData: { name: string; details: DailyDetail[]; bonusData: { [key: string]: number } },
  settings: StipendSettings,
  activeDays?: Set<string> | null,
  monthYear?: string | null
): StipendResult => {
    const { name, details, bonusData } = scholarData;
    const scholarOverrides = settings.scholarOverrides?.[name];

    const assignedSedarimIds = scholarOverrides?.assignedSedarim?.length
        ? scholarOverrides.assignedSedarim
        : settings.sedarim.map(s => s.id);
    
    const assignedSedarim = settings.sedarim.filter(s => assignedSedarimIds.includes(s.id));
    
    const workingDaysInMonth = activeDays ? activeDays.size : details.filter(d => d.rawTime !== 'חופש').length;

    // --- Base Stipend Calculation ---
    let baseStipend = settings.baseStipend;
    const attendedSederIdsInMonth = new Set<number>();
     details.forEach(d => {
        Object.keys(d.sederHours).forEach(sederIdStr => {
            const sederId = Number(sederIdStr);
            if((d.sederHours[sederId] || 0) > 0 && assignedSedarimIds.includes(sederId)) {
                attendedSederIdsInMonth.add(sederId);
            }
        });
    });

    if (attendedSederIdsInMonth.size > 0 && attendedSederIdsInMonth.size < assignedSedarim.length) {
         const attendedPercentageSum = [...attendedSederIdsInMonth].reduce((sum, id) => {
            const seder = assignedSedarim.find(s => s.id === id);
            return sum + (seder?.partialStipendPercentage || 0);
        }, 0);
        
        if (attendedPercentageSum > 0 && attendedPercentageSum <= 100) {
             baseStipend *= (attendedPercentageSum / 100);
        }
    }


    // --- Per-Seder Deduction Calculation ---
    let totalDeduction = 0;
    let totalCreditedHours = 0;
    let totalRequiredHours = 0;
    let totalApprovedAbsenceHours = 0;
    const deductionDetails: StipendResult['deductionDetails'] = [];
    const detailsByDay = new Map<string, DailyDetail>();
    details.forEach(d => {
        const dayNum = d.day.split('/')[0];
        detailsByDay.set(dayNum, d);
    });

    for (const seder of assignedSedarim) {
        const sederDuration = timeToDecimal(seder.endTime) - timeToDecimal(seder.startTime);
        if (isNaN(sederDuration) || sederDuration <= 0) continue;

        const rules = seder.useCustomDeductions ? seder.deductions : settings.deductions;

        let sederTotalCreditedHours = 0;
        
        const relevantDays = activeDays ? Array.from(activeDays) : details.map(d => d.day.split('/')[0]);
        
        relevantDays.forEach(dayNum => {
            const detail = detailsByDay.get(dayNum);
            // Only consider days that are not official kollel holidays
            if (detail?.rawTime === 'חופש') return;

            if (detail) { // Scholar has an entry for this day
                const attendedHours = detail.sederHours[seder.id] || 0;
                const isAbsenceApproved = detail.isAbsenceApproved?.[seder.id] || false;
                sederTotalCreditedHours += isAbsenceApproved ? sederDuration : attendedHours;

                if (isAbsenceApproved) {
                    const potentialDeficit = sederDuration - attendedHours;
                    if (potentialDeficit > 0) {
                        totalApprovedAbsenceHours += potentialDeficit;
                    }
                }
            } else {
                // Scholar was completely absent this day (no entry in their details).
                // No hours are credited.
            }
        });

        const sederRequiredHours = workingDaysInMonth * sederDuration;
        const sederHourDeficit = Math.max(0, sederRequiredHours - sederTotalCreditedHours);
        
        const sederAttendancePercentage = sederRequiredHours > 0 ? (sederTotalCreditedHours / sederRequiredHours) * 100 : 100;
        const deductionRate = sederAttendancePercentage >= rules.attendanceThresholdPercent ? rules.lowRate : rules.highRate;
        const sederDeduction = sederHourDeficit * deductionRate;

        totalDeduction += sederDeduction;
        totalCreditedHours += sederTotalCreditedHours;
        totalRequiredHours += sederRequiredHours;

        if (sederHourDeficit > 0.01) { // Only add if there is a deficit
             deductionDetails.push({ sederName: seder.name, deficit: sederHourDeficit, rate: deductionRate, total: sederDeduction });
        }
    }

    const overallAttendancePercentage = totalRequiredHours > 0 ? (totalCreditedHours / totalRequiredHours) * 100 : 100;
    
    // --- Bonus Calculation ---
    let totalBonus = 0;
    const bonusDetails: { name: string; count: number; totalAmount: number }[] = [];
    let totalApprovedLatenessCount = 0;
    
    (assignedSedarim || []).forEach(seder => {
        if (!seder.punctualityBonusEnabled) return;
        const isSederA = seder.name.includes("א'");

        const lateCount = details.filter(d => {
            const isLate = isSederA ? d.isLateSederA : d.isLateSederB;
            return isLate && !d.isLatenessApproved?.[seder.id];
        }).length;

        const approvedLatenessForSeder = details.filter(d => {
            const isLate = isSederA ? d.isLateSederA : d.isLateSederB;
            return isLate && d.isLatenessApproved?.[seder.id];
        }).length;
        totalApprovedLatenessCount += approvedLatenessForSeder;

        if (lateCount >= seder.punctualityBonusCancellationThreshold) return;
        
        const onTimeCount = details.filter(d => {
             const isLate = isSederA ? d.isLateSederA : d.isLateSederB;
             const attended = (d.sederHours[seder.id] || 0) > 0;
             return attended && (!isLate || d.isLatenessApproved?.[seder.id]);
        }).length;

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

    // --- Construct full details for UI ---
    let fullDetails: DailyDetail[] = [];
    if (activeDays && monthYear) {
        const sortedActiveDays = Array.from(activeDays).sort((a, b) => parseInt(a) - parseInt(b));
        fullDetails = sortedActiveDays.map(dayNum => {
            const existingDetail = detailsByDay.get(dayNum);
            if (existingDetail) {
                return existingDetail;
            } else {
                return {
                    day: `${dayNum}/${monthYear}`,
                    sederHours: {},
                    rawTime: 'נעדר',
                };
            }
        });
    } else {
        // Fallback for single-scholar sheets or when activeDays isn't available
        fullDetails = [...details].sort((a, b) => {
            const dayA = parseInt(a.day.split('/')[0]);
            const dayB = parseInt(b.day.split('/')[0]);
            return dayA - dayB;
        });
    }


    return {
        name,
        totalHours: totalCreditedHours,
        stipend: Math.max(0, finalStipend),
        details: fullDetails,
        bonusDetails,
        attendancePercentage: overallAttendancePercentage,
        baseStipendUsed: baseStipend,
        totalDeduction,
        hourDeficit: totalRequiredHours - totalCreditedHours,
        requiredHours: totalRequiredHours,
        deductionDetails,
        workingDaysInMonth,
        totalApprovedAbsenceHours,
        totalApprovedLatenessCount,
    };
};