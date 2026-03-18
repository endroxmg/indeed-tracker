import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  startOfWeek, endOfWeek, subMonths, addMonths, isSunday, isSameMonth 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { toDateString } from '../../utils/helpers';

export default function LeaveCalendarTab() {
  const { publicHolidays } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState({});

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.isActive));
    });
    return unsubUsers;
  }, []);

  useEffect(() => {
    const fetchMonthData = async () => {
      const start = toDateString(startOfMonth(currentMonth));
      const end = toDateString(endOfMonth(currentMonth));
      const q = query(collection(db, 'attendance'), where('date', '>=', start), where('date', '<=', end));
      const snap = await getDocs(q);
      const attMap = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (['leave', 'comp_off', 'week_off'].includes(data.status)) {
          if (!attMap[data.date]) attMap[data.date] = [];
          attMap[data.date].push(data);
        }
      });
      setAttendance(attMap);
    };
    fetchMonthData();
  }, [currentMonth]);

  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={navBtnStyle}>
            <ChevronLeft size={20} />
          </button>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: 'Poppins' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={navBtnStyle}>
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={legendItemStyle}><div style={{ ...dotStyle, background: '#DC2626' }} /> Leave</div>
          <div style={legendItemStyle}><div style={{ ...dotStyle, background: '#16A34A' }} /> Comp-off</div>
          <div style={legendItemStyle}><div style={{ ...dotStyle, background: '#FEF9C3', border: '1px solid #92400E' }} /> Holiday</div>
        </div>
      </div>

      <div style={calendarGridStyle}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} style={calendarHeaderStyle}>{d}</div>
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayAtt = attendance[dateStr] || [];
          const holiday = publicHolidays.find(h => h.date === dateStr);
          const isSun = isSunday(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <div key={dateStr} style={{ 
              ...cellStyle, 
              background: holiday ? '#FEF9C3' : (isSun ? '#F3F4F6' : '#fff'),
              opacity: isCurrentMonth ? 1 : 0.4
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: holiday ? '#92400E' : (isSun ? '#6B7280' : '#1A1A2E'), marginBottom: 4 }}>
                {format(day, 'd')}
                {holiday && <span style={{ fontSize: 9, marginLeft: 6, fontWeight: 500 }}>{holiday.name}</span>}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dayAtt.map(att => {
                  const user = users.find(u => u.id === att.userId);
                  if (!user) return null;
                  return (
                    <div key={att.userId} style={{
                      ...pillStyle,
                      background: att.status === 'leave' ? '#FEE2E2' : '#ECFDF5',
                      color: att.status === 'leave' ? '#DC2626' : '#16A34A'
                    }}>
                      <div style={miniAvatarStyle}>{user.name.charAt(0)}</div>
                      <span style={{ fontSize: 10, fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const navBtnStyle = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' };
const legendItemStyle = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#6B7280' };
const dotStyle = { width: 10, height: 10, borderRadius: '50%' };
const calendarGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#E5E7EB', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' };
const calendarHeaderStyle = { background: '#F9FAFB', padding: '12px', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'center' };
const cellStyle = { minHeight: 100, padding: '12px', background: '#fff', display: 'flex', flexDirection: 'column' };
const pillStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '2px 6px', borderRadius: 20, maxWidth: '100%' };
const miniAvatarStyle = { width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 };
