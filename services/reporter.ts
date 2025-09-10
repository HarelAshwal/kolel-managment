import type { MonthlyData, ScholarReportData, ReportSummary, TimelineDataPoint, KollelDetails } from '../types';

const parseMonthYear = (monthYear: string): Date => {
    const [month, year] = monthYear.split('/');
    // Assuming year can be YY or YYYY
    const fullYear = year.length === 2 ? parseInt(`20${year}`) : parseInt(year);
    return new Date(fullYear, parseInt(month) - 1);
};

export const generateReport = (
  allData: MonthlyData[],
  selectedMonths: string[],
  selectedScholars: string[],
  kollelDetails: KollelDetails
): { summary: ReportSummary; details: ScholarReportData[]; timeline: TimelineDataPoint[] } => {
  const filteredByMonth = allData.filter(d => selectedMonths.includes(d.monthYear));
  const dailyTarget = kollelDetails.settings.dailyHoursTarget;

  const aggregation: { [scholarName: string]: { totalHours: number, monthsCount: number, totalTargetHours: number } } = {};

  for (const monthData of filteredByMonth) {
    for (const result of monthData.results) {
      if (!aggregation[result.name]) {
        aggregation[result.name] = { totalHours: 0, monthsCount: 0, totalTargetHours: 0 };
      }
      aggregation[result.name].totalHours += result.totalHours;
      aggregation[result.name].monthsCount += 1;
      
      const activeDays = result.details?.filter(d => d.hours > 0).length || 0;
      aggregation[result.name].totalTargetHours += activeDays * dailyTarget;
    }
  }

  const unsortedDetails: ScholarReportData[] = Object.entries(aggregation)
    .map(([name, data]) => {
      const totalTargetHours = data.totalTargetHours;
      const attendancePercentage = totalTargetHours > 0 ? (data.totalHours / totalTargetHours) * 100 : 0;
      return {
        name,
        totalHours: data.totalHours,
        monthsCount: data.monthsCount,
        averageHoursPerMonth: data.monthsCount > 0 ? data.totalHours / data.monthsCount : 0,
        totalTargetHours,
        attendancePercentage,
      };
    })
    .filter(d => selectedScholars.includes(d.name));

  const details = unsortedDetails.sort((a,b) => b.totalHours - a.totalHours);

  const totalHours = details.reduce((sum, d) => sum + d.totalHours, 0);
  const totalTargetHoursOverall = details.reduce((sum, d) => sum + d.totalTargetHours, 0);
  const scholarCount = details.length;

  const summary: ReportSummary = {
    totalHours: totalHours,
    scholarCount: scholarCount,
    averageHoursPerScholar: scholarCount > 0 ? totalHours / scholarCount : 0,
    monthCount: selectedMonths.length,
    averageAttendancePercentage: totalTargetHoursOverall > 0 ? (totalHours / totalTargetHoursOverall) * 100 : 0,
  };
  
  // Timeline Data Generation
  const timeline: TimelineDataPoint[] = filteredByMonth.map(monthData => {
    const relevantScholars = monthData.results.filter(r => selectedScholars.includes(r.name));
    if (relevantScholars.length === 0) {
      return { monthYear: monthData.monthYear, averageHours: 0 };
    }
    const totalMonthlyHours = relevantScholars.reduce((sum, scholar) => sum + scholar.totalHours, 0);
    const averageHours = totalMonthlyHours / relevantScholars.length;
    return { monthYear: monthData.monthYear, averageHours };
  }).sort((a, b) => parseMonthYear(a.monthYear).getTime() - parseMonthYear(b.monthYear).getTime());


  return { summary, details, timeline };
};