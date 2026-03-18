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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Week Navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            style={navBtnStyle}
          ><ChevronLeft size={18} /></button>
          <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'Poppins' }}>
            Week of {format(weekDays[0], 'dd MMM yyyy')}
          </div>
          <button 
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            style={navBtnStyle}
          ><ChevronRight size={18} /></button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            style={todayBtnStyle}
          >Today</button>
        </div>
      </div>

      {/* Roster Grid */}
      <div style={{ 
        background: '#fff', 
        borderRadius: 16, 
        border: '1px solid #E5E7EB', 
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
              <th style={{ ...thStyle, width: 220 }}>Team Members</th>
              {weekDays.map(day => (
                <th key={day.toString()} style={{ ...thStyle, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{format(day, 'EEE')}</div>
                  <div style={{ fontSize: 14 }}>{format(day, 'dd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={tdNameStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ 
                      width: 32, height: 32, borderRadius: '50%', 
                      background: '#0451CC', color: '#fff', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 600
                    }}>
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>{user.role}</div>
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
                        background: isSun ? '#F3F4F6' : (holiday ? '#FEF9C3' : '#fff'),
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        {holiday ? (
                          <>
                            <div style={{ fontSize: 10, color: '#92400E', textAlign: 'center', fontWeight: 500 }}>
                              {holiday.name}
                            </div>
                            <div style={{ fontSize: 10, color: '#6B7280' }}>
                              {isSun && !shift ? 'Sunday' : ''}
                            </div>
                          </>
                        ) : null}

                        {shift ? (
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#2D2D2D' }}>
                            {formatShiftTime(shift.shiftStart)} – {formatShiftTime(shift.shiftEnd)}
                          </div>
                        ) : !holiday && !isSun ? (
                          <div style={{ fontSize: 12, color: '#9CA3AF' }}>—</div>
                        ) : isSun && !shift ? (
                          <div style={{ fontSize: 12, color: '#9CA3AF' }}>—</div>
                        ) : null}

                        {att && (
                          <div style={{ 
                            padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                            background: ATTENDANCE_STATUS_COLORS[att.status]?.bg || '#F3F4F6',
                            color: ATTENDANCE_STATUS_COLORS[att.status]?.text || '#374151'
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

const thStyle = { padding: '12px 16px', textAlign: 'left', fontFamily: 'Poppins', fontWeight: 600 };
const tdNameStyle = { padding: '12px 16px' };
const tdDateStyle = { padding: '12px 8px', borderLeft: '1px solid #E5E7EB', verticalAlign: 'middle' };
const navBtnStyle = { 
  background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px', 
  cursor: 'pointer', display: 'flex', alignItems: 'center' 
};
const todayBtnStyle = { 
  background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 16px', 
  fontSize: 13, fontWeight: 500, cursor: 'pointer' 
};
