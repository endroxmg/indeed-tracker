import {
  eachDayOfInterval,
  getDay,
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  eachMonthOfInterval,
  parseISO,
  isAfter,
  isBefore,
  isSameDay,
  min as minDate,
  max as maxDate,
} from 'date-fns';

// ─── Core: count working days (exclude Sundays) ────────────
export function getWorkingDaysInRange(start, end) {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  if (isAfter(s, e)) return 0;
  return eachDayOfInterval({ start: s, end: e }).filter(d => getDay(d) !== 0).length;
}

// ─── Get list of working dates in range ────────────────────
export function getWorkingDatesInRange(start, end) {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  if (isAfter(s, e)) return [];
  return eachDayOfInterval({ start: s, end: e }).filter(d => getDay(d) !== 0);
}

// ─── Timestamp → JS Date helper ───────────────────────────
function toDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (typeof val === 'string') return parseISO(val);
  if (val instanceof Date) return val;
  return new Date(val);
}

// ─── Days a ticket spent in a specific status ──────────────
// Loops through statusHistory intervals and counts working
// days where the ticket was in the given status,
// clamped to [rangeStart, rangeEnd].
export function getDaysInStatus(ticket, status, rangeStart, rangeEnd) {
  const history = ticket.statusHistory || [];
  if (history.length === 0) return 0;
  const rStart = typeof rangeStart === 'string' ? parseISO(rangeStart) : rangeStart;
  const rEnd = typeof rangeEnd === 'string' ? parseISO(rangeEnd) : rangeEnd;
  let totalDays = 0;

  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    if (entry.status !== status) continue;

    const entryStart = toDate(entry.timestamp);
    // Find exit: next entry's timestamp, or rangeEnd if still in that status
    const nextEntry = history[i + 1];
    const entryEnd = nextEntry ? toDate(nextEntry.timestamp) : new Date();

    if (!entryStart || !entryEnd) continue;

    // Clamp to range
    const clampedStart = maxDate([entryStart, rStart]);
    const clampedEnd = minDate([entryEnd, rEnd]);

    if (isAfter(clampedStart, clampedEnd)) continue;
    totalDays += getWorkingDaysInRange(clampedStart, clampedEnd);
  }
  return totalDays;
}

export function getArcgateProductiveTime(ticket, rangeStart, rangeEnd) {
  return getDaysInStatus(ticket, 'in_production', rangeStart, rangeEnd);
}

export function getIndeedReviewTime(ticket, rangeStart, rangeEnd) {
  return getDaysInStatus(ticket, 'ready_for_feedback', rangeStart, rangeEnd);
}

// ─── Feedback Rounds ───────────────────────────────────────
// Count versions that have at least 1 feedback item
export function getFeedbackRounds(ticket) {
  return (ticket.versions || []).filter(v => (v.feedbackItems?.length || 0) > 0).length;
}

// ─── Total Feedback Count ──────────────────────────────────
export function getTotalFeedbackCount(ticket) {
  return (ticket.versions || []).reduce(
    (sum, v) => sum + (v.feedbackItems?.length || 0), 0
  );
}

// ─── Feedback breakdown by category + type ─────────────────
export function getFeedbackBreakdown(ticket) {
  const counts = {};
  (ticket.versions || []).forEach(v => {
    (v.feedbackItems || []).forEach(fb => {
      const cat = fb.category || 'other';
      const type = fb.type || 'update';
      const key = `${cat}_${type}`;
      counts[key] = (counts[key] || 0) + 1;
    });
  });
  return counts;
}

