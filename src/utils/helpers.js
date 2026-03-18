import {
  eachDayOfInterval,
  getDay,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isAfter,
  isBefore,
  isSameDay,
  differenceInCalendarDays,
  parseISO,
  addDays,
  isWithinInterval,
  startOfQuarter,
  endOfQuarter,
  subDays,
} from 'date-fns';

// ─── Working Days (exclude Sundays, Holidays, Week-offs) ───────
export function getWorkingDays(startDate, endDate, publicHolidays = [], userWeekOffs = []) {
  if (!startDate || !endDate) return 0;
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  if (isAfter(start, end)) return 0;
  
  const days = eachDayOfInterval({ start, end });
  const holidayDates = publicHolidays.map(h => typeof h === 'string' ? h : h.date);
  const weekOffDates = userWeekOffs.map(w => typeof w === 'string' ? w : w.date);

  return days.filter((d) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const isSunday = getDay(d) === 0;
    const isHoliday = holidayDates.includes(dateStr);
    const isWeekOff = weekOffDates.includes(dateStr);
    return !isSunday && !isHoliday && !isWeekOff;
  }).length;
}

export function getWorkingDaysInMonth(year, month, publicHolidays = [], userWeekOffs = []) {
  const start = startOfMonth(new Date(year, month));
  const today = new Date();
  const monthEnd = endOfMonth(new Date(year, month));
  const end = isBefore(monthEnd, today) ? monthEnd : today;
  return getWorkingDays(start, end, publicHolidays, userWeekOffs);
}

// ─── Utilization ───────────────────────────────────────────
export function calculateUtilization(loggedHours, workingDays, dailyCapacity = 8) {
  const expected = workingDays * dailyCapacity;
  if (expected === 0) return { expected, logged: loggedHours, percentage: 0 };
  return {
    expected,
    logged: loggedHours,
    percentage: Math.round((loggedHours / expected) * 100),
  };
}

// ─── Date formatting ──────────────────────────────────────
export function formatDate(date, fmt = 'dd MMM yyyy') {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt);
}

export function toDateString(date) {
  const d = date?.toDate ? date.toDate() : date;
  return format(d, 'yyyy-MM-dd');
}

// ─── Days in stage ─────────────────────────────────────────
export function daysInCurrentStage(statusHistory) {
  if (!statusHistory || statusHistory.length === 0) return 0;
  const lastEntry = statusHistory[statusHistory.length - 1];
  const enteredAt = lastEntry.timestamp?.toDate
    ? lastEntry.timestamp.toDate()
    : new Date(lastEntry.timestamp);
  return getWorkingDays(enteredAt, new Date());
}

// ─── Overdue check ─────────────────────────────────────────
export function isOverdue(ticket) {
  if (ticket.status !== 'ready_for_feedback') return false;
  const days = daysInCurrentStage(ticket.statusHistory);
  return days > 3;
}

// ─── Badge color maps ──────────────────────────────────────
export const TICKET_TYPE_COLORS = {
  webinar: { bg: '#E8EDF7', text: '#2557A7' },
  video: { bg: '#FFF7ED', text: '#9A3412' },
  screengrabs: { bg: '#ECFDF5', text: '#065F46' },
  motion_graphics: { bg: '#F5F0FF', text: '#6D28D9' },
  other: { bg: '#F3F2F1', text: '#4B5563' },
};

export const PRIORITY_COLORS = {
  high: { bg: '#FEE2E2', text: '#C91B1B' },
  medium: { bg: '#FFF7ED', text: '#9A3412' },
  low: { bg: '#ECFDF5', text: '#0D7A3F' },
};

export const STATUS_COLORS = {
  todo: { bg: '#F3F2F1', text: '#4B5563' },
  in_production: { bg: '#E8EDF7', text: '#2557A7' },
  ready_for_feedback: { bg: '#FFF7ED', text: '#9A3412' },
  feedback_ready: { bg: '#FEE2E2', text: '#C91B1B' },
  completed: { bg: '#ECFDF5', text: '#0D7A3F' },
};

export const FEEDBACK_CATEGORY_COLORS = {
  ui: { bg: '#EEF2FF', text: '#4338CA' },
  voiceover: { bg: '#FDF4FF', text: '#7E22CE' },
  animation: { bg: '#FFF7ED', text: '#C2410C' },
  storyboard: { bg: '#F0FDF4', text: '#166534' },
  text: { bg: '#EFF6FF', text: '#1D4ED8' },
  timing: { bg: '#FFF1F2', text: '#BE123C' },
  other: { bg: '#F9FAFB', text: '#374151' },
};

export const STATUS_LABELS = {
  todo: 'To Do',
  in_production: 'In Production',
  ready_for_feedback: 'Ready for Feedback',
  feedback_ready: 'Feedback Ready',
  completed: 'Completed',
};

