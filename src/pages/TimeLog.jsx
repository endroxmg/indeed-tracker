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
      background: '#2557A7', color: '#fff',
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
    if (hours === 0) return { bg: '#fff', color: '#999' };
    if (hours < 5) return { bg: '#FEF3C7', color: '#92400E' };
    if (hours < 8) return { bg: '#E8EDF7', color: '#2557A7' };
    if (hours === 8) return { bg: '#2557A7', color: '#fff' };
    return { bg: '#0D7A3F', color: '#fff' };
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
      if (pct >= 100) { statusColor = { bg: '#E8EDF7', text: '#2557A7' }; statusLabel = 'Exceeded'; }
      else if (pct >= 90) { statusColor = { bg: '#ECFDF5', text: '#065F46' }; statusLabel = 'On Target'; }
      else if (pct >= 70) { statusColor = { bg: '#FEF3C7', text: '#92400E' }; statusLabel = 'Good'; }
      else { statusColor = { bg: '#FEE2E2', text: '#991B1B' }; statusLabel = 'Low'; }

      return { user, workDays, expected, logged, pct, statusColor, statusLabel };
    });
  }, [designers, timeEntries, weekStart]);

  if (loading) return <SkeletonTable rows={6} cols={8} />;

  return (
    <div>
      {/* Header with Log Time button */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        {/* Week Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setWeekStart(subWeeks(weekStart, 1))} style={{
            background: '#fff', border: '1px solid #D4D2D0', borderRadius: 8,
            padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}>
            <ChevronLeft size={16} color="#1A1A2E" />
          </button>
          <span style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 16, color: '#1A1A2E' }}>
            Week of {format(weekStart, 'dd MMM yyyy')}
          </span>
          <button onClick={() => setWeekStart(addWeeks(weekStart, 1))} style={{
            background: '#fff', border: '1px solid #D4D2D0', borderRadius: 8,
            padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}>
            <ChevronRight size={16} color="#1A1A2E" />
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
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} /> Log Time
        </button>
      </div>

      {/* Weekly Grid */}
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #D4D2D0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden', marginBottom: 32,
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F3F2F1' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#767676', fontFamily: '"Poppins", sans-serif', width: 180 }}>
                LDAP Account
              </th>
              {weekDays.map((day) => {
                const isSunday = getDay(day) === 0;
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                  <th key={day.toISOString()} style={{
                    padding: '12px 8px', textAlign: 'center', fontSize: 12, fontWeight: 700,
                    color: isSunday ? '#C4C4C4' : isToday ? '#2557A7' : '#767676',
                    fontFamily: '"Poppins", sans-serif',
                    background: isToday ? '#E8EDF7' : undefined,
                  }}>
                    {format(day, 'EEE')}<br />
                    <span style={{ fontWeight: 500, fontSize: 11 }}>{format(day, 'dd MMM')}</span>
                  </th>
                );
              })}
              <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#767676', fontFamily: '"Poppins", sans-serif' }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {designers.map((user) => {
              const weekTotal = weekDays.reduce((s, d) => s + getHoursForCell(user.uid, d), 0);
              return (
                <tr key={user.uid} style={{ borderBottom: '1px solid #F3F2F1' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <InitialsAvatar name={user.ldap || user.name} size={28} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{user.ldap || 'LDAP Missing'}</span>
                        <span style={{ fontSize: 10, color: '#767676', fontWeight: 500 }}>{user.name}</span>
                      </div>
                    </div>
                  </td>
                  {weekDays.map((day) => {
                    const isSunday = getDay(day) === 0;
                    const hours = getHoursForCell(user.uid, day);
                    const cellColor = isSunday ? { bg: '#F9F9F9', color: '#C4C4C4' } : getCellColor(hours);
                    return (
                      <td key={day.toISOString()} style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <button
                          onClick={() => !isSunday && setLogModal({
                            date: day,
                            dateStr: format(day, 'yyyy-MM-dd'),
                            userId: user.uid,
                          })}
                          disabled={isSunday}
                          style={{
                            width: '100%', padding: '10px 4px', borderRadius: 8,
                            border: isSunday ? 'none' : '1px solid transparent',
                            background: cellColor.bg, color: cellColor.color,
                            fontSize: 14, fontWeight: 700, cursor: isSunday ? 'default' : 'pointer',
                            transition: 'all 0.2s ease',
                            fontFamily: '"Poppins", sans-serif',
                          }}
                          onMouseEnter={(e) => { if (!isSunday) e.currentTarget.style.borderColor = '#2557A7'; }}
                          onMouseLeave={(e) => { if (!isSunday) e.currentTarget.style.borderColor = 'transparent'; }}
                        >
                          {isSunday ? '—' : hours > 0 ? `${hours}h` : '—'}
                        </button>
                      </td>
                    );
                  })}
                  <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 14, fontFamily: '"Poppins", sans-serif', color: '#2557A7' }}>
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
        background: '#fff', borderRadius: 14, border: '1px solid #D4D2D0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #D4D2D0' }}>
          <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#1A1A2E' }}>
            <Calendar size={16} color="#2557A7" /> Month Summary — {format(weekStart, 'MMMM yyyy')}
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F3F2F1' }}>
              {['LDAP Account', 'Working Days', 'Expected Hrs', 'Logged Hrs', 'Utilization', 'Status'].map((h) => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700,
                  color: '#767676', fontFamily: '"Poppins", sans-serif',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthSummary.map(({ user, workDays, expected, logged, pct, statusColor, statusLabel }) => (
              <tr key={user.uid} style={{ borderBottom: '1px solid #F3F2F1' }}>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', fontFamily: 'monospace' }}>{user.ldap || 'LDAP Missing'}</div>
                  <div style={{ fontSize: 11, color: '#767676' }}>{user.name}</div>
                </td>
                <td style={{ padding: '10px 16px', fontSize: 14, color: '#1A1A2E' }}>{workDays}</td>
                <td style={{ padding: '10px 16px', fontSize: 14, color: '#1A1A2E' }}>{expected}h</td>
                <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#2557A7' }}>{logged}h</td>
                <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{pct}%</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: statusColor.bg, color: statusColor.text,
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
