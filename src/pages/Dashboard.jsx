import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeTickets, subscribeUsers, subscribeActivityLog } from '../services/firestoreService';
import { getWorkingDaysInMonth, STATUS_LABELS, TICKET_TYPE_COLORS, TYPE_LABELS, formatDate } from '../utils/helpers';
import { SkeletonCard } from '../components/Skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Ticket, Clock, CheckCircle2, Timer, TrendingUp, DollarSign, AlertTriangle, MoreHorizontal, ArrowUpRight, Umbrella } from 'lucide-react';
import InitialsAvatar from '../components/InitialsAvatar';
import { format, startOfMonth, endOfMonth, isToday } from 'date-fns';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import WeekRosterCard from '../components/shifts/WeekRosterCard';
import LeaveBalanceWidget from '../components/leaves/LeaveBalanceWidget';
import SalaryDashboardWidget from '../components/salary/SalaryDashboardWidget';
import { toDateString } from '../utils/helpers';

export default function Dashboard() {
  const { userDoc, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamAttendance, setTeamAttendance] = useState({});
  const todayStr = toDateString(new Date());

  useEffect(() => {
    const unsub1 = subscribeTickets((data) => { setTickets(data); setLoading(false); });
    const unsub2 = subscribeUsers(setUsers);
    const unsub3 = subscribeActivityLog(setActivities, 20);

    const attQ = query(collection(db, 'attendance'), where('date', '==', todayStr));
    const unsubAtt = onSnapshot(attQ, (snap) => {
      const attMap = {};
      snap.docs.forEach(d => { attMap[d.data().userId] = d.data(); });
      setTeamAttendance(attMap);
    });

    return () => { unsub1(); unsub2(); unsub3(); unsubAtt(); };
  }, [todayStr]);

  useEffect(() => {
    if (!db) return;
    const now = new Date();
    const mStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const mEnd = format(endOfMonth(now), 'yyyy-MM-dd');
    const q = query(collection(db, 'timeEntries'), where('date', '>=', mStart), where('date', '<=', mEnd), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => { setTimeEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); });
    return unsub;
  }, []);

  const designers = users.filter((u) => u.isActive && (u.roles?.includes('designer') || u.role === 'designer'));

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const completedThisMonth = tickets.filter((t) => {
      if (t.status !== 'completed' || !t.completedAt) return false;
      const d = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt);
      return d >= monthStart;
    });
    const totalHoursMonth = timeEntries.reduce((s, e) => s + (e.hours || 0), 0);
    const incomeUSD = totalHoursMonth * 20;
    
    // Fake mini-chart data for the cards to match reference
    const miniData1 = Array.from({length: 6}, () => ({ value: Math.random() * 100 + 50 }));
    const miniData2 = Array.from({length: 6}, () => ({ value: Math.random() * 100 + 40 }));
    const miniData3 = Array.from({length: 6}, () => ({ value: Math.random() * 100 + 30 }));
    const miniData4 = Array.from({length: 6}, () => ({ value: Math.random() * 100 + 60 }));

    return [
      { label: 'Active Projects', value: tickets.filter((t) => t.status === 'in_production').length, percent: '+12.08%', color: '#2557A7', miniData: miniData1 },
      { label: 'Tasks Completed', value: completedThisMonth.length, percent: '+8.45%', color: '#10B981', miniData: miniData2 },
      { label: 'Hours Logged', value: `${totalHoursMonth}h`, percent: '+2.10%', color: '#F59E0B', miniData: miniData3 },
      { label: 'Total Revenue', value: `$${incomeUSD.toLocaleString()}`, percent: '+14.20%', color: '#3B82F6', miniData: miniData4 },
    ];
  }, [tickets, timeEntries]);

  const utilizationData = useMemo(() => {
    const now = new Date();
    const workDays = getWorkingDaysInMonth(now.getFullYear(), now.getMonth());
    return designers.map((user) => {
      const logged = timeEntries.filter((e) => e.userId === user.uid).reduce((s, e) => s + (e.hours || 0), 0);
      const expected = workDays * (user.dailyCapacity || 8);
      return { name: user.name.split(' ')[0], Expected: expected, Logged: logged };
    });
  }, [designers, timeEntries]);

  const statusData = useMemo(() => {
    const counts = {};
    tickets.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
    const colorMap = { todo: '#4B5563', in_production: '#2557A7', ready_for_feedback: '#F59E0B', feedback_ready: '#EF4444', completed: '#10B981' };
    return Object.entries(counts)
      .filter(([status, count]) => count > 0)
      .map(([status, count]) => ({
      name: STATUS_LABELS[status] || status, value: count, color: colorMap[status] || '#767676',
    }));
  }, [tickets]);

  const todaysActivity = useMemo(() => {
    return activities.filter((a) => {
      if (!a.timestamp) return false;
      const ts = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      return isToday(ts);
    }).slice(0, 6);
  }, [activities]);

  const cardStyle = {
    background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-card)', padding: 24, position: 'relative', overflow: 'hidden'
  };

  if (loading) return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* 4 Top KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ ...cardStyle, padding: '20px 24px' }}>
            <h3 style={{ fontSize: 13, color: 'var(--color-secondary-text)', fontWeight: 600, margin: '0 0 8px' }}>{stat.label}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1, marginBottom: 8, fontFamily: '"Poppins", sans-serif' }}>{stat.value}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: stat.color, fontWeight: 600 }}>
                  <ArrowUpRight size={14} /> {stat.percent}
                </div>
              </div>
              <div style={{ width: 60, height: 40 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stat.miniData}>
                    <Bar dataKey="value" fill={stat.color} radius={[2, 2, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        
        {/* Main Workload Area Chart */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, fontFamily: '"Poppins", sans-serif' }}>Team Utilization</h3>
            <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#fff' }}>
              This Month
            </div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={utilizationData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLogged" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-secondary-text)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-secondary-text)' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Logged" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorLogged)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Highlight / Donut */}
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, fontFamily: '"Poppins", sans-serif' }}>Ticket Highlight</h3>
            <MoreHorizontal size={18} color="var(--color-secondary-text)" />
          </div>
          
          <div style={{ height: 160, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                  {statusData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ background: '#EF4444', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <Ticket size={12} color="#fff" />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{tickets.length}</span>
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {statusData.map((entry, i) => (
               <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-hover)', padding: '8px 12px', borderRadius: 8 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                   <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
                   <span style={{ fontSize: 13, color: 'var(--color-secondary-text)' }}>{entry.name}</span>
                 </div>
                 <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{entry.value}</span>
               </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        
        {/* Task Schedule / Timeline Alternative */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, fontFamily: '"Poppins", sans-serif' }}>Active Task Schedule</h3>
            <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#fff' }}>
              Today, {format(new Date(), 'MMM dd')}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tickets.filter(t => t.status === 'in_production').slice(0, 4).map(ticket => {
              const u = users.find(user => user.uid === ticket.assigneeId || user.ldap === ticket.ldap);
              return (
                <div key={ticket.id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--color-surface-hover)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border)' }}>
                  <InitialsAvatar name={u?.name} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{ticket.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-secondary-text)' }}>{ticket.jiraId} • Assigned to {u?.name || 'Unknown'}</div>
                  </div>
                  <div style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    In Progress
                  </div>
                </div>
              );
            })}
            {tickets.filter(t => t.status === 'in_production').length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-secondary-text)' }}>No active tasks at the moment.</div>
            )}
          </div>
        </div>

        {/* Latest Visits / Activity */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, fontFamily: '"Poppins", sans-serif' }}>Latest Activity</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {todaysActivity.length > 0 ? todaysActivity.map((a) => {
              const u = users.find(user => user.uid === a.userId);
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <InitialsAvatar name={u?.name} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#fff', fontWeight: 500, lineHeight: 1.4 }}>{a.description}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-secondary-text)', whiteSpace: 'nowrap' }}>
                    {a.timestamp && formatDate(a.timestamp, 'HH:mm')}
                  </div>
                </div>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--color-secondary-text)', fontSize: 13 }}>No recent activity.</div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
