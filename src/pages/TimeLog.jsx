import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { subscribeUsers, subscribeTickets, addTimeEntry, deleteTimeEntry, logActivity } from '../services/firestoreService';
import { getWeekDays, getWorkingDays } from '../utils/helpers';
import LogTimeModal from '../components/LogTimeModal';
import { SkeletonTable } from '../components/Skeleton';
import { ChevronLeft, ChevronRight, Clock, Calendar, Plus } from 'lucide-react';
import { format, addWeeks, subWeeks, startOfMonth, endOfMonth, getDay, startOfWeek } from 'date-fns';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

function InitialsAvatar({ name, size = 28 }) {
  const initials = (name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--color-primary)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, fontFamily: '"Poppins", sans-serif',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function TimeLog() {
  const { userDoc } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [logModal, setLogModal] = useState(null);

  useEffect(() => {
    const unsub1 = subscribeUsers(setUsers);
    const unsub2 = subscribeTickets(setTickets);
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    const monthStart = format(startOfMonth(weekStart), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(weekStart), 'yyyy-MM-dd');
    const q = query(
      collection(db, 'timeEntries'),
      where('date', '>=', monthStart),
      where('date', '<=', monthEnd),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setTimeEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [weekStart]);

  const weekDays = getWeekDays(weekStart);
  const designers = users.filter((u) => u.isActive && (u.roles?.includes('designer') || u.role === 'designer'));

  const getHoursForCell = (userId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timeEntries
      .filter((e) => e.userId === userId && e.date === dateStr)
      .reduce((sum, e) => sum + (e.hours || 0), 0);
  };

  const getEntriesForDate = (userId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timeEntries.filter((e) => e.userId === userId && e.date === dateStr);
  };

  const getCellColor = (hours) => {
    if (hours === 0) return { bg: 'var(--color-surface)', color: 'var(--color-secondary-text)' };
    if (hours < 5) return { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' };
    if (hours < 8) return { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' };
    if (hours === 8) return { bg: 'var(--color-primary)', color: '#fff' };
    return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981' };
  };

  const handleSaveTime = async (userId, rows) => {
    try {
      const dateStr = logModal.dateStr;
      const existing = getEntriesForDate(userId, logModal.date);
      for (const e of existing) {
        await deleteTimeEntry(e.id);
      }
      for (const row of rows) {
        await addTimeEntry({
          userId,
          ticketId: row.category === 'ticket' ? row.ticketId : null,
          date: dateStr,
          hours: parseFloat(row.hours),
          category: row.category,
          notes: row.notes || '',
        });
      }
      const totalHours = rows.reduce((s, r) => s + parseFloat(r.hours || 0), 0);
      await logActivity({
        userId: userDoc.uid,
        type: 'time_logged',
        ticketId: null,
        description: `${users.find(u => u.uid === userId)?.name || 'User'} logged ${totalHours}h for ${dateStr}`,
      });
      setLogModal(null);
      toast.success('Time saved successfully');
    } catch (err) {
      console.error('Time log error:', err);
      toast.error('Failed to save time: ' + (err.message || ''));
    }
  };

  const monthSummary = useMemo(() => {
    const now = new Date();
    const mStart = startOfMonth(weekStart);
    const mEnd = endOfMonth(weekStart);
    const effectiveEnd = mEnd > now ? now : mEnd;

    return designers.map((user) => {
      const workDays = getWorkingDays(mStart, effectiveEnd);
      const expected = workDays * (user.dailyCapacity || 8);
      const logged = timeEntries
        .filter((e) => e.userId === user.uid)
        .reduce((s, e) => s + (e.hours || 0), 0);
      const pct = expected > 0 ? Math.round((logged / expected) * 100) : 0;

      let statusColor, statusLabel;
      if (pct >= 100) { statusColor = { bg: 'var(--color-primary-light)', text: 'var(--color-primary)' }; statusLabel = 'Exceeded'; }
      else if (pct >= 90) { statusColor = { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' }; statusLabel = 'On Target'; }
      else if (pct >= 70) { statusColor = { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' }; statusLabel = 'Good'; }
      else { statusColor = { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' }; statusLabel = 'Low'; }

      return { user, workDays, expected, logged, pct, statusColor, statusLabel };
    });
  }, [designers, timeEntries, weekStart]);

  if (loading) return <SkeletonTable rows={6} cols={8} />;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 24, color: '#fff', margin: '0 0 8px' }}>
          Time Log
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-secondary-text)', margin: 0, fontWeight: 500 }}>
          Track and log working hours across the team.
        </p>
      </div>

      {/* Header with Log Time button */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        {/* Week Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setWeekStart(subWeeks(weekStart, 1))} style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10,
            padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s',
          }} className="hover:bg-[var(--color-surface-hover)]">
            <ChevronLeft size={18} color="var(--color-secondary-text)" />
          </button>
          <span style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>
            Week of {format(weekStart, 'dd MMM yyyy')}
          </span>
          <button onClick={() => setWeekStart(addWeeks(weekStart, 1))} style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10,
            padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s',
          }} className="hover:bg-[var(--color-surface-hover)]">
            <ChevronRight size={18} color="var(--color-secondary-text)" />
          </button>
        </div>

        {/* Log Time Button */}
        <button
          onClick={() => setLogModal({
            date: new Date(),
            dateStr: format(new Date(), 'yyyy-MM-dd'),
            userId: userDoc.uid,
          })}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
        >
          <Plus size={18} /> Log Time
        </button>
      </div>

      {/* Weekly Grid */}
      <div style={{
        background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden', marginBottom: 32,
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-hover)' }}>
              <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-text)', fontFamily: '"Poppins", sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', width: 220 }}>
                LDAP Account
              </th>
              {weekDays.map((day) => {
                const isSunday = getDay(day) === 0;
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                  <th key={day.toISOString()} style={{
                    padding: '16px 8px', textAlign: 'center', fontSize: 12, fontWeight: 700,
                    color: isSunday ? 'rgba(255,255,255,0.3)' : isToday ? 'var(--color-primary)' : 'var(--color-secondary-text)',
                    fontFamily: '"Poppins", sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: isToday ? 'var(--color-primary-light)' : undefined,
                  }}>
                    {format(day, 'EEE')}<br />
                    <span style={{ fontWeight: 600, fontSize: 11 }}>{format(day, 'dd MMM')}</span>
                  </th>
                );
              })}
              <th style={{ padding: '16px 8px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-text)', fontFamily: '"Poppins", sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {designers.map((user) => {
              const weekTotal = weekDays.reduce((s, d) => s + getHoursForCell(user.uid, d), 0);
              return (
                <tr key={user.uid} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }} className="hover:bg-[var(--color-surface-hover)]">
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <InitialsAvatar name={user.ldap || user.name} size={36} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{user.ldap || 'LDAP Missing'}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-secondary-text)', fontWeight: 500 }}>{user.name}</span>
                      </div>
                    </div>
                  </td>
                  {weekDays.map((day) => {
                    const isSunday = getDay(day) === 0;
                    const hours = getHoursForCell(user.uid, day);
                    const cellColor = isSunday ? { bg: 'transparent', color: 'rgba(255,255,255,0.2)' } : getCellColor(hours);
                    return (
                      <td key={day.toISOString()} style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <button
                          onClick={() => !isSunday && setLogModal({
                            date: day,
                            dateStr: format(day, 'yyyy-MM-dd'),
                            userId: user.uid,
                          })}
                          disabled={isSunday}
                          style={{
                            width: '100%', padding: '12px 4px', borderRadius: 10,
                            border: isSunday ? 'none' : '1px solid rgba(255,255,255,0.05)',
                            background: cellColor.bg, color: cellColor.color,
                            fontSize: 14, fontWeight: 700, cursor: isSunday ? 'default' : 'pointer',
                            transition: 'all 0.2s ease',
                            fontFamily: '"Poppins", sans-serif',
                          }}
                          onMouseEnter={(e) => { if (!isSunday && hours === 0) { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-surface-hover)'; } }}
                          onMouseLeave={(e) => { if (!isSunday && hours === 0) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.background = cellColor.bg; } }}
                        >
                          {isSunday ? '—' : hours > 0 ? `${hours}h` : '—'}
                        </button>
                      </td>
                    );
                  })}
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 800, fontSize: 15, fontFamily: '"Poppins", sans-serif', color: 'var(--color-primary)' }}>
                    {weekTotal}h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Month Summary */}
      <div style={{
        background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center' }}>
          <div style={{ background: 'var(--color-primary-light)', padding: 8, borderRadius: 10, marginRight: 12 }}>
            <Calendar size={18} color="var(--color-primary)" />
          </div>
          <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 16, margin: 0, color: '#fff' }}>
            Month Summary — <span style={{ fontWeight: 500, color: 'var(--color-secondary-text)' }}>{format(weekStart, 'MMMM yyyy')}</span>
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-hover)' }}>
              {['LDAP Account', 'Working Days', 'Expected Hrs', 'Logged Hrs', 'Utilization', 'Status'].map((h) => (
                <th key={h} style={{
                  padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 700,
                  color: 'var(--color-secondary-text)', fontFamily: '"Poppins", sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthSummary.map(({ user, workDays, expected, logged, pct, statusColor, statusLabel }) => (
              <tr key={user.uid} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }} className="hover:bg-[var(--color-surface-hover)]">
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{user.ldap || 'LDAP Missing'}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-secondary-text)' }}>{user.name}</div>
                </td>
                <td style={{ padding: '16px 24px', fontSize: 14, color: '#fff', fontWeight: 600 }}>{workDays}</td>
                <td style={{ padding: '16px 24px', fontSize: 14, color: '#fff', fontWeight: 600 }}>{expected}h</td>
                <td style={{ padding: '16px 24px', fontSize: 15, fontWeight: 800, color: 'var(--color-primary)' }}>{logged}h</td>
                <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700, color: '#fff' }}>{pct}%</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: statusColor.bg, color: statusColor.text, textTransform: 'uppercase', letterSpacing: '0.05em', border: `1px solid ${statusColor.text}40`
                  }}>{statusLabel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Log Time Modal */}
      {logModal && (
        <LogTimeModal
          date={logModal.dateStr}
          users={users}
          tickets={tickets}
          currentUserId={logModal.userId || userDoc.uid}
          existingEntries={getEntriesForDate(logModal.userId, logModal.date)}
          onClose={() => setLogModal(null)}
          onSave={handleSaveTime}
        />
      )}
    </div>
  );
}
