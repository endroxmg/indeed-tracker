import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { getCurrentFinancialYear } from '../../utils/helpers';
import { Umbrella } from 'lucide-react';

export default function LeaveBalanceWidget() {
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

  const getNormalColor = (bal) => {
    if (bal > 9) return '#16A34A';
    if (bal >= 4.5) return '#D97706';
    return '#DC2626';
  };

  const getSickColor = (bal) => {
    if (bal >= 4) return '#16A34A';
    if (bal >= 2) return '#D97706';
    return '#DC2626';
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Umbrella size={20} color="#0451CC" />
          <h3 style={titleStyle}>Team Leave Balances</h3>
        </div>
        <div style={badgeStyle}>FY {currentFY}</div>
      </div>

      <div style={contentStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={thRowStyle}>
              <th style={thStyle}>Team Member</th>
              <th style={thStyle}>Normal</th>
              <th style={thStyle}>Sick</th>
              <th style={thStyle}>Festival</th>
              <th style={thStyle}>Comp-off</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const bal = balances[user.id] || {};
              const sickRem = 6 - (bal.sickLeaveTaken || 0);
              return (
                <tr key={user.id} style={trStyle}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={avatarSmallStyle}>{user.name.charAt(0)}</div>
                      <span style={{ fontWeight: 600 }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: getNormalColor(bal.normalLeaveBalance || 0), fontWeight: 700 }}>
                    {bal.normalLeaveBalance?.toFixed(1) || '0.0'}
                  </td>
                  <td style={{ ...tdStyle, color: getSickColor(sickRem), fontWeight: 600 }}>
                    {sickRem}/6
                  </td>
                  <td style={tdStyle}>
                    {bal.festivalLeaveUsed ? <span style={{ color: '#9CA3AF' }}>✗</span> : <span style={{ color: '#16A34A' }}>✓</span>}
                  </td>
                  <td style={{ ...tdStyle, color: bal.compOffBalance > 0 ? '#0451CC' : '#9CA3AF', fontWeight: 600 }}>
                    {bal.compOffBalance || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={footerStyle}>
        Resets on 1 Apr {parseInt(currentFY.split('-')[1])}
      </div>
    </div>
  );
}

const cardStyle = { background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 };
const titleStyle = { fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'Poppins' };
const badgeStyle = { background: '#EAF0FD', color: '#0451CC', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700 };
const contentStyle = { marginBottom: 16 };
const thRowStyle = { borderBottom: '1px solid #F3F4F6' };
const thStyle = { padding: '8px 4px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' };
const trStyle = { borderBottom: '1px solid #F9FAFB' };
const tdStyle = { padding: '12px 4px', fontSize: 13 };
const avatarSmallStyle = { width: 24, height: 24, borderRadius: 6, background: '#F3F4F6', color: '#4B5563', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const footerStyle = { fontSize: 11, color: '#9CA3AF', textAlign: 'center' };
