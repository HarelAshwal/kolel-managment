
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'he' | 'en';
type Direction = 'rtl' | 'ltr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: Direction;
}

const translations = {
  he: {
    // General
    "app_title": "מנהל כולל",
    "app_subtitle": "מערכת ניהול מלגות",
    "loading": "טוען...",
    "save": "שמור",
    "cancel": "ביטול",
    "edit": "עריכה",
    "delete": "מחיקה",
    "error": "שגיאה",
    "success": "בוצע בהצלחה",
    "yes": "כן",
    "no": "לא",
    "close": "סגור",
    
    // Login
    "welcome_title": "מערכת ניהול כולל",
    "welcome_subtitle": "ברוכים הבאים! אנא התחברו כדי להמשיך.",
    "login_google": "התחברות עם גוגל",
    "login_terms": "על ידי התחברות, אתם מסכימים לתנאי השימוש ומדיניות הפרטיות.",
    
    // Header
    "logout": "התנתקות",
    "admin_badge": "מנהל",
    "super_admin": "מנהל מערכת",

    // Kollel Selection
    "select_kollel_title": "בחירת כולל",
    "select_kollel_subtitle": "יש לבחור את הכולל אותו ברצונך לנהל.",
    "select_kollel_admin_subtitle": "סה\"כ {0} כוללים במערכת - לחץ על כולל כדי לעזור לבעלים",
    "no_kollels": "לא נמצאו כוללים שמורים. יש להוסיף כולל חדש.",
    "add_new_kollel": "הוספת כולל חדש",
    "select_btn": "בחירה",
    "created_by": "נוצר ע\"י:",
    "shared_with": "שותף עם:",
    "base_amount": "סכום בסיס:",
    "delete_confirm": "האם אתה בטוח שברצונך למחוק את הכולל? לא ניתן לשחזר פעולה זו.",
    "backup_kollel": "גיבוי כולל",
    "restore_kollel": "שחזור/ייבוא מגיבוי",
    "backup_success": "הגיבוי ירד בהצלחה!",
    "restore_success": "הכולל שוחזר בהצלחה!",

    // Setup
    "setup_title_new": "הגדרת כולל חדש",
    "setup_title_edit": "עריכת פרטי כולל",
    "field_name": "שם הכולל",
    "field_manager": "שם מנהל הכולל",
    "field_phone": "טלפון ליצירת קשר",
    "field_address": "כתובת הכולל",
    "field_shared": "שיתוף עם משתמשי Gmail נוספים",
    "field_shared_hint": "דוגמה: user1@gmail.com, user2@gmail.com",
    "save_continue": "שמירה והמשך",
    "save_changes": "שמירת שינויים",
    "error_name_required": "יש למלא את שם הכולל.",

    // Dashboard
    "dashboard_title": "אפשרויות ניהול",
    "upload_report": "העלאת דוח",
    "upload_report_sub": "קובץ XLSX/XLS",
    "saved_data": "נתונים שמורים",
    "saved_months": "חודשים",
    "reports": "הפקת דוחות",
    "reports_sub": "ניתוח נתונים",
    "settings": "הגדרות מלגה",
    "settings_sub": "סכומים ובונוסים",
    "manage_kollels": "ניהול כוללים",
    "template_title": "חדש במערכת?",
    "template_desc": "הורד קובץ תבנית תואם לתוכנת קל מוסד / JBClock (APT), מלא אותו, והעלה חזרה.",
    "download_template": "הורד תבנית עבודה",
    "processing": "מעבד את",
    "file_error": "יש להעלות קובץ מסוג XLSX או XLS בלבד.",
    
    // Results & Attendance Table
    "results_for": "תוצאות עבור חודש",
    "save_month": "שמור נתוני חודש",
    "data_saved": "הנתונים נשמרו",
    "export_csv": "ייצוא דוח כללי",
    "table_scholar": "שם האברך",
    "table_hours": "סה\"כ שעות לימוד",
    "table_stipend": "מלגה לתשלום",
    "total_payment": "סה\"כ לתשלום",
    "attendance_table_title": "סיכום מלגות",

    // Stipend Detail Modal
    "modal_title": "פירוט חישוב מלגה",
    "for_scholar": "עבור",
    "calc_summary": "סיכום החישוב",
    "final_stipend": "מלגה סופית:",
    "exceptions_management": "ניהול חריגות",
    "fixed_sedarim": "סדרים קבועים לאברך",
    "fixed_sedarim_desc": "קבע באילו סדרים האברך משתתף. החישוב יתבצע רק לפיהם. (הגדרה קבועה)",
    "daily_details_month": "פירוט יומי (לחודש זה)",
    "export": "ייצוא",
    "absent": "לא נכח",
    "late": "איחור",
    "deficit": "חיסור",
    "approve_late": "אישור איחור",
    "approve_absence": "אישור חיסור",
    "base_stipend_label": "מלגת בסיס",
    "attendance_calc_header": "--- חישוב נוכחות ---",
    "required_hours_breakdown": "פירוט שעות נדרשות",
    "days": "ימים",
    "total_required_hours": "סה\"כ שעות נדרשות",
    "total_actual_hours": "סה\"כ שעות בפועל",
    "attendance_percent": "אחוז נוכחות",
    "deductions_header": "--- ניכויים לפי סדר ---",
    "deduction_label": "חיסור",
    "total_deduction_label": "סה\"כ ניכוי",
    "approvals_header": "--- אישורים ---",
    "approved_absence_hours": "שעות חיסור שאושרו",
    "approved_lateness": "איחורים שאושרו",
    "occurrences": "מקרים",
    "bonuses_header": "--- בונוסים ---",
    "rounding_header": "--- עיגול ---",
    "pre_round_sum": "סכום לפני עיגול",
    "round_to_10": "עיגול ל-10 הקרוב",
    "no_daily_details": "אין פירוט יומי זמין.",
    "bonus_failures": "הפסדים בגין איחורים/חיסורים:",
    "per_hour_label": "לשעה",
    "per_day_label": "ליום",

    // Saved Data View
    "load_saved_data": "טעינת נתונים שמורים",
    "month": "חודש",
    "load_btn": "טעינה",
    "delete_month_confirm": "האם אתה בטוח שברצונך למחוק את הנתונים עבור חודש {0}? לא ניתן לשחזר פעולה זו.",
    
    // Settings Component
    "settings_title": "הגדרות מלגה",
    "manual_edit": "עריכה ידנית",
    "ai_assistant": "עוזר AI",
    "ai_desc": "מצב AI מיועד ליצירת תבנית ראשונית. לאחר היצירה תוכלו לערוך את כל ההגדרות המורכבות במצב הידני.",
    "ai_placeholder": "לדוגמה: מלגה חודשית של 2000 שקלים...",
    "generate_btn": "יצירת הגדרות ועריכה",
    "base_settings": "הגדרות בסיס וניכויים",
    "base_stipend_type": "סוג מלגת בסיס:",
    "type_monthly": "חודשית קבועה (סכום גלובלי)",
    "type_daily": "יומית (סכום ליום X ימי עבודה)",
    "calc_method": "שיטת חישוב בסיס:",
    "method_regular": "רגילה (בסיס פחות קנסות)",
    "method_fallback": "בסיס מותנה (שעתי אם לא עומד ביעד)",
    "full_stipend": "מלגת בסיס מלאה (ש\"ח)",
    "daily_target": "יעד שעות יומי (אוטומטי)",
    "high_deduction": "ניכוי לשעה (ש\"ח)",
    "low_deduction": "ניכוי לשעה (נמוך) - ש\"ח",
    "threshold": "סף נוכחות",
    "sedarim": "סדרי לימוד",
    "add_seder": "הוסף סדר",
    "bonuses": "בונוסים ותוספות",
    "global_threshold": "הפעל סף נוכחות גלובלי",
    "advanced": "הגדרות מתקדמות",
    "rounding": "עיגול סכום סופי",
    "rounding_none": "ללא",
    "rounding_10": "עגל למעלה ל-10 הקרוב",
    "export_json": "ייצוא הגדרות (JSON)",
    "import_json": "ייבוא הגדרות",
    "hours": "שעות",

    // Settings Extended (New Features)
    "settings_unified_title": "הגדרות בונוס מאוחדות (חל על כל הסדרים)",
    "enable_punctuality_bonus": "הפעל בונוס שמירת סדרים",
    "late_threshold_min": "סף איחור לבונוס (דק')",
    "fixed_amount": "סכום קבוע",
    "tiered_absences": "מדורג (לפי היעדרויות)",
    "bonus_tiers_title": "מדרגות בונוס (לפי כמות כשלונות/היעדרויות בחודש):",
    "up_to": "עד",
    "absences": "היעדרויות:",
    "per_seder": "לסדר",
    "add_tier": "+ הוסף מדרגה",
    "bonus_amount_nis": "סכום בונוס (ש\"ח)",
    "cancel_after_x": "ביטול אחרי X איחורים",
    "hourly_fallback_desc": "בשיטה זו, אם האברך לא עומד ב\"סף נוכחות מלאה\" (מוגדר למטה), מלגת הבסיס שלו תחושב לפי תעריף שעתי בלבד.",
    "fallback_rate_label": "תעריף לשעה במקרה של אי-עמידה ביעד:",
    "daily_calc_title": "מחשבון תעריף יומי",
    "monthly_target_amount": "סכום יעד חודשי",
    "standard_days_count": "מספר ימי תקן",
    "calculated_daily_rate": "תעריף מחושב ליום:",
    "threshold_full": "סף נוכחות מלאה (%)",
    "threshold_low_deduction": "סף נוכחות לניכוי נמוך (%)",
    "threshold_fallback_hint": "מתחת לסף זה, האברך יעבור לחישוב לפי שעות.",
    "threshold_deduction_hint": "מעל סף זה, יבוצע הניכוי הרגיל לשעה.",
    "stipend_pct_half_day": "אחוז מלגה (לחצי יום)",
    "enable_custom_deductions": "הפעל כללי ניכויים מיוחדים לסדר זה",
    "required_threshold_pct": "סף נוכחות נדרש (%)",
    "bonus_name_ph": "שם הבונוס",
    "amount_ph": "סכום",
    "type_count": "לפי כמות",
    "type_direct": "סכום ישיר",
    "cond_attendance": "תנאי נוכחות:",
    "cond_none": "ללא תנאי (תמיד)",
    "cond_global": "סף גלובלי",
    "cond_custom": "מותאם אישית (מדורג)",
    "bonus_tiers_attendance": "מדרגות בונוס לפי נוכחות:",
    "if_attendance": "אם נוכחות >=",
    "get": "קבל",
    "of_bonus": "% מהבונוס",
    "add_bonus_btn": "הוסף בונוס/תוספת",
    "settings_management": "ניהול הגדרות",
    "confirm_overwrite": "האם אתה בטוח שברצונך לדרוס את ההגדרות הנוכחיות עם ההגדרות מהקובץ?",
    "settings_loaded": "ההגדרות נטענו בהצלחה!",
    "fix_errors": "יש לתקן שגיאות",
    "error_seder_overlap": "חפיפה עם '{0}'",
    "error_seder_time": "זמן הסיום חייב להיות אחרי זמן ההתחלה.",

    // Help / Tooltips
    "help_calc_method": "בחר כיצד לחשב את שכר הבסיס. בשיטה הרגילה יורדים קנסות מסכום קבוע. בשיטה המותנית, אם האברך לא מגיע ליעד השעות, הוא מקבל תשלום לפי שעה בלבד.",
    "help_fallback_rate": "אם האברך לא עמד באחוז הנוכחות הנדרש, זהו התעריף שישולם לו עבור כל שעת לימוד בפועל.",
    "help_full_stipend": "הסכום ההתחלתי של המלגה לפני בונוסים וקנסות.",
    "help_threshold": "מתחת לאחוז זה, יחולו סנקציות (קנס גבוה יותר או מעבר לחישוב שעתי).",
    "help_deduction_rate": "הסכום שיורד ממלגת הבסיס על כל שעת חיסור.",
    "help_seder_times": "שעות ההתחלה והסיום של הסדר. משמש לחישוב שעות ותקן יומי.",
    "help_partial_pct": "אם אברך רשום רק לסדר זה, איזה חלק מהמלגה המלאה הוא זכאי לקבל?",
    "help_early_exit": "דקות ויתור ביציאה. דוגמה: אם מוגדר 5 דקות, יציאה ב-12:55 כשסוף הסדר ב-13:00 לא תחשב כחיסור.",
    "help_punctuality": "סכום הבונוס היומי לאברך שמגיע בזמן ויוצא בזמן.",
    "help_punctuality_late": "כמה דקות איחור עדיין נחשבות כ'בזמן' לצורך קבלת בונוס הנוכחות.",
    "help_punctuality_tiers": "כאן ניתן להגדיר שמספר מסוים של איחורים/חיסורים מבטל את הבונוס או מוריד את ערכו.",
    "help_bonus_attendance": "התניית קבלת הבונוס באחוז נוכחות חודשי כולל.",
    "help_bonus_name": "שם הבונוס כפי שמופיע בקובץ האקסל (למשל 'מבחן')",
    "help_bonus_amount": "הסכום לתשלום עבור כל יחידת בונוס",
    
    // Reports
    "reports_title": "דוחות וניתוחים",
    "back": "חזרה",
    "export_csv_btn": "ייצוא ל-CSV",
    "filter_month": "סינון לפי חודש",
    "select_all": "בחר הכל",
    "filter_scholar": "סינון לפי אברך",
    "scholars_count": "אברכים",
    "total_hours_sum": "שעות בסה\"כ",
    "avg_per_scholar": "ממוצע לאברך",
    "attendance_pct": "אחוז נוכחות",
    "months_count": "חודשים",
    "avg_hours_timeline": "ממוצע שעות לאורך זמן",
    "chart_min_months": "יש לבחור לפחות שני חודשים כדי להציג גרף התקדמות.",
    "hours_by_scholar": "סה\"כ שעות לפי אברך",
    "no_data_filter": "אין נתונים להצגה בסינון הנוכחי.",
    "col_scholar": "אברך",
    "col_total_hours": "סה\"כ שעות",
    "col_attendance": "נוכחות",
    "col_monthly_avg": "ממוצע חודשי",
    "chart_month": "חודש",
    "chart_avg_hours": "ממוצע שעות"
  },
  en: {
    // General
    "app_title": "Kollel Manager",
    "app_subtitle": "Stipend Management System",
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit",
    "delete": "Delete",
    "error": "Error",
    "success": "Success",
    "yes": "Yes",
    "no": "No",
    "close": "Close",

    // Login
    "welcome_title": "Kollel Management System",
    "welcome_subtitle": "Welcome! Please login to continue.",
    "login_google": "Login with Google",
    "login_terms": "By logging in, you agree to the Terms of Service and Privacy Policy.",

    // Header
    "logout": "Logout",
    "admin_badge": "Admin",
    "super_admin": "Super Admin",

    // Kollel Selection
    "select_kollel_title": "Select Kollel",
    "select_kollel_subtitle": "Choose the Kollel you wish to manage.",
    "select_kollel_admin_subtitle": "Total {0} Kollels in system - click to assist owner",
    "no_kollels": "No saved Kollels found. Please add a new one.",
    "add_new_kollel": "Add New Kollel",
    "select_btn": "Select",
    "created_by": "Created by:",
    "shared_with": "Shared with:",
    "base_amount": "Base Amount:",
    "delete_confirm": "Are you sure you want to delete this Kollel? This action cannot be undone.",
    "backup_kollel": "Backup Kollel",
    "restore_kollel": "Restore/Import Backup",
    "backup_success": "Backup downloaded successfully!",
    "restore_success": "Kollel restored successfully!",

    // Setup
    "setup_title_new": "New Kollel Setup",
    "setup_title_edit": "Edit Kollel Details",
    "field_name": "Kollel Name",
    "field_manager": "Manager Name",
    "field_phone": "Contact Phone",
    "field_address": "Address",
    "field_shared": "Share with other Gmail users",
    "field_shared_hint": "Example: user1@gmail.com, user2@gmail.com",
    "save_continue": "Save & Continue",
    "save_changes": "Save Changes",
    "error_name_required": "Kollel name is required.",

    // Dashboard
    "dashboard_title": "Management Options",
    "upload_report": "Upload Report",
    "upload_report_sub": "XLSX/XLS File",
    "saved_data": "Saved Data",
    "saved_months": "Months",
    "reports": "Reports",
    "reports_sub": "Data Analysis",
    "settings": "Stipend Settings",
    "settings_sub": "Amounts & Bonuses",
    "manage_kollels": "Manage Kollels",
    "template_title": "New here?",
    "template_desc": "Download a template compatible with Kal-Mosad / JBClock (APT), fill it, and upload back.",
    "download_template": "Download Template",
    "processing": "Processing",
    "file_error": "Please upload XLSX or XLS files only.",

    // Results & Attendance Table
    "results_for": "Results for",
    "save_month": "Save Month Data",
    "data_saved": "Data Saved",
    "export_csv": "Export CSV",
    "table_scholar": "Scholar Name",
    "table_hours": "Total Hours",
    "table_stipend": "Stipend",
    "total_payment": "Total Payment",
    "attendance_table_title": "Stipend Summary",

    // Stipend Detail Modal
    "modal_title": "Stipend Calculation Details",
    "for_scholar": "For",
    "calc_summary": "Calculation Summary",
    "final_stipend": "Final Stipend:",
    "exceptions_management": "Exceptions Management",
    "fixed_sedarim": "Fixed Sedarim for Scholar",
    "fixed_sedarim_desc": "Determine which sedarim the scholar participates in. Calculation will be based only on these.",
    "daily_details_month": "Daily Details (This Month)",
    "export": "Export",
    "absent": "Absent",
    "late": "Late",
    "deficit": "Deficit",
    "approve_late": "Approve Late",
    "approve_absence": "Approve Absence",
    "base_stipend_label": "Base Stipend",
    "attendance_calc_header": "--- Attendance Calculation ---",
    "required_hours_breakdown": "Required Hours Breakdown",
    "days": "days",
    "total_required_hours": "Total Required Hours",
    "total_actual_hours": "Total Actual Hours",
    "attendance_percent": "Attendance %",
    "deductions_header": "--- Deductions by Seder ---",
    "deduction_label": "Absence",
    "total_deduction_label": "Total Deduction",
    "approvals_header": "--- Approvals ---",
    "approved_absence_hours": "Approved Absence Hours",
    "approved_lateness": "Approved Lateness",
    "occurrences": "occurrences",
    "bonuses_header": "--- Bonuses ---",
    "rounding_header": "--- Rounding ---",
    "pre_round_sum": "Sum before rounding",
    "round_to_10": "Round to nearest 10",
    "no_daily_details": "No daily details available.",
    "bonus_failures": "Failures/Lates:",
    "per_hour_label": "per hour",
    "per_day_label": "per day",

    // Saved Data View
    "load_saved_data": "Load Saved Data",
    "month": "Month",
    "load_btn": "Load",
    "delete_month_confirm": "Are you sure you want to delete data for {0}? This cannot be undone.",

    // Settings Component
    "settings_title": "Stipend Settings",
    "manual_edit": "Manual Edit",
    "ai_assistant": "AI Assistant",
    "ai_desc": "AI mode creates an initial template. You can refine all complex settings in manual mode.",
    "ai_placeholder": "Example: Monthly stipend of 2000 shekels...",
    "generate_btn": "Generate & Edit",
    "base_settings": "Base Settings & Deductions",
    "base_stipend_type": "Base Stipend Type:",
    "type_monthly": "Fixed Monthly (Global Amount)",
    "type_daily": "Daily (Per Day * X Days)",
    "calc_method": "Calculation Method:",
    "method_regular": "Regular (Base minus fines)",
    "method_fallback": "Conditional (Hourly if target missed)",
    "full_stipend": "Full Base Stipend (NIS)",
    "daily_target": "Daily Target (Auto)",
    "high_deduction": "Deduction/Hr (NIS)",
    "low_deduction": "Deduction/Hr (Low) - NIS",
    "threshold": "Attendance Threshold",
    "sedarim": "Learning Sessions (Sedarim)",
    "add_seder": "Add Seder",
    "bonuses": "Bonuses & Additions",
    "global_threshold": "Enable Global Threshold",
    "advanced": "Advanced Settings",
    "rounding": "Final Sum Rounding",
    "rounding_none": "None",
    "rounding_10": "Round up to nearest 10",
    "export_json": "Export Settings (JSON)",
    "import_json": "Import Settings",
    "hours": "Hours",

    // Settings Extended (New Features)
    "settings_unified_title": "Unified Bonus Settings (Applies to all Sedarim)",
    "enable_punctuality_bonus": "Enable Punctuality Bonus",
    "late_threshold_min": "Late Threshold (Mins)",
    "fixed_amount": "Fixed Amount",
    "tiered_absences": "Tiered (By Absences)",
    "bonus_tiers_title": "Bonus Tiers (By monthly failures/absences):",
    "up_to": "Up to",
    "absences": "Absences:",
    "per_seder": "Per Seder",
    "add_tier": "+ Add Tier",
    "bonus_amount_nis": "Bonus Amount (NIS)",
    "cancel_after_x": "Cancel after X latenesses",
    "hourly_fallback_desc": "In this method, if the scholar does not meet the \"Full Attendance Threshold\", the base stipend is calculated by hourly rate only.",
    "fallback_rate_label": "Hourly rate if target missed:",
    "daily_calc_title": "Daily Rate Calculator",
    "monthly_target_amount": "Monthly Target Amount",
    "standard_days_count": "Standard Days Count",
    "calculated_daily_rate": "Calculated Daily Rate:",
    "threshold_full": "Full Attendance Threshold (%)",
    "threshold_low_deduction": "Low Deduction Threshold (%)",
    "threshold_fallback_hint": "Below this threshold, calculation switches to hourly.",
    "threshold_deduction_hint": "Above this threshold, standard hourly deduction applies.",
    "stipend_pct_half_day": "Stipend Percentage (Half Day)",
    "enable_custom_deductions": "Enable custom deduction rules",
    "required_threshold_pct": "Required Threshold (%)",
    "bonus_name_ph": "Bonus Name",
    "amount_ph": "Amount",
    "type_count": "By Count",
    "type_direct": "Direct Amount",
    "cond_attendance": "Attendance Condition:",
    "cond_none": "No Condition (Always)",
    "cond_global": "Global Threshold",
    "cond_custom": "Custom (Tiered)",
    "bonus_tiers_attendance": "Bonus Tiers by Attendance:",
    "if_attendance": "If Attendance >=",
    "get": "Get",
    "of_bonus": "% of Bonus",
    "add_bonus_btn": "Add Bonus/Addition",
    "settings_management": "Settings Management",
    "confirm_overwrite": "Are you sure you want to overwrite current settings with the file?",
    "settings_loaded": "Settings loaded successfully!",
    "fix_errors": "Fix Errors",
    "error_seder_overlap": "Overlap with '{0}'",
    "error_seder_time": "End time must be after start time.",

    // Help / Tooltips
    "help_calc_method": "Choose calculation logic. 'Regular' subtracts fines from a base. 'Conditional' switches to hourly pay if target is missed.",
    "help_fallback_rate": "If attendance is below threshold, pay this rate per actual hour.",
    "help_full_stipend": "Starting amount before any deductions.",
    "help_threshold": "Below this %, sanctions apply (higher fine or fallback mode).",
    "help_deduction_rate": "Amount deducted from base stipend per hour of absence.",
    "help_seder_times": "Start/End times for calculation.",
    "help_partial_pct": "Percentage of base stipend if enrolled only in this seder.",
    "help_early_exit": "Minutes allowed to leave early without penalty (if arrived on time).",
    "help_punctuality": "Daily bonus for on-time arrival/departure.",
    "help_punctuality_late": "Grace period in minutes for arriving late but still receiving the bonus.",
    "help_punctuality_tiers": "Reduce/cancel bonus based on number of monthly failures.",
    "help_bonus_attendance": "Condition bonus on overall monthly attendance %.",
    "help_bonus_name": "Name as it appears in Excel (e.g. 'Exam')",
    "help_bonus_amount": "Amount to pay per bonus unit",
    
    // Reports
    "reports_title": "דוחות וניתוחים",
    "back": "חזרה",
    "export_csv_btn": "ייצוא ל-CSV",
    "filter_month": "סינון לפי חודש",
    "select_all": "בחר הכל",
    "filter_scholar": "סינון לפי אברך",
    "scholars_count": "אברכים",
    "total_hours_sum": "שעות בסה\"כ",
    "avg_per_scholar": "ממוצע לאברך",
    "attendance_pct": "אחוז נוכחות",
    "months_count": "חודשים",
    "avg_hours_timeline": "ממוצע שעות לאורך זמן",
    "chart_min_months": "יש לבחור לפחות שני חודשים כדי להציג גרף התקדמות.",
    "hours_by_scholar": "סה\"כ שעות לפי אברך",
    "no_data_filter": "אין נתונים להצגה בסינון הנוכחי.",
    "col_scholar": "אברך",
    "col_total_hours": "סה\"כ שעות",
    "col_attendance": "נוכחות",
    "col_monthly_avg": "ממוצע חודשי",
    "chart_month": "חודש",
    "chart_avg_hours": "ממוצע שעות"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // 1. Check local storage
    const saved = localStorage.getItem('app_language');
    if (saved === 'en' || saved === 'he') return saved;

    // 2. Check browser language
    try {
        const browserLang = navigator.language.toLowerCase();
        // Only if browser is explicitly English, use English
        if (browserLang.startsWith('en')) {
            return 'en';
        }
    } catch (e) {
        console.warn('Could not detect browser language', e);
    }

    // 3. Default to Hebrew for everyone else (including unknown)
    return 'he';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
    const dir = language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    // @ts-ignore
    return translations[language][key] || key;
  };

  const dir = language === 'he' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
