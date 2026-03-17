import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeTickets, subscribeUsers, subscribeActivityLog } from '../services/firestoreService';
import { getWorkingDaysInMonth, STATUS_COLORS, STATUS_LABELS, TICKET_TYPE_COLORS, TYPE_LABELS, formatDate, isOverdue } from '../utils/helpers';
import { SkeletonCard } from '../components/Skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Ticket, Clock, CheckCircle2, Timer, TrendingUp, DollarSign } from 'lucide-react';
import InitialsAvatar from '../components/InitialsAvatar';
import { format, startOfMonth, endOfMonth, isToday } from 'date-fns';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { userDoc } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedReminder, setDismissedReminder] = useState(false);

  useEffect(() => {
    const unsub1 = subscribeTickets((data) => { setTickets(data); setLoading(false); });
    const unsub2 = subscribeUsers(setUsers);
    const unsub3 = subscribeActivityLog(setActivities, 20);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

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
    const incomeINR = incomeUSD * 85;
    return [
      { label: 'In Production', value: tickets.filter((t) => t.status === 'in_production').length, icon: Timer, color: '#2557A7', bg: '#E8EDF7' },
      { label: 'Completed', value: completedThisMonth.length, icon: CheckCircle2, color: '#0D7A3F', bg: '#ECFDF5' },
      { label: 'Hours Logged', value: `${totalHoursMonth}h`, icon: Clock, color: '#2557A7', bg: '#E8EDF7' },
      { label: 'Income', value: `$${incomeUSD.toLocaleString()}`, subValue: `₹${incomeINR.toLocaleString()}`, icon: DollarSign, color: '#0D7A3F', bg: '#ECFDF5' },
    ];
  }, [tickets, timeEntries]);

  const utilizationData = useMemo(() => {
    const now = new Date();
    const workDays = getWorkingDaysInMonth(now.getFullYear(), now.getMonth());
    return designers.map((user) => {
      const logged = timeEntries.filter((e) => e.userId === user.uid).reduce((s, e) => s + (e.hours || 0), 0);
      const expected = workDays * (user.dailyCapacity || 8);
      return { name: user.name, Expected: expected, Logged: logged };
    });
  }, [designers, timeEntries]);

  const statusData = useMemo(() => {
    const counts = {};
    tickets.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
    const colorMap = { todo: '#767676', in_production: '#2557A7', ready_for_feedback: '#D97706', feedback_ready: '#C91B1B', completed: '#0D7A3F' };
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status, value: count, color: colorMap[status] || '#767676',
    }));
  }, [tickets]);

  const todaysActivity = useMemo(() => {
    return activities.filter((a) => {
      if (!a.timestamp) return false;
      const ts = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      return isToday(ts);
    }).slice(0, 8);
  }, [activities]);

  const hasLoggedToday = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return timeEntries.some((e) => e.userId === userDoc?.uid && e.date === today);
  }, [timeEntries, userDoc]);

  const activityColors = {
    ticket_created: '#2557A7', ticket_moved: '#D97706', ticket_completed: '#0D7A3F',
    time_logged: '#6D28D9', version_submitted: '#2557A7', feedback_synced: '#0891B2',
  };

  const cardStyle = {
    background: '#FFFFFF', borderRadius: 12, border: '1px solid #D4D2D0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  };

  if (loading) return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>;

  return (
    <div>
      {/* Reminder */}
      {!hasLoggedToday && !dismissedReminder && (
        <div style={{
          background: '#E8EDF7', borderRadius: 10, padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, border: '1px solid #B8CCEB',
        }}>
          <span style={{ fontSize: 14, color: '#2557A7', fontWeight: 600 }}>⏰ Don't forget to log your time for today!</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/timelog')} className="btn-primary" style={{ padding: '6px 16px', fontSize: 13 }}>Log Now</button>
            <button onClick={() => setDismissedReminder(true)} className="btn-secondary" style={{ padding: '6px 16px', fontSize: 13 }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} style={{ ...cardStyle, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#767676', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</span>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={stat.color} />
                </div>
              </div>
              <div style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 28, color: '#1A1A2E', lineHeight: 1 }}>{stat.value}</div>
              {stat.subValue && <div style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 14, color: '#767676', marginTop: 4 }}>{stat.subValue}</div>}
            </div>
          );
        })}
      </div>

      {/* Middle Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: 20, marginBottom: 24 }}>
        {/* Active Tickets */}
        <div style={{ ...cardStyle, padding: 24 }}>
          <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 15, margin: '0 0 16px', color: '#1A1A2E', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ticket size={18} color="#2557A7" /> Active Tickets
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {designers.map((designer) => {
              const activeTicket = tickets.find((t) => t.status === 'in_production' && (t.ldap === designer.ldap || t.assigneeId === designer.uid));
              return (
                <div key={designer.uid}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <InitialsAvatar name={designer.name} size={28} />
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: '"Poppins", sans-serif', color: '#1A1A2E' }}>{designer.name}</span>
                      {designer.ldap && (
                        <span style={{ fontSize: 10, fontWeight: 600, marginLeft: 6, padding: '1px 6px', borderRadius: 4, background: '#F0FDF4', color: '#166534', fontFamily: 'monospace' }}>{designer.ldap}</span>
                      )}
                    </div>
                  </div>
                  {activeTicket ? (
                    <div style={{ background: '#F9F9F8', borderRadius: 10, padding: 14, border: '1px solid #E8E8E8' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#2557A7', marginBottom: 4 }}>{activeTicket.jiraId}</div>
                      <div style={{ fontSize: 13, color: '#1A1A2E', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{activeTicket.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: TICKET_TYPE_COLORS[activeTicket.type]?.bg, color: TICKET_TYPE_COLORS[activeTicket.type]?.text, fontWeight: 600 }}>{TYPE_LABELS[activeTicket.type]}</span>
                        {activeTicket.ldap && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F0FDF4', color: '#166534', fontWeight: 600, fontFamily: 'monospace' }}>{activeTicket.ldap}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ border: '2px dashed #D4D2D0', borderRadius: 10, padding: 24, textAlign: 'center' }}>
                      <p style={{ fontSize: 13, color: '#999', margin: 0 }}>No active ticket</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Activity */}
        <div style={{ ...cardStyle, padding: 24 }}>
          <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 15, margin: '0 0 16px', color: '#1A1A2E' }}>Today's Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 280, overflowY: 'auto' }}>
            {todaysActivity.length > 0 ? todaysActivity.map((a) => (
              <div key={a.id} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: activityColors[a.type] || '#767676' }} />
                <div>
                  <p style={{ fontSize: 13, color: '#1A1A2E', margin: 0, lineHeight: 1.4 }}>{a.description}</p>
                  <span style={{ fontSize: 11, color: '#999' }}>{a.timestamp && formatDate(a.timestamp, 'hh:mm a')}</span>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: 13, color: '#999', textAlign: 'center', padding: 32 }}>No activity yet today</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 24 }}>
          <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 15, margin: '0 0 16px', color: '#1A1A2E', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="#2557A7" /> Utilization This Month
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#767676' }} />
              <YAxis tick={{ fontSize: 12, fill: '#767676' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D4D2D0', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="Expected" fill="#E8E8E8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Logged" fill="#2557A7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
          <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 15, margin: '0 0 16px', color: '#1A1A2E' }}>Tickets by Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                dataKey="value" paddingAngle={3} label={({ name, value }) => `${name} (${value})`}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D4D2D0', fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
