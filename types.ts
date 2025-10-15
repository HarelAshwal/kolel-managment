export interface Seder {
  id: number; // For React keys
  name: string;
  startTime: string;
  endTime: string;
  punctualityBonusEnabled: boolean;
  punctualityLateThresholdMinutes: number;
  punctualityBonusAmount: number;
  punctualityBonusCancellationThreshold: number;

  // New fields for flexible partial stipend and per-seder deductions
  partialStipendPercentage: number;
  useCustomDeductions: boolean;
  deductions: {
    highRate: number;
    lowRate: number;
    attendanceThresholdPercent: number;
  };
}

export interface GeneralBonus {
  id: number; // For React keys
  name: string;
  amount: number;
  bonusType: 'count' | 'amount'; 
  subjectToAttendanceThreshold: boolean;
}

export interface StipendSettings {
  baseStipend: number;
  
  deductions: {
    highRate: number;
    lowRate: number;
    attendanceThresholdPercent: number;
  };

  sedarim: Seder[];
  generalBonuses: GeneralBonus[];
  bonusAttendanceThresholdPercent: number;
  rounding: 'none' | 'upTo10';

  lastAiPrompt?: string;

  // Deprecated fields for migration
  singleSederSettings?: {
    enabled: boolean;
    sederAPercentage: number;
    sederBPercentage: number;
  };
  deductionPerHour?: number;
  sederA_start?: string;
  sederA_end?: string;
  sederB_start?: string;
  sederB_end?: string;
  testBonus?: number;
  summaryBonus?: number;
  dailyAmount?: number;
}

export interface KollelDetails {
  id: string;
  name: string;
  managerName?: string;
  phone?: string;
  address?: string;
  settings: StipendSettings;
  userId?: {
    _id?: string;
    name?: string;
    email?: string;
  } | string; 
  sharedWith?: string[];
  totalStudents?: number;
  establishedDate?: string | Date;
  isActive?: boolean;
}

export interface AttendanceRecord {
  name: string;
  entry: string;
  exit: string;
}

export interface DailyDetail {
  day: string;
  sederHours: Record<number, number>; // Maps Seder ID to hours
  rawTime: string;
  outOfSederHours?: number;
  isLateSederA?: boolean; // Kept for punctuality bonus logic
  isLateSederB?: boolean; // Kept for punctuality bonus logic
}

export interface StipendResult {
  name: string;
  totalHours: number;
  stipend: number;
  details?: DailyDetail[];
  totalOutOfSederHours?: number;
  bonusDetails?: { name: string; count: number; totalAmount: number }[];
  
  attendancePercentage?: number;
  baseStipendUsed?: number;
  totalDeduction?: number;
  hourDeficit?: number;
  requiredHours?: number;

  // New detailed deduction info
  deductionDetails?: {
    sederName: string;
    deficit: number;
    rate: number;
    total: number;
  }[];
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

// --- Auth Types ---
export interface User {
    id: string;
    email: string;
    name: string;
    picture?: string;
    isAdmin: boolean;
    isSuperAdmin?: boolean;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface AuthContextType extends AuthState {
    login: () => void;
    logout: () => void;
    checkAdminStatus: (token: string) => Promise<boolean>;
}
