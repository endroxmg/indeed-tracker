import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { startOfWeek, addDays, format, isSunday, isSameDay } from 'date-fns';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatShiftTime, ATTENDANCE_STATUS_COLORS } from '../../utils/helpers';
import { Link } from 'react-router-dom';

export default function WeekRosterCard() {
  const { publicHolidays } = useAuth();
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState({});
  const [attendance, setAttendance] = useState({});

  const start = startOfWeek(new Date(), { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i)); // Sun-Sat

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.isActive));
    });

    const startStr = format(weekDays[0], 'yyyy-MM-dd');
    const endStr = format(weekDays[6], 'yyyy-MM-dd');

    const shiftsQ = query(collection(db, 'shifts'), where('date', '>=', startStr), where('date', '<=', endStr));
    const attQ = query(collection(db, 'attendance'), where('date', '>=', startStr), where('date', '<=', endStr));

    const unsubShifts = onSnapshot(shiftsQ, (snap) => {
      const map = {};
      snap.docs.forEach(d => map[`${d.data().userId}_${d.data().date}`] = d.data());
      setShifts(map);
    });

    const unsubAtt = onSnapshot(attQ, (snap) => {
      const map = {};
      snap.docs.forEach(d => map[`${d.data().userId}_${d.data().date}`] = d.data());
      setAttendance(map);
    });

    return () => { unsubUsers(); unsubShifts(); unsubAtt(); };
  }, []);

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'var(--color-primary-light)', padding: 8, borderRadius: 10 }}>
             <CalendarClock size={20} color="var(--color-primary)" />
          </div>
          <h3 style={titleStyle}>This Week's Schedule</h3>
        </div>
        <Link to="/shifts" style={linkStyle} className="hover:text-[var(--color-primary-light)]">Edit Shifts <ChevronRight size={14} /></Link>
      </div>

      <div style={tableContainerStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Team Member</th>
              {weekDays.map(day => (
                <th key={day.toString()} style={{ ...thStyle, textAlign: 'center' }}>
                  {format(day, 'EEE')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                <td style={tdNameStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={avatarSmallStyle}>{user.name.charAt(0)}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{user.name}</span>
                  </div>
                </td>
                {weekDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const key = `${user.id}_${dateStr}`;
                  const shift = shifts[key];
                  const att = attendance[key];
                  const holiday = publicHolidays.find(h => h.date === dateStr);
                  const isToday = isSameDay(day, new Date());

                  let bgCol = isToday ? 'var(--color-primary-light)' : (holiday ? 'rgba(245, 158, 11, 0.1)' : 'transparent');
                  
                  return (
                    <td key={dateStr} style={{ 
                      ...tdStyle, 
                      background: bgCol,
                      borderLeft: '1px solid var(--color-border)'
                    }}>
                      {holiday ? (
                        <div style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>{holiday.name}</div>
                      ) : att?.status === 'leave' ? (
                        <div style={badgeStyle('leave')}>Leave</div>
                      ) : shift ? (
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-secondary-text)' }}>
                          {formatShiftTime(shift.shiftStart)}–{formatShiftTime(shift.shiftEnd)}
                        </div>
                      ) : isSunday(day) ? (
                        <div style={{ fontSize: 10, color: 'var(--color-border)' }}>Sun</div>
                      ) : <span style={{ color: 'var(--color-border)' }}>—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cardStyle = { background: 'var(--color-surface)', borderRadius: 20, border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-card)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 };
const titleStyle = { fontSize: 16, fontWeight: 700, margin: 0, fontFamily: '"Poppins"', color: '#fff' };
const linkStyle = { fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.2s' };
const tableContainerStyle = { overflowX: 'auto' };
const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-text)', borderBottom: '1px solid var(--color-border)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdNameStyle = { padding: '16px 16px', borderBottom: '1px solid var(--color-border)' };
const tdStyle = { padding: '16px 8px', textAlign: 'center', borderBottom: '1px solid var(--color-border)' };
const avatarSmallStyle = { width: 30, height: 30, borderRadius: 8, background: 'var(--color-primary)', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const badgeStyle = (type) => ({
  fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6,
  background: type === 'leave' ? 'rgba(239, 68, 68, 0.15)' : 'var(--color-surface-hover)',
  color: type === 'leave' ? '#EF4444' : 'var(--color-secondary-text)',
  display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.05em'
});
