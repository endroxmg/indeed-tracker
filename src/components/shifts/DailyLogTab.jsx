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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Today Team Status */}
      <section>
        <div style={sectionTitleStyle}>Today, {format(today, 'dd MMMM yyyy')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {users.map(user => {
            const att = attendance[user.id];
            return (
              <div key={user.id} style={userCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={avatarStyle}>{user.name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{user.name}</div>
                    <div style={{ 
                      display: 'inline-block', padding: '2px 8px', borderRadius: 20, 
                      fontSize: 10, fontWeight: 600, marginTop: 4,
                      background: ATTENDANCE_STATUS_COLORS[att?.status || 'working']?.bg,
                      color: ATTENDANCE_STATUS_COLORS[att?.status || 'working']?.text
                    }}>
                      {ATTENDANCE_STATUS_LABELS[att?.status || 'working']}
                    </div>
                  </div>
                </div>
                
                <div style={cardInfoStyle}>
                  {att?.status === 'working' ? (
                    <div style={{ fontSize: 13, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} /> {formatShiftTime(att.shiftStart)} – {formatShiftTime(att.shiftEnd)}
                    </div>
                  ) : att?.leaveType ? (
                    <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>
                      On {att.leaveType.charAt(0).toUpperCase() + att.leaveType.slice(1)} Leave
                    </div>
                  ) : null}
                </div>

                <div style={{ marginTop: 12, borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
                  <button onClick={() => handleQuickEdit(user)} style={quickEditBtnStyle}>
                    <Edit3 size={14} /> Edit Today
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
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <th style={thStyle}>User</th>
                {[0, 1, 2, 3, 4, 5, 6].map(i => {
                  const d = addDays(today, i);
                  return <th key={i} style={thStyle}>{format(d, 'EEE dd')}</th>
                })}
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 5).map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={tdStyle}>{u.name}</td>
                  {[0, 1, 2, 3, 4, 5, 6].map(i => (
                    <td key={i} style={tdStyle}><div style={compactIndicatorStyle} /></td>
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
        <div style={logContainerStyle}>
          {recentLogs.map(log => (
            <div key={log.id} style={logItemStyle}>
              <div style={avatarStyleSmall}>{log.userName?.charAt(0) || 'S'}</div>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{log.userName || 'System'}</span>
                <span style={{ margin: '0 8px', color: '#6B7280' }}>•</span>
                <span style={{ color: '#2D2D2D' }}>{log.action}</span>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  {log.timestamp ? format(log.timestamp.toDate(), 'dd MMM, hh:mm a') : 'Just now'}
                </div>
              </div>
            </div>
          ))}
        </div>
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

const sectionTitleStyle = { fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 16, borderLeft: '4px solid #0451CC', paddingLeft: 12 };
const userCardStyle = { background: '#fff', padding: 16, borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const avatarStyle = { width: 44, height: 44, borderRadius: 12, background: '#0451CC', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 };
const cardInfoStyle = { marginTop: 12, minHeight: 20 };
const quickEditBtnStyle = { background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#4B5563', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' };
const tableContainerStyle = { background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' };
const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280', background: '#F9FAFB' };
const tdStyle = { padding: '12px 16px', fontSize: 13 };
const compactIndicatorStyle = { width: 12, height: 12, borderRadius: '50%', background: '#ECFDF5', border: '2px solid #16A34A', margin: '0 auto' };
const logContainerStyle = { display: 'flex', flexDirection: 'column', gap: 12 };
const logItemStyle = { display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, background: '#fff', borderRadius: 12, border: '1px solid #F3F4F6' };
const avatarStyleSmall = { width: 28, height: 28, borderRadius: 8, background: '#6B7280', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 };
