import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { 
  IndianRupee, ChevronLeft, ChevronRight, Settings, 
  RefreshCcw, TrendingUp, TrendingDown, Wallet, 
  ArrowUpRight, ArrowDownRight, Activity, Calendar, Zap
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

import TeamSalaryTable from '../components/salary/TeamSalaryTable';
import MySalaryView from '../components/salary/MySalaryView';
import SalaryProfileModal from '../components/salary/SalaryProfileModal';
import StatCard from '../components/salary/StatCard';
import { calculateMonthlySalary } from '../utils/salaryCalculator';

export default function Salary() {
  const { user, userDoc, isAdmin } = useAuth();
  const toast = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [allHistory, setAllHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [salaryProfiles, setSalaryProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  const yearMonth = format(currentMonth, 'yyyy-MM');

  // Fetch data
  useEffect(() => {
    if (!userDoc) return;
    setLoading(true);

    // Fetch users (if admin)
    const fetchUsers = async () => {
      const q = query(collection(db, 'users'), where('isActive', '==', true));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    // Listen to salary profiles
    const unsubProfiles = onSnapshot(collection(db, 'salaryProfiles'), (snap) => {
      setSalaryProfiles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to salary history for ALL months (for trends)
    const historyQuery = isAdmin 
      ? query(collection(db, 'salaryHistory'), orderBy('month', 'desc'), limit(100))
      : query(collection(db, 'salaryHistory'), where('userId', '==', user.uid), orderBy('month', 'desc'), limit(12));
    
    const unsubHistory = onSnapshot(historyQuery, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllHistory(data);
      setSalaryRecords(data.filter(r => r.month === yearMonth));
      setLoading(false);
    });

    if (isAdmin) fetchUsers();
    else setLoading(false);

    return () => {
      unsubProfiles();
      unsubHistory();
    };
  }, [userDoc, yearMonth, isAdmin]);

  const stats = useMemo(() => {
    const current = salaryRecords.reduce((sum, r) => sum + (r.netSalary || 0), 0);
    const prevMonth = format(subMonths(currentMonth, 1), 'yyyy-MM');
    const previous = allHistory.filter(r => r.month === prevMonth).reduce((sum, r) => sum + (r.netSalary || 0), 0);
    
    const diff = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    
    // Breakdown
    const base = salaryRecords.reduce((sum, r) => sum + (r.monthlySalary || 0), 0);
    const bonus = salaryRecords.reduce((sum, r) => 
      sum + ((r.sundayBonusAmount || 0) + (r.holidayBonusAmount || 0) + (r.overtimeAmount || 0)), 0);
    const deduction = salaryRecords.reduce((sum, r) => sum + (r.totalDeductions || 0), 0);

    return { current, previous, diff, base, bonus, deduction };
  }, [salaryRecords, allHistory, currentMonth]);

  const chartData = useMemo(() => {
    const last6 = [];
    for (let i = 5; i >= 0; i--) {
      const m = format(subMonths(currentMonth, i), 'yyyy-MM');
      const label = format(subMonths(currentMonth, i), 'MMM');
      const total = allHistory.filter(r => r.month === m).reduce((sum, r) => sum + (r.netSalary || 0), 0);
      last6.push({ name: label, value: total });
    }
    return last6;
  }, [allHistory, currentMonth]);

  const handleRecalculate = async (targetUserId = null) => {
    setRecalculating(true);
    try {
      const usersToProcess = targetUserId 
        ? users.filter(u => u.id === targetUserId)
        : users;

      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      for (const u of usersToProcess) {
        // Fetch necessary data
        const [attSnap, timeSnap, holSnap] = await Promise.all([
          getDocs(query(collection(db, 'attendance'), where('userId', '==', u.id), where('date', '>=', format(monthStart, 'yyyy-MM-dd')), where('date', '<=', format(monthEnd, 'yyyy-MM-dd')))),
          getDocs(query(collection(db, 'timeEntries'), where('userId', '==', u.id), where('date', '>=', format(monthStart, 'yyyy-MM-dd')), where('date', '<=', format(monthEnd, 'yyyy-MM-dd')))),
          getDocs(collection(db, 'publicHolidays'))
        ]);

        const attendance = attSnap.docs.map(d => d.data());
        const timeEntries = timeSnap.docs.map(d => d.data());
        const holidays = holSnap.docs.map(d => d.data());

        const currentFY = format(new Date(), 'yyyy') + '-' + (parseInt(format(new Date(), 'yyyy')) + 1); 
        const lbSnap = await getDoc(doc(db, 'leaveBalances', `${u.id}_${currentFY}`));
        const lb = lbSnap.exists() ? lbSnap.data() : {};

        const profile = salaryProfiles.find(p => p.userId === u.id) || {};

        if (profile.monthlySalary) {
          const result = calculateMonthlySalary(u.id, yearMonth, attendance, timeEntries, holidays, lb, profile);
          await setDoc(doc(db, 'salaryHistory', `${u.id}_${yearMonth}`), {
            ...result,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }
      toast.success(targetUserId ? 'Salary recalculated' : 'All salaries recalculated');
    } catch (err) {
      console.error(err);
      toast.error('Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', fontFamily: '"Poppins", sans-serif' }}>
      {/* Premium Hero Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%)', 
        padding: '40px 48px 100px', color: '#fff', position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid var(--color-border)'
      }}>
        {/* Abstract background shapes */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(37, 87, 167, 0.15)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, borderRadius: '50%', background: 'rgba(52, 211, 153, 0.1)', filter: 'blur(60px)' }} />

        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <IndianRupee size={24} color="#34D399" />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#fff' }}>{isAdmin ? 'Team Earnings Dashboard' : 'My Earnings'}</h1>
            </div>
            <p style={{ color: 'var(--color-secondary-text)', margin: 0, fontSize: 14 }}>
              Financial overview and payroll management for <span style={{ color: '#fff', fontWeight: 600 }}>{format(currentMonth, 'MMMM yyyy')}</span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', position: 'relative', zIndex: 10 }}>
            {isAdmin && (
              <button onClick={() => setShowProfileModal(true)} style={heroBtnStyle} className="hover:bg-[rgba(255,255,255,0.1)]">
                <Settings size={18} /> Manage Profiles
              </button>
            )}
            <div style={monthSwitcherStyle}>
              <button onClick={() => setCurrentMonth(p => subMonths(p, 1))} style={switchBtnStyle} className="hover:opacity-100 hover:scale-110"><ChevronLeft size={20} /></button>
              <span style={{ minWidth: 140, textAlign: 'center', fontWeight: 600, color: '#fff', fontSize: 14 }}>{format(currentMonth, 'MMMM yyyy')}</span>
              <button onClick={() => setCurrentMonth(p => addMonths(p, 1))} style={switchBtnStyle} className="hover:opacity-100 hover:scale-110"><ChevronRight size={20} /></button>
            </div>
            {isAdmin && (
              <button onClick={() => handleRecalculate()} disabled={recalculating} style={{ ...heroBtnStyle, background: 'rgba(52, 211, 153, 0.15)', color: '#34D399', borderColor: 'rgba(52, 211, 153, 0.3)' }} className="hover:bg-[rgba(52,211,153,0.25)]">
                <RefreshCcw size={18} className={recalculating ? 'spinning' : ''} />
                {recalculating ? 'Syncing...' : 'Sync Payroll'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content (Shifted up onto hero) */}
      <div style={{ maxWidth: 1400, margin: '-60px auto 40px', padding: '0 48px', position: 'relative', zIndex: 10 }}>
        {/* Top Level Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 32 }}>
          <StatCard 
            label="Net Monthly Outflow" 
            value={`₹${stats.current.toLocaleString()}`} 
            icon={Wallet} 
            trend={stats.diff} 
          />
          <StatCard 
            label="Base Compensation" 
            value={`₹${stats.base.toLocaleString()}`} 
            icon={Calendar} 
            color="var(--color-primary)"
          />
          <StatCard 
            label="Total Bonuses" 
            value={`₹${stats.bonus.toLocaleString()}`} 
            icon={TrendingUp} 
            color="#10B981"
          />
          <StatCard 
            label="Total Deductions" 
            value={`₹${stats.deduction.toLocaleString()}`} 
            icon={TrendingDown} 
            color="#EF4444"
          />
        </div>

        {/* Charts and Details Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 24 }}>
          {/* Main Table / View */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 24, padding: 32, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            {loading ? (
              <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loader"></div></div>
            ) : (
              isAdmin ? (
                <TeamSalaryTable 
                  users={users} 
                  records={salaryRecords} 
                  profiles={salaryProfiles}
                  yearMonth={yearMonth}
                  onRecalculate={handleRecalculate}
                />
              ) : (
                <MySalaryView 
                  record={salaryRecords.find(r => r.userId === user?.uid)}
                  currentMonth={currentMonth}
                />
              )
            )}
          </div>

          {/* Sidebar Insights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Trend Chart Card */}
            <div style={insightCardStyle}>
              <h3 style={insightHeaderStyle}><div style={{ background: 'var(--color-primary-light)', padding: 6, borderRadius: 8 }}><Activity size={18} color="var(--color-primary)" /></div> Earnings Trend</h3>
              <div style={{ height: 200, marginTop: 24 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2557A7" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2557A7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-secondary-text)', fontFamily: '"Noto Sans"' }} />
                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, color: '#fff' }} itemStyle={{ color: '#fff' }} cursor={{ stroke: 'var(--color-border)' }} />
                    <Area type="monotone" dataKey="value" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions / Tips */}
            <div style={{ ...insightCardStyle, background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)', color: '#fff', border: '1px solid rgba(37, 87, 167, 0.4)' }}>
              <h3 style={{ ...insightHeaderStyle, color: '#fff' }}><Zap size={18} fill="#fff" /> Quick Insight</h3>
              <p style={{ fontSize: 13, opacity: 0.9, margin: '16px 0 24px', lineHeight: 1.6 }}>
                Your team utilization is up by 12% this month. This has resulted in a ₹45k increase in overtime payouts.
              </p>
              <button style={{ 
                width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', 
                background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, 
                fontSize: 13, cursor: 'pointer', backdropFilter: 'blur(5px)', transition: 'all 0.2s' 
              }} className="hover:bg-[rgba(255,255,255,0.2)]">
                View Detailed Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {showProfileModal && (
        <SalaryProfileModal 
          users={users}
          profiles={salaryProfiles}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}


const heroBtnStyle = {
  background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '10px 20px', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(10px)', transition: 'all 0.2s'
};

const monthSwitcherStyle = {
  display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.05)',
  padding: '6px 8px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)',
  backdropFilter: 'blur(10px)'
};

const switchBtnStyle = {
  background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: 6, display: 'flex', borderRadius: 8, transition: 'all 0.2s', opacity: 0.8
};

const insightCardStyle = {
  background: 'var(--color-surface)', borderRadius: 24, padding: '32px 24px', border: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-card)'
};

const insightHeaderStyle = {
  display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700,
  color: '#fff', margin: 0, fontFamily: '"Poppins"'
};
