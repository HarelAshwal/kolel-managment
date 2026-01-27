
export interface PunctualityTier {
    maxFailures: number; // e.g., up to 3 absences or hours
    amount: number;      // e.g., 14 NIS per day
}

export interface Seder {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  punctualityBonusEnabled: boolean;
  punctualityLateThresholdMinutes: number;
  punctualityBonusAmount: number;
  punctualityBonusCancellationThreshold: number;
  
  // New Tiered System
  punctualityBonusType?: 'fixed' | 'tiered';
  punctualityTiers?: PunctualityTier[];
  
  // New tolerance field
  earlyExitToleranceMinutes?: number;

  partialStipendPercentage: number;
  useCustomDeductions: boolean;
  deductions: {
    highRate: number;
    lowRate: number;
    attendanceThresholdPercent: number;
  };
}

export interface BonusCondition {
    threshold: number; // e.g. 75% attendance
    percent: number;   // e.g. 100% of the bonus, 66%, 0%
}

export interface GeneralBonus {
  id: number;
  name: string;
  amount: number;
  bonusType: 'count' | 'amount'; 
  subjectToAttendanceThreshold: boolean;
  attendanceConditionType?: 'none' | 'global' | 'custom';
  customConditions?: BonusCondition[];
}

export interface StipendSettings {
  baseStipend: number;
  baseStipendType?: 'monthly' | 'daily';

  // New Calculation Method Toggle
  baseStipendCalculationMethod?: 'deduction' | 'hourly_fallback'; 
  fallbackHourlyRate?: number; 

  deductions: {
    highRate: number;
    lowRate: number;
    attendanceThresholdPercent: number;
  };

  sedarim: Seder[];
  unifiedPunctualityEnabled?: boolean;
  generalBonuses: GeneralBonus[];
  bonusAttendanceThresholdEnabled?: boolean;
  bonusAttendanceThresholdPercent: number;
  rounding: 'none' | 'upTo10';
  lastAiPrompt?: string;

  scholarOverrides?: {
    [scholarName: string]: {
      assignedSedarim?: number[];
    };
  };

  // Deprecated fields
  singleSederSettings?: {
    enabled: boolean;
    sederAPercentage: number;
    sederBPercentage: number;
  };
  deductionPerHour?: number;
}

// Added DailyDetail interface
export interface DailyDetail {
  day: string;
  sederHours: { [sederId: number]: number };
  rawTime: string;
  isLateSederA: boolean;
  isLateSederB: boolean;
  isAbsenceApproved?: { [sederId: number]: boolean };
  isLatenessApproved?: { [sederId: number]: boolean };
  approvedAbsenceHours?: { [sederId: number]: number };
}

export interface StipendResult {
  name: string;
  totalHours: number;
  stipend: number;
  details?: DailyDetail[];
  totalOutOfSederHours?: number;
  bonusDetails?: { name: string; count: number; failures?: number; totalAmount: number }[];
  attendancePercentage?: number;
  baseStipendUsed?: number;
  totalDeduction?: number;
  hourDeficit?: number;
  requiredHours?: number;
  deductionDetails?: {
    sederName: string;
    deficit: number;
    rate: number;
    total: number;
  }[];
  workingDaysInMonth?: number;
  totalApprovedAbsenceHours?: number;
  totalApprovedLatenessCount?: number;
  isHourlyFallbackApplied?: boolean;
  hourlyRateApplied?: number; // Added to track fallback rate
}

// Added missing KollelDetails interface
export interface KollelDetails {
  id: string;
  name: string;
  managerName?: string;
  phone?: string;
  address?: string;
  settings: StipendSettings;
  sharedWith?: string[];
  userId?: any;
  totalStudents?: number;
  establishedDate?: string | Date;
  isActive?: boolean;
}

// Added missing MonthlyData interface
export interface MonthlyData {
  monthYear: string;
  results: StipendResult[];
}

// Added missing ParseResult interface
export interface ParseResult {
  monthYear: string;
  results: StipendResult[];
}

// Added missing ScholarReportData interface
export interface ScholarReportData {
  name: string;
  totalHours: number;
  monthsCount: number;
  averageHoursPerMonth: number;
  totalTargetHours: number;
  attendancePercentage: number;
}

// Added missing ReportSummary interface
export interface ReportSummary {
  totalHours: number;
  scholarCount: number;
  averageHoursPerScholar: number;
  monthCount: number;
  averageAttendancePercentage: number;
}

// Added missing TimelineDataPoint interface
export interface TimelineDataPoint {
  monthYear: string;
  averageHours: number;
}

// Added missing User interface
export interface User {
    id: string;
    email: string;
    name: string;
    picture?: string;
    isAdmin: boolean;
    isSuperAdmin?: boolean;
}

// Added missing AuthContextType interface
export interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: () => void;
    logout: () => void;
    checkAdminStatus: (token: string) => Promise<boolean>;
}
