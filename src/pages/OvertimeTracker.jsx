import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday } from 'date-fns';
import { Clock, TrendingUp, DollarSign, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getWorkingDaysInMonth } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OvertimeTracker() {
  const { userDoc } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !userDoc) return;
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    
    const q = query(
      collection(db, 'timeEntries'), 
      where('userId', '==', userDoc.uid),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setTimeEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [currentMonth, userDoc]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const workingDays = getWorkingDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const expectedHours = workingDays * (userDoc?.dailyCapacity || 8);
  const loggedHours = timeEntries.reduce((acc, curr) => acc + (curr.hours || 0), 0);
  const overtime = Math.max(0, loggedHours - expectedHours);
  const overtimeEarnings = overtime * 20;

  const chartData = eachDayOfInterval({ start: monthStart, end: monthEnd }).map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const entry = timeEntries.find(e => e.date === dateStr);
    return {
      day: format(day, 'dd'),
      hours: entry ? entry.hours : 0,
      expected: isSunday(day) ? 0 : (userDoc?.dailyCapacity || 8)
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))} style={navBtnStyle}><ChevronLeft size={20} /></button>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Poppins' }}>{format(currentMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))} style={navBtnStyle}><ChevronRight size={20} /></button>
        </div>
        <div style={fyBadgeStyle}>Overtime Policy: $20/hr</div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        <StatCard icon={Clock} label="Logged Hours" value={`${loggedHours}h`} subText={`of ${expectedHours}h expected`} color="#0451CC" />
        <StatCard icon={TrendingUp} label="Utilization" value={`${((loggedHours / expectedHours) * 100).toFixed(1)}%`} subText={loggedHours >= expectedHours ? 'Target Met' : 'Below Target'} color="#0D7A3F" />
        <StatCard icon={DollarSign} label="Overtime Hours" value={`${overtime}h`} subText="Above capacity" color="#D97706" />
        <StatCard icon={DollarSign} label="Estimated Earnings" value={`$${overtimeEarnings}`} subText={`₹${(overtimeEarnings * 85).toLocaleString()}`} color="#0451CC" />
      </div>

      {/* Chart */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Daily Hours Visualization</h3>
        <div style={{ height: 280, marginTop: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="hours" fill="#0451CC" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History Table */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Monthly History</h3>
        <div style={{ marginTop: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Shift Timing</th>
                <th style={thStyle}>Hours Logged</th>
                <th style={thStyle}>Overtime</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map(entry => {
                const dayOvertime = Math.max(0, entry.hours - (userDoc?.dailyCapacity || 8));
                return (
                  <tr key={entry.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={tdStyle}>{format(new Date(entry.date), 'dd MMM, EEE')}</td>
                    <td style={tdStyle}>{format(entry.startTime?.toDate(), 'h:mm a')} – {format(entry.endTime?.toDate(), 'h:mm a')}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{entry.hours}h</td>
                    <td style={{ ...tdStyle, color: dayOvertime > 0 ? '#D97706' : '#9CA3AF' }}>+{dayOvertime}h</td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, fontWeight: 700, px: 8, py: 2, borderRadius: 20, background: '#ECFDF5', color: '#16A34A' }}>Verified</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subText, color }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{label}</span>
        <div style={{ padding: 8, background: `${color}10`, borderRadius: 10 }}><Icon size={18} color={color} /></div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#1A1A2E' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{subText}</div>
    </div>
  );
}

const navBtnStyle = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' };
const fyBadgeStyle = { background: '#EAF0FD', color: '#0451CC', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700 };
const cardStyle = { background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const cardTitleStyle = { fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'Poppins', color: '#1A1A2E' };
const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280' };
const tdStyle = { padding: '16px', fontSize: 13, color: '#2D2D2D' };
