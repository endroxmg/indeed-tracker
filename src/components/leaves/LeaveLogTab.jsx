import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Search, Filter, Calendar as CalIcon, Trash2, Edit3 } from 'lucide-react';
import { ATTENDANCE_STATUS_COLORS, ATTENDANCE_STATUS_LABELS } from '../../utils/helpers';

export default function LeaveLogTab() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ user: 'all', type: 'all', month: 'all' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const q = query(collection(db, 'attendance'), where('status', 'in', ['leave', 'half_day', 'early_leave']), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubUsers(); unsubLogs(); };
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesUser = filters.user === 'all' || log.userId === filters.user;
    const matchesType = filters.type === 'all' || log.status === filters.type || log.leaveType === filters.type;
    const matchesSearch = log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || log.date.includes(searchTerm);
    return matchesUser && matchesType && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Filter Bar */}
      <div style={filterBarStyle}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input 
            type="text" placeholder="Search by date or notes..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
        </div>
        
        <select value={filters.user} onChange={(e) => setFilters({...filters, user: e.target.value})} style={selectStyle}>
          <option value="all">All Users</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>

        <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})} style={selectStyle}>
          <option value="all">All Types</option>
          <option value="normal">Normal Leave</option>
          <option value="sick">Sick Leave</option>
          <option value="half_day">Half Day</option>
          <option value="early_leave">Early Leave</option>
        </select>
      </div>

      {/* Table */}
      <div style={tableContainerStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Notes</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => {
              const user = users.find(u => u.id === log.userId);
              return (
                <tr key={log.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{format(new Date(log.date), 'dd MMM yyyy')}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{format(new Date(log.date), 'EEEE')}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={avatarSmallStyle}>{user?.name.charAt(0)}</div>
                      {user?.name}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ 
                      display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: ATTENDANCE_STATUS_COLORS[log.status]?.bg || '#F3F4F6',
                      color: ATTENDANCE_STATUS_COLORS[log.status]?.text || '#374151'
                    }}>
                      {log.leaveType ? log.leaveType.charAt(0).toUpperCase() + log.leaveType.slice(1) : ATTENDANCE_STATUS_LABELS[log.status]}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16A34A', fontWeight: 600, fontSize: 12 }}>
                      <CheckCircle size={14} /> Approved
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: '#6B7280', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.notes || '—'}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button style={actionBtnStyle}><Edit3 size={16} /></button>
                      {isAdmin && <button style={{ ...actionBtnStyle, color: '#DC2626' }}><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={summaryRowStyle}>
        Showing {filteredLogs.length} leave events | 
        {filteredLogs.filter(l => l.leaveType === 'normal').length} normal | 
        {filteredLogs.filter(l => l.leaveType === 'sick').length} sick | 
        {filteredLogs.filter(l => l.status === 'half_day').length} half days | 
        {filteredLogs.filter(l => l.status === 'early_leave').length} early leaves
      </div>
    </div>
  );
}

const filterBarStyle = { display: 'flex', gap: 16, alignItems: 'center' };
const searchInputStyle = { width: '100%', padding: '10px 12px 10px 40px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14 };
const selectStyle = { padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14, background: '#fff', minWidth: 160 };
const tableContainerStyle = { background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' };
const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280' };
const tdStyle = { padding: '16px', fontSize: 13, color: '#2D2D2D' };
const avatarSmallStyle = { width: 24, height: 24, borderRadius: 6, background: '#0451CC', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const actionBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 };
const summaryRowStyle = { padding: '12px 20px', background: '#F9FAFB', borderRadius: 12, fontSize: 12, color: '#6B7280', fontWeight: 500 };
