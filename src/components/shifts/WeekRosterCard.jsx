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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarClock size={20} color="#0451CC" />
          <h3 style={titleStyle}>This Week's Shift Schedule</h3>
        </div>
        <Link to="/shifts" style={linkStyle}>Edit Shifts <ChevronRight size={14} /></Link>
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
              <tr key={user.id}>
                <td style={tdNameStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={avatarSmallStyle}>{user.name.charAt(0)}</div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</span>
                  </div>
                </td>
                {weekDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const key = `${user.id}_${dateStr}`;
                  const shift = shifts[key];
                  const att = attendance[key];
                  const holiday = publicHolidays.find(h => h.date === dateStr);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <td key={dateStr} style={{ 
                      ...tdStyle, 
                      background: isToday ? '#EAF0FD' : (holiday ? '#FEF9C3' : '#fff'),
                      borderLeft: '1px solid #F3F4F6'
                    }}>
                      {holiday ? (
                        <div style={{ fontSize: 9, color: '#92400E', fontWeight: 600 }}>{holiday.name}</div>
                      ) : att?.status === 'leave' ? (
                        <div style={badgeStyle('leave')}>Leave</div>
                      ) : shift ? (
                        <div style={{ fontSize: 10, fontWeight: 500, color: '#4B5563' }}>
                          {formatShiftTime(shift.shiftStart)}–{formatShiftTime(shift.shiftEnd)}
                        </div>
                      ) : isSunday(day) ? (
                        <div style={{ fontSize: 9, color: '#9CA3AF' }}>Sunday</div>
                      ) : <span style={{ color: '#D1D5DB' }}>—</span>}
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

const cardStyle = { background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 };
const titleStyle = { fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'Poppins' };
const linkStyle = { fontSize: 12, fontWeight: 600, color: '#0451CC', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 };
const tableContainerStyle = { overflowX: 'auto' };
const thStyle = { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9CA3AF', borderBottom: '1px solid #F3F4F6' };
const tdNameStyle = { padding: '12px 12px', borderBottom: '1px solid #F9FAFB' };
const tdStyle = { padding: '12px 4px', textAlign: 'center', borderBottom: '1px solid #F9FAFB' };
const avatarSmallStyle = { width: 24, height: 24, borderRadius: 6, background: '#0451CC', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const badgeStyle = (type) => ({
  fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
  background: type === 'leave' ? '#FEE2E2' : '#F3F4F6',
  color: type === 'leave' ? '#DC2626' : '#6B7280',
  display: 'inline-block'
});
