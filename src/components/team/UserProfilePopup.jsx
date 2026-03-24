import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, getDay } from 'date-fns';
import { 
  X, User, PieChart, Calendar, BarChart2, 
  Edit2, CheckCircle, Clock, Umbrella,
  TrendingUp, Star, Zap, IndianRupee, RefreshCcw
} from 'lucide-react';
import { 
  ATTENDANCE_STATUS_COLORS, ATTENDANCE_STATUS_LABELS,
  getCurrentFinancialYear, toDateString, getWorkingDaysInMonth
} from '../../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';

export default function UserProfilePopup({ userId, onClose }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [userData, setUserData] = useState(null);
  const [lbData, setLbData] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [tickets, setTickets] = useState([]);
  const { isAdmin, publicHolidays } = useAuth();
  const currentFY = getCurrentFinancialYear();

  useEffect(() => {
    const unsubUser = onSnapshot(doc(db, 'users', userId), (snap) => {
      setUserData(snap.data());
    });
    
    const unsubLb = onSnapshot(doc(db, 'leaveBalances', `${userId}_${currentFY}`), (snap) => {
      setLbData(snap.data());
    });

    const mStart = toDateString(startOfMonth(new Date()));
    const mEnd = toDateString(endOfMonth(new Date()));
    const timeQ = query(
      collection(db, 'timeEntries'), 
      where('userId', '==', userId),
      where('date', '>=', mStart),
      where('date', '<=', mEnd)
    );
    const unsubTime = onSnapshot(timeQ, (snap) => {
      setTimeEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const ticketsQ = query(collection(db, 'tickets'), where('assigneeId', '==', userId));
    const unsubTickets = onSnapshot(ticketsQ, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubUser(); unsubLb(); unsubTime(); unsubTickets(); };
  }, [userId, currentFY]);

  if (!userData) return null;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'leaves', label: 'Leave Insights', icon: Umbrella },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'work', label: 'Work Stats', icon: BarChart2 },
    { id: 'salary', label: 'Salary', icon: IndianRupee },
  ];

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={tabContainerStyle}>
            {tabs.map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...tabStyle,
                  color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-secondary-text)',
                  borderBottom: activeTab === tab.id ? '2px solid #0451CC' : '2px solid transparent'
                }}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        <div style={contentStyle}>
          {activeTab === 'profile' && <ProfileTab user={userData} userId={userId} isAdmin={isAdmin} />}
          {activeTab === 'leaves' && <LeaveInsightsTab user={userData} lb={lbData} />}
          {activeTab === 'attendance' && <AttendanceTab userId={userId} holidays={publicHolidays} />}
          {activeTab === 'work' && <WorkStatsTab userId={userId} user={userData} timeEntries={timeEntries} tickets={tickets} />}
          {activeTab === 'salary' && <SalaryTab userId={userId} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user, userId, isAdmin }) {
  const [capacity, setCapacity] = useState(user.dailyCapacity || 8);
  const [editing, setEditing] = useState(false);

  const handleUpdate = async () => {
    await updateDoc(doc(db, 'users', userId), { dailyCapacity: Number(capacity) });
    setEditing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={largeAvatarStyle}>{user.name.charAt(0)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, fontFamily: 'Poppins' }}>{user.name}</h2>
            <div style={badgeStyle}>{user.role}</div>
            <div style={{ ...badgeStyle, background: user.isActive ? '#ECFDF5' : '#FEE2E2', color: user.isActive ? '#16A34A' : '#DC2626' }}>
              {user.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-secondary-text)', marginTop: 4 }}>{user.email}</div>
        </div>
      </div>

      <div style={infoGridStyle}>
        <div style={infoItemStyle}>
          <div style={infoLabelStyle}>Member Since</div>
          <div style={infoValueStyle}>{format(user.createdAt?.toDate() || new Date(), 'dd MMM yyyy')}</div>
        </div>
        <div style={infoItemStyle}>
          <div style={infoLabelStyle}>Daily Capacity</div>
          {editing ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} style={smallInputStyle} />
              <button onClick={handleUpdate} style={saveBtnSmall}>Save</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={infoValueStyle}>{user.dailyCapacity || 8} hrs</div>
              {isAdmin && <button onClick={() => setEditing(true)} style={iconBtnStyle}><Edit2 size={14} /></button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeaveInsightsTab({ user, lb }) {
  if (!lb) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-secondary-text)' }}>No leave data for this financial year.</div>;

  const chartData = [
    { month: 'Apr', accrued: 1.5, taken: 0 },
    { month: 'May', accrued: 1.5, taken: 1 },
    { month: 'Jun', accrued: 1.5, taken: 0 },
    { month: 'Jul', accrued: 1.5, taken: 0.5 },
    // Simplified for demo, in real app this would come from logs
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={balanceSummaryStyle}>
         <BalBox label="Normal Leave" value={lb.normalLeaveBalance?.toFixed(1)} color="var(--color-primary)" />
         <BalBox label="Sick Leave" value={6 - (lb.sickLeaveTaken || 0)} color="#DC2626" />
         <BalBox label="Festival Leave" value={lb.festivalLeaveUsed ? 'Used' : 'Avail'} color="#16A34A" />
         <BalBox label="Comp-off" value={lb.compOffBalance} color="#4338CA" />
      </div>

      <div style={{ height: 260 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Accrual vs Usage Trend</div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-secondary-text)' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-secondary-text)' }} />
            <Tooltip />
            <Bar dataKey="taken" fill="#DC2626" radius={[4, 4, 0, 0]} barSize={32} />
            <Line type="monotone" dataKey="accrued" stroke="var(--color-primary)" strokeWidth={2} dot={{ fill: 'var(--color-primary)' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatChip label="Total Taken" value={`${lb.normalLeaveTaken} leaves`} />
        <StatChip label="Avg / Month" value="0.8" />
        <StatChip label="Early Leave" value={`${lb.earlyLeaveHalfDaysTriggered} Half Days`} />
      </div>
    </div>
  );
}

function AttendanceTab({ userId, holidays }) {
  const [attendance, setAttendance] = useState({});
  const month = new Date();
  
  useEffect(() => {
    const start = toDateString(startOfMonth(month));
    const end = toDateString(endOfMonth(month));
    const q = query(collection(db, 'attendance'), where('userId', '==', userId), where('date', '>=', start), where('date', '<=', end));
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach(d => map[d.data().date] = d.data());
      setAttendance(map);
    });
    return unsub;
  }, [userId]);

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{format(month, 'MMMM yyyy')} Attendance</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => <div key={`${d}-${i}`} style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-secondary-text)', fontWeight: 600 }}>{d}</div>)}
        {days.map(day => {
          const dateStr = toDateString(day);
          const att = attendance[dateStr];
          const holiday = holidays.find(h => h.date === dateStr);
          const isSun = getDay(day) === 0;
          const isOut = !isSameMonth(day, month);

          return (
            <div key={dateStr} style={{
              height: 48, borderRadius: 8, display: 'flex', flexDir: 'column', alignItems: 'center', justifyContent: 'center',
              background: att ? ATTENDANCE_STATUS_COLORS[att.status]?.bg : (holiday ? '#FEF9C3' : (isSun ? 'var(--color-surface-hover)' : 'var(--color-surface)')),
              border: '1px solid var(--color-border)', opacity: isOut ? 0.2 : 1, position: 'relative'
            }}>
              <span style={{ fontSize: 10, position: 'absolute', top: 2, right: 4, color: 'var(--color-secondary-text)' }}>{format(day, 'd')}</span>
              {att && <div style={{ width: 6, height: 6, borderRadius: '50%', background: ATTENDANCE_STATUS_COLORS[att.status]?.text }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkStatsTab({ userId, user, timeEntries, tickets }) {
  const logged = timeEntries.reduce((s, e) => s + (e.hours || 0), 0);
  const monthStart = startOfMonth(new Date());
  const workingDays = getWorkingDaysInMonth(monthStart.getFullYear(), monthStart.getMonth());
  const expected = workingDays * (user.dailyCapacity || 8);
  const utilization = expected > 0 ? (logged / expected) * 100 : 0;
  const overtime = Math.max(0, logged - expected);
  const completed = tickets.filter(t => t.status === 'completed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <DashboardMetric label="This Month Logged" value={`${logged} hrs`} sub={`vs ${expected} expected`} />
        <DashboardMetric label="Utilization" value={`${utilization.toFixed(1)}%`} sub={utilization >= 90 ? 'High Productivity' : 'Target: 95%'} />
        <DashboardMetric label="Tickets Done" value={completed} sub={`${tickets.filter(t => t.status !== 'completed').length} in progress`} />
      </div>
    </div>
  );
}

function BalBox({ label, value, color }) {
  return (
    <div style={{ padding: 16, borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-background)', flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-secondary-text)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function StatChip({ label, value }) {
  return (
    <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: 11, color: 'var(--color-secondary-text)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function DashboardMetric({ label, value, sub }) {
  return (
    <div style={{ padding: 20, borderRadius: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: 12, color: 'var(--color-secondary-text)' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, margin: '4px 0' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>{sub}</div>
    </div>
  );
}

function SalaryTab({ userId }) {
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalary = async () => {
      setLoading(true);
      const profileSnap = await getDoc(doc(db, 'salaryProfiles', userId));
      setProfile(profileSnap.exists() ? profileSnap.data() : null);

      const q = query(
        collection(db, 'salaryHistory'), 
        where('userId', '==', userId)
      );
      const historySnap = await getDocs(q);
      const data = historySnap.docs.map(d => d.data());
      // Sort by month
      data.sort((a, b) => b.month.localeCompare(a.month));
      setHistory(data);
      setLoading(false);
    };
    fetchSalary();
  }, [userId]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><RefreshCcw size={24} className="spinning" color="var(--color-primary)" /></div>;
  if (!profile) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-secondary-text)' }}>No salary profile configured for this user.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DashboardMetric label="Monthly Base" value={`₹${profile.monthlySalary?.toLocaleString()}`} sub="Base Compensation" />
        <DashboardMetric label="YTD Earnings" value={`₹${history.reduce((s, r) => s + (r.netSalary || 0), 0).toLocaleString()}`} sub="Current Financial Year" />
      </div>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left' }}>Month</th>
              <th style={{ padding: '10px 16px', textAlign: 'right' }}>Base</th>
              <th style={{ padding: '10px 16px', textAlign: 'right' }}>Bonus</th>
              <th style={{ padding: '10px 16px', textAlign: 'right' }}>Deduction</th>
              <th style={{ padding: '10px 16px', textAlign: 'right' }}>Net</th>
            </tr>
          </thead>
          <tbody>
            {history.slice(0, 6).map((r, i) => (
              <tr key={i} style={{ borderBottom: i === history.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 600 }}>{r.month}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>₹{r.monthlySalary?.toLocaleString()}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', color: '#16A34A' }}>+₹{(r.sundayBonusAmount + r.holidayBonusAmount + r.overtimeAmount).toLocaleString()}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', color: '#DC2626' }}>-₹{r.totalDeductions?.toLocaleString()}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>₹{r.netSalary?.toLocaleString()}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: 24, textAlign: 'center', color: 'var(--color-secondary-text)' }}>No history found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalStyle = { width: 720, background: 'var(--color-surface)', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' };
const headerStyle = { padding: '0 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 60 };
const tabContainerStyle = { display: 'flex', gap: 24, height: '100%' };
const tabStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, height: '100%', padding: '0 4px', transition: 'all 0.2s ease' };
const closeBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-secondary-text)' };
const contentStyle = { padding: 32, minHeight: 400 };
const largeAvatarStyle = { width: 80, height: 80, borderRadius: 20, background: 'var(--color-primary)', color: 'var(--color-surface)', fontSize: 32, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const badgeStyle = { px: 12, py: 4, borderRadius: 20, background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontSize: 11, fontWeight: 700 };
const infoGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 };
const infoItemStyle = { display: 'flex', flexDirection: 'column', gap: 4 };
const infoLabelStyle = { fontSize: 12, color: 'var(--color-secondary-text)', fontWeight: 600 };
const infoValueStyle = { fontSize: 15, fontWeight: 600, color: '#fff' };
const balanceSummaryStyle = { display: 'flex', gap: 16 };
const smallInputStyle = { width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--color-border)' };
const saveBtnSmall = { background: 'var(--color-primary)', color: 'var(--color-surface)', padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' };
