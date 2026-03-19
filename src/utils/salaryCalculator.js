import { 
  format, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  getDay, 
  isSameDay, 
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  addDays
} from 'date-fns';

/**
 * Calculates monthly salary breakdown for a user.
 * 
 * @param {string} userId
 * @param {string} yearMonth - YYYY-MM
 * @param {Array} attendanceRecords - Attendance collection for that user/month
 * @param {Array} timeEntries - Time entries for that user/month
 * @param {Array} publicHolidays - [{ date: 'YYYY-MM-DD', ... }]
 * @param {Object} leaveBalance - Leave balance document for user
 * @param {Object} salaryProfile - { monthlySalary, ... }
 */
export function calculateMonthlySalary(
  userId,
  yearMonth,
  attendanceRecords = [],
  timeEntries = [],
  publicHolidays = [],
  leaveBalance = {},
  salaryProfile = {}
) {
  const [year, month] = yearMonth.split('-').map(Number);
  const monthDate = new Date(year, month - 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalCalendarDays = calendarDays.length;

  const monthlySalary = salaryProfile.monthlySalary || 0;
  const dailyRate = monthlySalary / totalCalendarDays;
  const hourlyRate = dailyRate / 8;
  const overtimeHourlyRate = hourlyRate * 1.5;

  let baseSalary = monthlySalary;
  let sundayBonusCount = 0;
  let sundayBonusAmount = 0;
  let holidayBonusCount = 0;
  let holidayBonusAmount = 0;
  let overtimeHours = 0;
  let overtimeAmount = 0;

  let halfDayCount = 0;
  let halfDayDeductionAmount = 0;
  let earlyLeaveHalfDays = 0;
  let earlyLeaveDeductionAmount = 0;
  let leaveWithoutBalanceCount = 0;
  let leaveWithoutBalanceAmount = 0;
  let sickLeaveWithoutBalanceCount = 0;
  let sickLeaveWithoutBalanceAmount = 0;
  let festivalLeaveWithoutBalanceCount = 0;
  let festivalLeaveWithoutBalanceAmount = 0;

  // Process day by day logic
  const holidayDates = publicHolidays.map(h => typeof h === 'string' ? h : h.date);

  calendarDays.forEach((date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const att = attendanceRecords.find(a => a.date === dateStr);
    const dayEntries = timeEntries.filter(e => e.date === dateStr);
    const totalHoursLogged = dayEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
    
    const isSunday = getDay(date) === 0;
    const isPublicHoliday = holidayDates.includes(dateStr);
    
    // 1. Deductions
    if (att) {
      if (att.status === 'half_day') {
        halfDayCount += 0.5;
        halfDayDeductionAmount += 0.5 * dailyRate;
      }

      if (att.status === 'leave') {
        const type = att.leaveType || 'normal';
        const isHalfDayLeave = att.isHalfDay === true;
        const multiplier = isHalfDayLeave ? 0.5 : 1.0;

        if (type === 'normal') {
          if ((leaveBalance.normalLeaveBalance || 0) <= 0) {
            leaveWithoutBalanceCount += multiplier;
            leaveWithoutBalanceAmount += multiplier * dailyRate;
          }
        } else if (type === 'sick') {
          if (((leaveBalance.sickLeaveAllotted || 0) - (leaveBalance.sickLeaveTaken || 0)) <= 0) {
            sickLeaveWithoutBalanceCount += multiplier;
            sickLeaveWithoutBalanceAmount += multiplier * dailyRate;
          }
        } else if (type === 'festival') {
          if (leaveBalance.festivalLeaveUsed === true) {
            festivalLeaveWithoutBalanceCount += multiplier;
            festivalLeaveWithoutBalanceAmount += multiplier * dailyRate;
          }
        }
      }
    }

    // 2. Overtime logic
    if (totalHoursLogged > 8) {
      const otHrsToday = totalHoursLogged - 8;
      overtimeHours += otHrsToday;
      overtimeAmount += otHrsToday * overtimeHourlyRate;
    }

    // 3. Sunday Bonus logic
    if (isSunday && totalHoursLogged > 0) {
      // Check for week_off in the same ISO week (Mon-Sat of the same week)
      // Since our app treats Sunday as the start of the week:
      const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
      const monDate = addDays(weekStart, 1);
      const satDate = addDays(weekStart, 6);
      
      const hasWeekOff = attendanceRecords.some(a => {
        const d = parseISO(a.date);
        return a.status === 'week_off' && 
               isWithinInterval(d, { start: monDate, end: satDate });
      });

      if (!hasWeekOff && !isPublicHoliday) {
        sundayBonusCount++;
        sundayBonusAmount += dailyRate * 0.5; // Total 1.5x (1.0 base + 0.5 bonus)
      }
    }

    // 4. Public Holiday Bonus logic
    if (isPublicHoliday && totalHoursLogged > 0) {
      holidayBonusCount++;
      holidayBonusAmount += dailyRate * 1.5; // Total 2.5x (1.0 base + 1.5 bonus)
    }
  });

  // 5. Early Leave Deduction (monthly accumulation rule)
  // Accumulation of early leave reaches 240 mins -> 0.5 * dailyRate deducted
  const totalEarlyLeaveMinutes = attendanceRecords.reduce((sum, a) => sum + (a.earlyLeaveMinutes || 0), 0);
  earlyLeaveHalfDays = Math.floor(totalEarlyLeaveMinutes / 240);
  earlyLeaveDeductionAmount = earlyLeaveHalfDays * 0.5 * dailyRate;

  const totalEarnings = monthlySalary + (sundayBonusAmount || 0) + (holidayBonusAmount || 0) + (overtimeAmount || 0);
  const totalDeductions = (halfDayDeductionAmount || 0) + (earlyLeaveDeductionAmount || 0) + 
                          (leaveWithoutBalanceAmount || 0) + (sickLeaveWithoutBalanceAmount || 0) + (festivalLeaveWithoutBalanceAmount || 0);
  
  const netSalary = Math.max(0, totalEarnings - totalDeductions);

  return {
    userId,
    month: yearMonth,
    monthlySalary,
    totalCalendarDays,
    dailyRate,
    hourlyRate,
    overtimeHourlyRate,

    // Earnings
    baseSalary: monthlySalary,
    sundayBonusCount,
    sundayBonusAmount,
    holidayBonusCount,
    holidayBonusAmount,
    overtimeHours,
    overtimeAmount,
    totalEarnings,

    // Deductions
    halfDayCount,
    halfDayDeductionAmount,
    earlyLeaveHalfDays,
    earlyLeaveDeductionAmount,
    leaveWithoutBalanceCount,
    leaveWithoutBalanceAmount,
    sickLeaveWithoutBalanceCount,
    sickLeaveWithoutBalanceAmount,
    festivalLeaveWithoutBalanceCount,
    festivalLeaveWithoutBalanceAmount,
    totalDeductions,

    // Final
    netSalary,
    updatedAt: new Date()
  };
}
