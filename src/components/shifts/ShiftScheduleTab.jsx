import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  format, startOfWeek, addDays, subWeeks, addWeeks, 
  isSameDay, isSunday, isBefore, startOfDay 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Calendar, Settings, 
  Clock, Plus 
} from 'lucide-react';
import { 
  ATTENDANCE_STATUS_COLORS, ATTENDANCE_STATUS_LABELS,
  formatShiftTime
} from '../../utils/helpers';
import EditDayModal from './EditDayModal';

export default function ShiftScheduleTab() {
  const { publicHolidays, isAdmin } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState({});
  const [attendance, setAttendance] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uList = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.isActive)
        .sort((a, b) => {
          if (a.name === 'Jayveer') return -1;
          if (b.name === 'Jayveer') return 1;
          return a.name.localeCompare(b.name);
        });
      setUsers(uList);
    });

    return () => unsubUsers();
  }, []);

  useEffect(() => {
    const fetchWeekData = async () => {
      const startStr = format(weekDays[0], 'yyyy-MM-dd');
      const endStr = format(weekDays[6], 'yyyy-MM-dd');

      const shiftsQ = query(collection(db, 'shifts'), where('date', '>=', startStr), where('date', '<=', endStr));
      const attQ = query(collection(db, 'attendance'), where('date', '>=', startStr), where('date', '<=', endStr));

      const [shiftsSnap, attSnap] = await Promise.all([getDocs(shiftsQ), getDocs(attQ)]);

      const shiftsMap = {};
      shiftsSnap.docs.forEach(d => {
        const data = d.data();
        shiftsMap[`${data.userId}_${data.date}`] = data;
      });
      setShifts(shiftsMap);

      const attMap = {};
      attSnap.docs.forEach(d => {
        const data = d.data();
        attMap[`${data.userId}_${data.date}`] = data;
      });
      setAttendance(attMap);
    };

    fetchWeekData();
  }, [currentDate]);

  const handleCellClick = (user, day) => {
    setSelectedDay({ user, date: day });
    setShowEditModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Week Navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            style={navBtnStyle} className="hover:bg-[var(--color-surface-hover)]"
          ><ChevronLeft size={18} color="var(--color-secondary-text)" /></button>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: '"Poppins"', color: '#fff' }}>
            Week of {format(weekDays[0], 'dd MMM yyyy')}
          </div>
          <button 
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            style={navBtnStyle} className="hover:bg-[var(--color-surface-hover)]"
          ><ChevronRight size={18} color="var(--color-secondary-text)" /></button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            style={todayBtnStyle} className="hover:bg-[var(--color-surface-hover)]"
          >Today</button>
        </div>
      </div>

      {/* Roster Grid */}
      <div style={{ 
        background: 'var(--color-surface)', 
        borderRadius: 16, 
        border: '1px solid var(--color-border)', 
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
              <th style={{ ...thStyle, width: 220 }}>Team Members</th>
              {weekDays.map(day => (
                <th key={day.toString()} style={{ ...thStyle, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-secondary-text)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{format(day, 'EEE')}</div>
                  <div style={{ fontSize: 15, color: '#fff' }}>{format(day, 'dd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-[var(--color-surface-hover)] transition-colors duration-200">
                <td style={tdNameStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      width: 36, height: 36, borderRadius: '50%', 
                      background: 'var(--color-primary)', color: '#fff', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700
                    }}>
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{user.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-secondary-text)' }}>{user.role}</div>
                    </div>
                  </div>
                </td>
                {weekDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const key = `${user.id}_${dateStr}`;
                  const shift = shifts[key];
                  const att = attendance[key];
                  const holiday = publicHolidays.find(h => h.date === dateStr);
                  const isSun = isSunday(day);

                  return (
                    <td 
                      key={dateStr} 
                      onClick={() => handleCellClick(user, day)}
                      style={{ 
                        ...tdDateStyle, 
                        background: isSun ? 'rgba(255,255,255,0.02)' : (holiday ? 'rgba(245, 158, 11, 0.1)' : 'transparent'),
                        cursor: 'pointer'
                      }}
                      className="hover:bg-[rgba(255,255,255,0.05)] transition-colors duration-200"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        {holiday ? (
                          <>
                            <div style={{ fontSize: 10, color: '#F59E0B', textAlign: 'center', fontWeight: 600 }}>
                              {holiday.name}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--color-secondary-text)' }}>
                              {isSun && !shift ? 'Sunday' : ''}
                            </div>
                          </>
                        ) : null}

                        {shift ? (
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                            {formatShiftTime(shift.shiftStart)} – {formatShiftTime(shift.shiftEnd)}
                          </div>
                        ) : !holiday && !isSun ? (
                          <div style={{ fontSize: 12, color: 'var(--color-secondary-text)' }}>—</div>
                        ) : isSun && !shift ? (
                          <div style={{ fontSize: 12, color: 'var(--color-secondary-text)' }}>—</div>
                        ) : null}

                        {att && (
                          <div style={{ 
                            padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                            background: ATTENDANCE_STATUS_COLORS[att.status]?.bg || 'var(--color-surface-hover)',
                            color: ATTENDANCE_STATUS_COLORS[att.status]?.text || 'var(--color-secondary-text)',
                            textTransform: 'uppercase', letterSpacing: '0.05em', border: `1px solid ${ATTENDANCE_STATUS_COLORS[att.status]?.text || '#6B7280'}40`
                          }}>
                            {ATTENDANCE_STATUS_LABELS[att.status]}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEditModal && (
        <EditDayModal 
          user={selectedDay.user} 
          date={selectedDay.date} 
          onClose={() => setShowEditModal(false)} 
        />
      )}
    </div>
  );
}

const thStyle = { padding: '16px 20px', textAlign: 'left', fontFamily: '"Poppins"', fontWeight: 700, color: 'var(--color-secondary-text)' };
const tdNameStyle = { padding: '16px 20px' };
const tdDateStyle = { padding: '16px 8px', borderLeft: '1px solid var(--color-border)', verticalAlign: 'middle' };
const navBtnStyle = { 
  background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '8px', 
  cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s'
};
const todayBtnStyle = { 
  background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '8px 20px', 
  fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff', transition: 'all 0.2s'
};
