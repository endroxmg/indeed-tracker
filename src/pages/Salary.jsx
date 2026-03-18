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
  serverTimestamp 
} from 'firebase/firestore';
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { IndianRupee, ChevronLeft, ChevronRight, Settings, RefreshCcw } from 'lucide-react';
import { useToast } from '../components/Toast';

import TeamSalaryTable from '../components/salary/TeamSalaryTable';
import MySalaryView from '../components/salary/MySalaryView';
import SalaryProfileModal from '../components/salary/SalaryProfileModal';
import { calculateMonthlySalary } from '../utils/salaryCalculator';

export default function Salary() {
  const { user, userDoc, isAdmin } = useAuth();
  const toast = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [salaryProfiles, setSalaryProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

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

    // Listen to salary history for this month
    const historyQuery = isAdmin 
      ? query(collection(db, 'salaryHistory'), where('month', '==', yearMonth))
      : query(collection(db, 'salaryHistory'), where('month', '==', yearMonth), where('userId', '==', user.uid));
    
    const unsubHistory = onSnapshot(historyQuery, (snap) => {
      setSalaryRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    if (isAdmin) fetchUsers();
    else setLoading(false);

    return () => {
      unsubProfiles();
      unsubHistory();
    };
  }, [userDoc, yearMonth, isAdmin]);

  const handleRecalculate = async (targetUserId = null) => {
    setRecalculating(true);
    try {
      const usersToProcess = targetUserId 
        ? users.filter(u => u.id === targetUserId)
        : users;

      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      for (const u of usersToProcess) {
        // Fetch necessary data for calculation
        // 1. Attendance
        const attQ = query(
          collection(db, 'attendance'), 
          where('userId', '==', u.id || u.uid),
          where('date', '>=', format(monthStart, 'yyyy-MM-dd')),
          where('date', '<=', format(monthEnd, 'yyyy-MM-dd'))
        );
        const attSnap = await getDocs(attQ);
        const attendance = attSnap.docs.map(d => d.data());

        // 2. Time Entries
        const timeQ = query(
          collection(db, 'timeEntries'),
          where('designerId', '==', u.id || u.uid),
          where('date', '>=', format(monthStart, 'yyyy-MM-dd')),
          where('date', '<=', format(monthEnd, 'yyyy-MM-dd'))
        );
        const timeSnap = await getDocs(timeQ);
        const timeEntries = timeSnap.docs.map(d => d.data());

        // 3. Public Holidays (already in context usually, but let's fetch for safety)
        const holSnap = await getDocs(collection(db, 'publicHolidays'));
        const holidays = holSnap.docs.map(d => d.data());

        // 4. Leave Balance (for current FY) - simplify for now
        // Usually we need the balance as of that month. 
        // For simplicity, we use the current balance.
        const currentFY = format(new Date(), 'yyyy') + '-' + (parseInt(format(new Date(), 'yyyy')) + 1); 
        // Real logic would detect FY from currentMonth
        const lbRef = doc(db, 'leaveBalances', `${u.id || u.uid}_${currentFY}`);
        const lbSnap = await getDoc(lbRef);
        const lb = lbSnap.exists() ? lbSnap.data() : {};

        // 5. Salary Profile
        const profile = salaryProfiles.find(p => p.userId === (u.id || u.uid)) || {};

        if (profile.monthlySalary) {
          const result = calculateMonthlySalary(
            u.id || u.uid,
            yearMonth,
            attendance,
            timeEntries,
            holidays,
            lb,
            profile
          );

          // Save to Firestore
          const docId = `${u.id || u.uid}_${yearMonth}`;
          await setDoc(doc(db, 'salaryHistory', docId), {
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
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', fontFamily: '"Noto Sans"' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A1A2E', fontFamily: '"Poppins"', margin: 0 }}>
            {isAdmin ? 'Salary Management' : 'My Salary'}
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
            Track earnings, bonuses, and deductions
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {isAdmin && (
            <button 
              onClick={() => setShowProfileModal(true)} 
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Settings size={18} /> Manage Salary Profiles
            </button>
          )}

          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 12, 
            background: '#fff', padding: '6px 12px', borderRadius: 10, border: '1px solid #E5E7EB' 
          }}>
            <button 
              onClick={() => setCurrentMonth(p => subMonths(p, 1))}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
            >
              <ChevronLeft size={20} color="#6B7280" />
            </button>
            <span style={{ fontWeight: 600, fontSize: 15, minWidth: 120, textAlign: 'center' }}>
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button 
              onClick={() => setCurrentMonth(p => addMonths(p, 1))}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
            >
              <ChevronRight size={20} color="#6B7280" />
            </button>
          </div>
          
          {isAdmin && (
            <button 
              onClick={() => handleRecalculate()} 
              disabled={recalculating}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140, justifyContent: 'center' }}
            >
              <RefreshCcw size={18} className={recalculating ? 'animate-spin' : ''} />
              {recalculating ? 'Calculating...' : 'Recalculate All'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"></div>
        </div>
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
            record={salaryRecords.find(r => r.userId === user.uid)}
            currentMonth={currentMonth}
          />
        )
      )}

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