export const TYPE_LABELS = {
  webinar: 'Webinar',
  video: 'Video',
  screengrabs: 'Screengrabs',
  motion_graphics: 'Motion Graphics',
  other: 'Other',
};

export const KANBAN_COLUMNS = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_production', label: 'In Production' },
  { id: 'ready_for_feedback', label: 'Ready for Feedback' },
  { id: 'feedback_ready', label: 'Feedback Ready' },
  { id: 'completed', label: 'Completed' },
];

// ─── LDAP Accounts ─────────────────────────────────────────
export const LDAP_ACCOUNTS = [
  { id: 'arcgate_arshadh', label: 'arcgate_arshadh' },
  { id: 'arcgate_jrathore', label: 'arcgate_jrathore' },
];

// ─── Roles ─────────────────────────────────────────────────
export const ROLE_LABELS = {
  admin: 'Admin',
  moderator: 'Moderator',
  designer: 'Designer',
  pending: 'Pending',
};

export const ROLE_COLORS = {
  admin: { bg: '#E8EDF7', text: '#2557A7' },
  moderator: { bg: '#F5F0FF', text: '#6D28D9' },
  designer: { bg: '#ECFDF5', text: '#065F46' },
  pending: { bg: '#FFF7ED', text: '#9A3412' },
};

// ─── Frame.io comment auto-categorization ──────────────────
export function categorizeComment(text) {
  const lower = (text || '').toLowerCase();
  if (/voice|vo\b|audio|narrat|sound/.test(lower)) return 'voiceover';
  if (/animat|motion|transition|keyframe|ease|bounce/.test(lower)) return 'animation';
  if (/storyboard|script|story|scene|sequence|slide/.test(lower)) return 'storyboard';
  if (/\btext\b|copy|font|typo|caption|subtitle|title|heading/.test(lower)) return 'text';
  if (/timing|duration|speed|slow|fast|pace/.test(lower)) return 'timing';
  if (/\bui\b|design|layout|colou?r|brand|logo|icon|graphic/.test(lower)) return 'ui';
  return 'other';
}

export function categorizeCommentType(text) {
  const lower = (text || '').toLowerCase();
  if (/error|mistake|wrong|incorrect|fix|broken|not working|doesn't/.test(lower)) return 'error';
  return 'update';
}

// ─── Week helpers ──────────────────────────────────────────
export function getWeekDays(date) {
  const start = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  return Array.from({ length: 7 }, (_, i) => addDays(start, i)); // Sun-Sat
}

export function getMonthDateRange(year, month) {
  return {
    start: startOfMonth(new Date(year, month)),
    end: endOfMonth(new Date(year, month)),
  };
}

// ─── Video duration formatter ──────────────────────────────
export function formatDuration(seconds) {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// ─── Financial Year Helpers ────────────────────────────────
export function getCurrentFinancialYear() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed, 3 = April
  if (month >= 3) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export function getFYResetDate(fy) {
  const startYear = parseInt(fy.split('-')[0]);
  return `${startYear}-04-01`;
}

// ─── Shift Helpers ──────────────────────────────────────────
export function calculateShiftEnd(startTimeStr) {
  if (!startTimeStr) return '';
  const [hours, minutes] = startTimeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  const endDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return format(endDate, 'HH:mm'); // Keep database format as HH:mm for sorted storage
}

export function formatShiftTime(timeStr) {
  if (!timeStr) return '';
  // Handle both HH:mm and full ISO strings
  let hours, minutes;
  if (timeStr.includes(':')) {
    [hours, minutes] = timeStr.split(':').map(Number);
  } else {
    const d = new Date(timeStr);
    hours = d.getHours();
    minutes = d.getMinutes();
  }
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, 'h:mm a'); // 12-hour format without leading zero
}

export function parseHHMM(timeStr) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// ─── Status Colors (Updated) ───────────────────────────────
export const ATTENDANCE_STATUS_COLORS = {
  working: { bg: '#ECFDF5', text: '#16A34A', border: '#16A34A' },
  half_day: { bg: '#FEF3C7', text: '#D97706', border: '#D97706' },
  early_leave: { bg: '#FFF7ED', text: '#C2410C', border: '#C2410C' },
  leave: { bg: '#FEE2E2', text: '#DC2626', border: '#DC2626' },
  holiday: { bg: '#FEF9C3', text: '#92400E', border: '#92400E' },
  comp_off: { bg: '#EAF0FD', text: '#0451CC', border: '#0451CC' },
  week_off: { bg: '#EEF2FF', text: '#4338CA', border: '#4338CA' },
  sunday: { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
};

export const ATTENDANCE_STATUS_LABELS = {
  working: 'Working',
  half_day: 'Half Day',
  early_leave: 'Early Leave',
  leave: 'Leave',
  holiday: 'Holiday',
  comp_off: 'Comp-off',
  week_off: 'Week-off',
  sunday: 'Sunday',
};
