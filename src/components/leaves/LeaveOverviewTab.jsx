import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentFinancialYear } from '../../utils/helpers';
import { 
  CheckCircle, XCircle, Info, Umbrella, 
  AlertTriangle, Clock 
} from 'lucide-react';

export default function LeaveOverviewTab() {
  const [users, setUsers] = useState([]);
  const [balances, setBalances] = useState({});
  const currentFY = getCurrentFinancialYear();

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.isActive));
    });

    const balQ = query(collection(db, 'leaveBalances'), where('financialYear', '==', currentFY));
    const unsubBal = onSnapshot(balQ, (snap) => {
      const balMap = {};
      snap.docs.forEach(d => {
        balMap[d.data().userId] = d.data();
      });
      setBalances(balMap);
    });

    return () => { unsubUsers(); unsubBal(); };
  }, [currentFY]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {users.map(user => (
        <UserLeaveCard 
          key={user.id} 
          user={user} 
          balance={balances[user.id]} 
        />
      ))}
    </div>
  );
}

function UserLeaveCard({ user, balance }) {
  if (!balance) return null;

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={avatarStyle}>{user.name.charAt(0)}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-secondary-text)' }}>{user.role}</div>
          </div>
        </div>
      </div>

      <div style={balanceGridStyle}>
        {/* Column 1: Normal Leave */}
        <div style={balColumnStyle}>
          <div style={balValueStyle}>{balance.normalLeaveBalance?.toFixed(1) || '0.0'}</div>
          <div style={balLabelStyle}>Normal Leave Balance</div>
          <div style={progressContainerStyle}>
            <div style={{ 
              ...progressFillStyle, 
              width: `${Math.min((balance.normalLeaveBalance / 18) * 100, 100)}%`,
              background: 'var(--color-primary)'
            }} />
          </div>
          <div style={subStatsStyle}>
            <span>Accrued: {balance.normalLeaveBalance + balance.normalLeaveTaken}</span>
            <span>Taken: {balance.normalLeaveTaken}</span>
          </div>
        </div>

        {/* Column 2: Sick Leave */}
        <div style={balColumnStyle}>
          <div style={balValueStyle}>{6 - (balance.sickLeaveTaken || 0)}</div>
          <div style={balLabelStyle}>Sick Leave</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ 
                width: 8, height: 8, borderRadius: '50%',
                background: i <= (6 - balance.sickLeaveTaken) ? '#DC2626' : 'var(--color-border)'
              }} />
            ))}
          </div>
          <div style={{ ...subStatsStyle, marginTop: 12 }}>
            <span>Used: {balance.sickLeaveTaken}</span>
            <span>Rem: {6 - balance.sickLeaveTaken}</span>
          </div>
        </div>

        {/* Column 3: Festival Leave */}
        <div style={balColumnStyle}>
          <div style={{ marginBottom: 8 }}>
            {!balance.festivalLeaveUsed ? 
              <CheckCircle size={32} color="#16A34A" /> : 
              <XCircle size={32} color="#DC2626" />
            }
          </div>
          <div style={balLabelStyle}>Festival Leave</div>
          <div style={{ ...subStatsStyle, marginTop: 12 }}>
            <span>{balance.festivalLeaveUsed ? 'Used this year' : 'Not yet claimed'}</span>
          </div>
        </div>

        {/* Column 4: Comp-off & Early Leave */}
        <div style={{ ...balColumnStyle, borderRight: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>{balance.compOffBalance} Comp-off</div>
              <div style={balLabelStyle}>Available Balance</div>
            </div>
            <div>
              <div style={balLabelStyle}>Early Leave Tracker</div>
              <div style={progressContainerStyle}>
                <div style={{ 
                  ...progressFillStyle, 
                  width: `${(balance.earlyLeaveMinutesTotal / 240) * 100}%`,
                  background: '#D97706'
                }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-secondary-text)', marginTop: 4 }}>
                {240 - balance.earlyLeaveMinutesTotal} mins until next deduction
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Monthly Timeline */}
      <div style={timelineContainerStyle}>
        {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map((m, i) => (
          <div key={m} style={timelineItemStyle}>
             <div style={{ 
               width: 12, height: 12, borderRadius: '50%', 
               background: i < new Date().getMonth() - 2 ? '#16A34A' : (i === new Date().getMonth() - 2 ? 'var(--color-primary)' : 'var(--color-border)'),
               marginBottom: 8
             }} />
             <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-secondary-text)' }}>{m}</div>
             <div style={{ fontSize: 9, color: 'var(--color-secondary-text)' }}>+1.5</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const cardStyle = { background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: 24 };
const avatarStyle = { width: 44, height: 44, borderRadius: 12, background: 'var(--color-primary)', color: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 };
const balanceGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderBottom: '1px solid var(--color-border)', paddingBottom: 24 };
const balColumnStyle = { padding: '0 24px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' };
const balValueStyle = { fontSize: 32, fontWeight: 700, color: '#fff', fontFamily: 'Poppins' };
const balLabelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--color-secondary-text)', margin: '4px 0' };
const progressContainerStyle = { width: '100%', height: 6, background: 'var(--color-surface-hover)', borderRadius: 10, marginTop: 8, overflow: 'hidden' };
const progressFillStyle = { height: '100%', borderRadius: 10, transition: 'width 0.3s ease' };
const subStatsStyle = { marginTop: 16, display: 'flex', gap: 12, fontSize: 11, fontWeight: 500, color: 'var(--color-secondary-text)' };
const timelineContainerStyle = { display: 'flex', justifyContent: 'space-between', marginTop: 24, padding: '0 12px' };
const timelineItemStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center' };
