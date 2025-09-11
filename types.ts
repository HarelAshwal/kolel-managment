export interface StipendSettings {
  baseStipend: number;
  deductionPerHour: number;
  dailyHoursTarget: number;
  sederA_start: string;
  sederA_end: string;
  sederB_start: string;
  sederB_end: string;
  testBonus: number;
  summaryBonus: number;
}

export interface KollelDetails {
  id: string;
  name: string;
  managerName?: string;
  phone?: string;
  address?: string;
  settings: StipendSettings;
}

export interface AttendanceRecord {
  name: string;
  entry: string;
  exit: string;
}

export interface DailyDetail {
  day: string;
  hours: number;
  rawTime: string;
  outOfSederHours?: number;
}

export interface StipendResult {
  name: string;
  totalHours: number;
  stipend: number;
  details?: DailyDetail[];
  totalOutOfSederHours?: number;
}

export interface ParseResult {
  monthYear: string;
  results: StipendResult[];
}

export interface MonthlyData {
  monthYear: string;
  results: StipendResult[];
}

export interface ScholarReportData {
  name: string;
  totalHours: number;
  monthsCount: number;
  averageHoursPerMonth: number;
  totalTargetHours: number;
  attendancePercentage: number;
}

export interface ReportSummary {
  totalHours: number;
  averageHoursPerScholar: number;
  scholarCount: number;
  monthCount: number;
  averageAttendancePercentage: number;
}

export interface TimelineDataPoint {
  monthYear: string;
  averageHours: number;
}