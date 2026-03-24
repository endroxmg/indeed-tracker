import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { format, addDays, startOfDay } from 'date-fns';
import { 
  User, CheckCircle, Clock, Umbrella, 
  Calendar, Edit3, ChevronRight 
} from 'lucide-react';
import { 
  ATTENDANCE_STATUS_COLORS, ATTENDANCE_STATUS_LABELS,
  formatShiftTime, toDateString
} from '../../utils/helpers';
import EditDayModal from './EditDayModal';

export default function DailyLogTab() {
  const { publicHolidays } = useAuth();
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [shifts, setShifts] = useState({});
  const [recentLogs, setRecentLogs] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const today = new Date();
  const todayStr = toDateString(today);

  useEffect(() => {
    // Users & Attendance
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.isActive));
    });

    const attQ = query(collection(db, 'attendance'), where('date', '==', todayStr));
    const unsubAtt = onSnapshot(attQ, (snap) => {
      const attMap = {};
      snap.docs.forEach(d => {
        attMap[d.data().userId] = d.data();
      });
      setAttendance(attMap);
    });

    // Recent Activity Logs related to attendance
    const logsQ = query(
      collection(db, 'activityLog'), 
      where('type', 'in', ['attendance', 'system']),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const unsubLogs = onSnapshot(logsQ, (snap) => {
      setRecentLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubUsers(); unsubAtt(); unsubLogs(); };
  }, []);

  const handleQuickEdit = (user) => {
    setSelectedDay({ user, date: today });
    setShowEditModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* Today Team Status */}
      <section>
        <div style={sectionTitleStyle}>Today, <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>{format(today, 'dd MMMM yyyy')}</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {users.map(user => {
            const att = attendance[user.id];
            return (
              <div key={user.id} style={userCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={avatarStyle}>{user.name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{user.name}</div>
                    <div style={{ 
                      display: 'inline-block', padding: '4px 10px', borderRadius: 20, 
                      fontSize: 10, fontWeight: 800, marginTop: 6,
                      background: ATTENDANCE_STATUS_COLORS[att?.status || 'working']?.bg || 'var(--color-surface-hover)',
                      color: ATTENDANCE_STATUS_COLORS[att?.status || 'working']?.text || 'var(--color-secondary-text)',
                      textTransform: 'uppercase', letterSpacing: '0.05em', border: `1px solid ${ATTENDANCE_STATUS_COLORS[att?.status || 'working']?.text || '#6B7280'}40`
                    }}>
                      {ATTENDANCE_STATUS_LABELS[att?.status || 'working']}
                    </div>
                  </div>
                </div>
                
                <div style={cardInfoStyle}>
                  {att?.status === 'working' ? (
                    <div style={{ fontSize: 13, color: 'var(--color-secondary-text)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                      <Clock size={16} color="var(--color-primary)" /> {formatShiftTime(att.shiftStart)} – {formatShiftTime(att.shiftEnd)}
                    </div>
                  ) : att?.leaveType ? (
                    <div style={{ fontSize: 14, color: '#EF4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Umbrella size={16} /> On {att.leaveType.charAt(0).toUpperCase() + att.leaveType.slice(1)} Leave
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--color-secondary-text)', fontWeight: 500 }}>
                      Shift data pending
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                  <button onClick={() => handleQuickEdit(user)} style={quickEditBtnStyle} className="hover:border-[var(--color-primary)] hover:text-white transition-all">
                    <Edit3 size={16} /> Edit Today
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Upcoming Week Mini Table */}
      <section>
        <div style={sectionTitleStyle}>Upcoming This Week</div>
        <div style={tableContainerStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
                <th style={thStyle}>Team Member</th>
                {[0, 1, 2, 3, 4, 5, 6].map(i => {
                  const d = addDays(today, i);
                  return <th key={i} style={{ ...thStyle, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{format(d, 'EEE')}</div>
                    <div style={{ fontSize: 14, color: '#fff', marginTop: 2 }}>{format(d, 'dd')}</div>
                  </th>
                })}
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 5).map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                  <td style={tdStyle}><span style={{ fontWeight: 600, color: '#fff' }}>{u.name}</span></td>
                  {[0, 1, 2, 3, 4, 5, 6].map(i => (
                    <td key={i} style={{ ...tdStyle, textAlign: 'center' }}><div style={compactIndicatorStyle} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div style={sectionTitleStyle}>Recent Attendance Log</div>
        {recentLogs.length === 0 ? (
          <div style={{ padding: 32, background: 'var(--color-surface)', borderRadius: 16, border: '1px dashed var(--color-border)', textAlign: 'center', color: 'var(--color-secondary-text)' }}>
             No recent attendance changes.
          </div>
        ) : (
          <div style={logContainerStyle}>
            {recentLogs.map((log, index) => (
              <div key={log.id} style={{ ...logItemStyle, borderBottom: index === recentLogs.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                <div style={avatarStyleSmall}>{log.userName?.charAt(0) || 'S'}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{log.userName || 'System'}</span>
                  <span style={{ margin: '0 10px', color: 'var(--color-border)' }}>•</span>
                  <span style={{ color: 'var(--color-secondary-text)', fontWeight: 500 }}>{log.action}</span>
                  <div style={{ fontSize: 11, color: 'var(--color-secondary-text)', marginTop: 4, fontWeight: 500 }}>
                    {log.timestamp ? format(log.timestamp.toDate(), 'dd MMM, h:mm a') : 'Just now'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showEditModal && (
        <EditDayModal 
          user={selectedDay.user} 
          date={selectedDay.date} 
          onClose={() => setShowEditModal(false)} 
        />
      )}
    </div>
  );
}

const sectionTitleStyle = { fontFamily: '"Poppins"', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 24, borderLeft: '4px solid var(--color-primary)', paddingLeft: 16 };
const userCardStyle = { background: 'var(--color-surface)', padding: 24, borderRadius: 20, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' };
const avatarStyle = { width: 48, height: 48, borderRadius: 14, background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, border: '1px solid rgba(37, 87, 167, 0.3)' };
const cardInfoStyle = { marginTop: 16, minHeight: 24, background: 'var(--color-background)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--color-border)' };
const quickEditBtnStyle = { background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, color: 'var(--color-secondary-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' };
const tableContainerStyle = { background: 'var(--color-surface)', borderRadius: 20, border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' };
const thStyle = { padding: '16px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-text)' };
const tdStyle = { padding: '16px 20px', fontSize: 14 };
const compactIndicatorStyle = { width: 14, height: 14, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '2px solid #10B981', margin: '0 auto', boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)' };
const logContainerStyle = { display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: 20, border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' };
const logItemStyle = { display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px 24px', background: 'transparent' };
const avatarStyleSmall = { width: 32, height: 32, borderRadius: 10, background: 'var(--color-border)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 };
