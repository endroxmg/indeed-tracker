import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  startOfWeek, endOfWeek, subMonths, addMonths, 
  isSunday, isSameMonth, isSameDay 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Clock, AlertCircle, 
  CheckCircle, User 
} from 'lucide-react';
import { 
  ATTENDANCE_STATUS_COLORS, ATTENDANCE_STATUS_LABELS 
} from '../../utils/helpers';

export default function AttendanceCalendarTab() {
  const { publicHolidays } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.isActive));
    });
    return unsub;
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
        attMap[`${data.userId}_${data.date}`] = data;
      });
      setAttendance(attMap);
    };
    fetchMonthData();
  }, [currentMonth]);

  const toDateString = (date) => format(date, 'yyyy-MM-dd');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Month Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={navBtnStyle}>
          <ChevronLeft size={20} />
        </button>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: 'Poppins', minWidth: 160, textAlign: 'center' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={navBtnStyle}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* User Calendar Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {users.map(user => (
          <UserCalendarCard 
            key={user.id} 
            user={user} 
            month={currentMonth} 
            attendance={attendance} 
            publicHolidays={publicHolidays}
          />
        ))}
      </div>
    </div>
  );
}

function UserCalendarCard({ user, month, attendance, publicHolidays }) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  // Calculate Stats
  const monthData = Object.values(attendance).filter(a => a.userId === user.id && isSameMonth(new Date(a.date), month));
  const stats = {
    working: monthData.filter(a => a.status === 'working').length,
    leave: monthData.filter(a => a.status === 'leave').length,
    halfDay: monthData.filter(a => a.status === 'half_day').length,
    absent: monthData.filter(a => a.status === 'absent').length // if added later
  };

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={avatarStyle}>{user.name.charAt(0)}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>{user.role}</div>
          </div>
        </div>
      </div>

      <div style={statsRowStyle}>
        <div style={statChipStyle}>{stats.working} Working</div>
        <div style={{ ...statChipStyle, background: '#FEE2E2', color: '#DC2626' }}>{stats.leave} Leaves</div>
        <div style={{ ...statChipStyle, background: '#FEF3C7', color: '#B45309' }}>{stats.halfDay} Half Days</div>
      </div>

      <div style={gridStyle}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} style={gridHeaderStyle}>{d}</div>
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const att = attendance[`${user.id}_${dateStr}`];
          const holiday = publicHolidays.find(h => h.date === dateStr);
          const isSun = isSunday(day);
          const isOut = !isSameMonth(day, month);

          return (
            <div key={dateStr} style={{
              ...dayCellStyle,
              opacity: isOut ? 0.3 : 1,
              background: getDayBg(att, holiday, isSun),
              position: 'relative'
            }}>
              <span style={{ fontSize: 10, position: 'absolute', top: 4, right: 6, color: '#9CA3AF' }}>
                {format(day, 'd')}
              </span>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                {getDayIndicator(att, holiday, isSun)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getDayBg(att, holiday, isSun) {
  if (att) return ATTENDANCE_STATUS_COLORS[att.status]?.bg || '#fff';
  if (holiday) return '#FEF9C3';
  if (isSun) return '#F3F4F6';
  return '#fff';
}

function getDayIndicator(att, holiday, isSun) {
  if (att) {
    if (att.status === 'working') return <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#16A34A' }} />;
    if (att.status === 'half_day') return <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706' }}>½</span>;
    if (att.status === 'leave') return <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626' }}>L</span>;
    if (att.status === 'early_leave') return <Clock size={10} color="#C2410C" />;
    return <span style={{ fontSize: 9, fontWeight: 700, color: '#374151' }}>{att.status.substring(0, 2).toUpperCase()}</span>;
  }
  if (holiday) return <span style={{ fontSize: 10, color: '#92400E' }}>H</span>;
  if (isSun) return null;
  return null;
}

const navBtnStyle = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' };
const cardStyle = { background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: 16 };
const avatarStyle = { width: 34, height: 34, borderRadius: '12px', background: '#0451CC', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 };
const statsRowStyle = { display: 'flex', gap: 8, marginBottom: 16 };
const statChipStyle = { padding: '4px 10px', borderRadius: 20, background: '#ECFDF5', color: '#16A34A', fontSize: 10, fontWeight: 600 };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 };
const gridHeaderStyle = { fontSize: 10, fontWeight: 600, color: '#9CA3AF', textAlign: 'center', paddingBottom: 4 };
const dayCellStyle = { height: 40, border: '1px solid #F3F4F6', borderRadius: 8, display: 'flex', flexDirection: 'column' };