// ─── Feedback per category (combined update+error) ─────────
export function getFeedbackByCategory(ticket) {
  const counts = {};
  (ticket.versions || []).forEach(v => {
    (v.feedbackItems || []).forEach(fb => {
      const cat = fb.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
  });
  return counts;
}

// ─── Daily team hours ──────────────────────────────────────
export function getDailyTeamHours(dateStr, timeEntries) {
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (getDay(d) === 0) return 0; // Skip Sundays
  const formatted = format(d, 'yyyy-MM-dd');
  return timeEntries
    .filter(e => e.date === formatted)
    .reduce((sum, e) => sum + (e.hours || 0), 0);
}

// ─── Duration formatter: seconds → MM:SS ───────────────────
export function formatVideoDuration(seconds) {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// ─── Duration in minutes (decimal) ─────────────────────────
export function durationInMinutes(seconds) {
  if (!seconds) return null;
  return Math.round((seconds / 60) * 100) / 100;
}

// ─── Filter tickets by date range ──────────────────────────
export function ticketsCreatedInRange(tickets, start, end) {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  return tickets.filter(t => {
    const created = toDate(t.createdAt);
    return created && created >= s && created <= e;
  });
}

export function ticketsCompletedInRange(tickets, start, end) {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  return tickets.filter(t => {
    if (t.status !== 'completed' || !t.completedAt) return false;
    const completed = toDate(t.completedAt);
    return completed && completed >= s && completed <= e;
  });
}

// ─── Tickets relevant to a range ───────────────────────────
// Tickets that were active during the range (created before end, not completed before start)
export function ticketsActiveInRange(tickets, start, end) {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  return tickets.filter(t => {
    const created = toDate(t.createdAt);
    if (!created || isAfter(created, e)) return false;
    if (t.completedAt) {
      const completed = toDate(t.completedAt);
      if (completed && isBefore(completed, s)) return false;
    }
    return true;
  });
}

// ─── 6-month trend data ────────────────────────────────────
export function getSixMonthTrendData(tickets, timeEntries, users) {
  const now = new Date();
  const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
  const activeDesigners = users.filter(u => u.isActive && (u.roles?.includes('designer') || u.role === 'designer'));
  const totalCapacity = activeDesigners.reduce((s, u) => s + (u.dailyCapacity || 8), 0);

  return months.map(m => {
    const ms = startOfMonth(m);
    const me = endOfMonth(m);
    const label = format(m, 'MMM');

    const completed = ticketsCompletedInRange(tickets, ms, me);
    const active = ticketsActiveInRange(tickets, ms, me);

    const avgFb = active.length > 0
      ? Math.round(active.reduce((s, t) => s + getTotalFeedbackCount(t), 0) / active.length * 10) / 10
      : 0;

    const workingDays = getWorkingDaysInRange(ms, isBefore(me, now) ? me : now);
    const expectedHrs = workingDays * totalCapacity;
    const msStr = format(ms, 'yyyy-MM-dd');
    const meStr = format(isBefore(me, now) ? me : now, 'yyyy-MM-dd');
    const loggedHrs = timeEntries
      .filter(e => e.date >= msStr && e.date <= meStr)
      .reduce((s, e) => s + (e.hours || 0), 0);
    const utilPct = expectedHrs > 0 ? Math.round((loggedHrs / expectedHrs) * 100) : 0;

    return {
      month: label,
      ticketsCompleted: completed.length,
      avgFeedback: avgFb,
      utilization: utilPct,
    };
  });
}

// ─── Feedback category colors ──────────────────────────────
export const FEEDBACK_COLORS = {
  ui: '#0451CC',
  voiceover: '#DC2626',
  storyboard: '#16A34A',
  animation: '#D97706',
  text: '#7C3AED',
  timing: '#0891B2',
  other: '#6B7280',
};

export const FEEDBACK_LABELS = {
  ui: 'UI',
  voiceover: 'VO Script',
  storyboard: 'Storyboard',
  animation: 'Animation',
  text: 'Text',
  timing: 'Timing',
  other: 'Other',
};

// ─── Simple linear regression for scatter ──────────────────
export function linearRegression(data) {
  if (data.length < 2) return null;
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  data.forEach(p => { sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumXX += p.x * p.x; });
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  if (!isFinite(slope) || !isFinite(intercept)) return null;
  return { slope, intercept };
}
