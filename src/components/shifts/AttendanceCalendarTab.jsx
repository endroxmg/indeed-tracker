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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Month Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={navBtnStyle} className="hover:bg-[var(--color-surface-hover)]">
          <ChevronLeft size={20} color="var(--color-secondary-text)" />
        </button>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: '"Poppins"', minWidth: 160, textAlign: 'center', color: '#fff' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={navBtnStyle} className="hover:bg-[var(--color-surface-hover)]">
          <ChevronRight size={20} color="var(--color-secondary-text)" />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={avatarStyle}>{user.name.charAt(0)}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{user.name}</div>
            <div style={{ fontSize: 13, color: 'var(--color-secondary-text)', fontWeight: 500 }}>{user.role}</div>
          </div>
        </div>
      </div>

      <div style={statsRowStyle}>
        <div style={statChipStyle}>{stats.working} Working</div>
        <div style={{ ...statChipStyle, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>{stats.leave} Leaves</div>
        <div style={{ ...statChipStyle, background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>{stats.halfDay} Half Days</div>
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
            }} className="hover:opacity-80 transition-opacity">
              <span style={{ fontSize: 11, fontWeight: 600, position: 'absolute', top: 4, right: 6, color: 'var(--color-secondary-text)' }}>
                {format(day, 'd')}
              </span>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', paddingTop: 10 }}>
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
  if (att) return ATTENDANCE_STATUS_COLORS[att.status]?.bg || 'var(--color-surface)';
  if (holiday) return 'rgba(245, 158, 11, 0.1)';
  if (isSun) return 'var(--color-surface-hover)';
  return 'var(--color-background)';
}

function getDayIndicator(att, holiday, isSun) {
  if (att) {
    if (att.status === 'working') return <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 4px #10B981' }} />;
    if (att.status === 'half_day') return <span style={{ fontSize: 12, fontWeight: 800, color: '#F59E0B' }}>½</span>;
    if (att.status === 'leave') return <span style={{ fontSize: 12, fontWeight: 800, color: '#EF4444' }}>L</span>;
    if (att.status === 'early_leave') return <Clock size={12} color="#F97316" />;
    return <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-secondary-text)' }}>{att.status.substring(0, 2).toUpperCase()}</span>;
  }
  if (holiday) return <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>H</span>;
  if (isSun) return null;
  return null;
}

const navBtnStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 10, cursor: 'pointer', display: 'flex', transition: 'all 0.2s' };
const cardStyle = { background: 'var(--color-surface)', borderRadius: 20, border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-card)' };
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: 20 };
const avatarStyle = { width: 44, height: 44, borderRadius: 14, background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, border: '1px solid rgba(37, 87, 167, 0.3)' };
const statsRowStyle = { display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' };
const statChipStyle = { padding: '6px 12px', borderRadius: 20, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 };
const gridHeaderStyle = { fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-text)', textAlign: 'center', paddingBottom: 6 };
const dayCellStyle = { height: 48, border: '1px solid var(--color-border)', borderRadius: 10, display: 'flex', flexDirection: 'column' };
