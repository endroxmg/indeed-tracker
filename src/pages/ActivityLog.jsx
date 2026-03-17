import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeUsers } from '../services/firestoreService';
import { useToast } from '../components/Toast';
import { collection, query, orderBy, onSnapshot, where, Timestamp, limit as fbLimit } from 'firebase/firestore';
import { db } from '../firebase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Activity, Search, Filter, Calendar, ArrowRight, Plus, Trash2,
  UserCheck, UserX, Send, GitBranch, Clock, CheckCircle2, XCircle,
  Edit3, RefreshCw,
} from 'lucide-react';
import InitialsAvatar from '../components/InitialsAvatar';
import { SkeletonCard } from '../components/Skeleton';

const TYPE_ICONS = {
  ticket_created: { icon: Plus, color: '#16A34A', bg: '#F0FDF4' },
  ticket_moved: { icon: ArrowRight, color: '#0451CC', bg: '#EFF6FF' },
  ticket_completed: { icon: CheckCircle2, color: '#0D7A3F', bg: '#ECFDF5' },
  ticket_deleted: { icon: Trash2, color: '#DC2626', bg: '#FEF2F2' },
  ticket_updated: { icon: Edit3, color: '#D97706', bg: '#FFF7ED' },
  user_approved: { icon: UserCheck, color: '#16A34A', bg: '#F0FDF4' },
  user_created: { icon: UserCheck, color: '#0451CC', bg: '#EFF6FF' },
  user_invited: { icon: Send, color: '#7C3AED', bg: '#F5F3FF' },
  role_changed: { icon: GitBranch, color: '#D97706', bg: '#FFF7ED' },
  time_logged: { icon: Clock, color: '#0891B2', bg: '#ECFEFF' },
};

const TYPE_LABELS = {
  ticket_created: 'Ticket Created',
  ticket_moved: 'Ticket Moved',
  ticket_completed: 'Ticket Completed',
  ticket_deleted: 'Ticket Deleted',
  ticket_updated: 'Ticket Updated',
  user_approved: 'User Approved',
  user_created: 'User Created',
  user_invited: 'User Invited',
  role_changed: 'Role Changed',
  time_logged: 'Time Logged',
};

export default function ActivityLog() {
  const { userDoc } = useAuth();
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    search: '',
    dateFrom: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
  });
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    const unsub = subscribeUsers(setUsers);
    return () => unsub();
  }, []);

  useEffect(() => {
    setLoading(true);
    const constraints = [orderBy('timestamp', 'desc'), fbLimit(500)];
    if (filters.dateFrom) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(startOfDay(new Date(filters.dateFrom)))));
    }
    if (filters.dateTo) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(endOfDay(new Date(filters.dateTo)))));
    }

    // Firestore requires orderBy field in where inequalities to come first
    const q = query(
      collection(db, 'activityLog'),
      orderBy('timestamp', 'desc'),
      fbLimit(500)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLogs(data);
      setLoading(false);
    }, (err) => {
      console.error('Activity log error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredLogs = useMemo(() => {
    const from = filters.dateFrom ? startOfDay(new Date(filters.dateFrom)) : null;
    const to = filters.dateTo ? endOfDay(new Date(filters.dateTo)) : null;

    return logs.filter(log => {
      // Type filter
      if (filters.type !== 'all' && log.type !== filters.type) return false;
      // Search filter
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!(log.description || '').toLowerCase().includes(q)) return false;
      }
      // Date filter (client-side since Firestore query is broad)
      if (from || to) {
        const ts = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        if (from && ts < from) return false;
        if (to && ts > to) return false;
      }
      return true;
    });
  }, [logs, filters]);

  const visibleLogs = filteredLogs.slice(0, visibleCount);

  const getUser = (userId) => users.find(u => u.uid === userId || u.id === userId);

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return format(d, 'dd MMM yyyy, hh:mm a');
  };

  const inputStyle = { padding: '7px 12px', borderRadius: 8, border: '1px solid #D4D2D0', fontSize: 13, fontFamily: '"Noto Sans", sans-serif' };

  if (loading) return (
    <div style={{ display: 'grid', gap: 12 }}>
      {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 20, color: '#1A1A2E', margin: '0 0 4px' }}>
          Activity Log
        </h2>
        <p style={{ fontSize: 13, color: '#767676', margin: 0 }}>
          Track every action across the platform
        </p>
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '12px 20px',
        border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F3F2F1', padding: '6px 12px', borderRadius: 8, border: '1px solid #D4D2D0' }}>
          <Search size={14} color="#767676" />
          <input
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
            placeholder="Search logs..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: 180, color: '#1A1A2E' }}
          />
        </div>

        <select
          value={filters.type}
          onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
          style={inputStyle}
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <Calendar size={14} color="#767676" />
        <input type="date" value={filters.dateFrom} onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))} style={inputStyle} />
        <span style={{ color: '#999', fontSize: 12 }}>to</span>
        <input type="date" value={filters.dateTo} onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))} style={inputStyle} />

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#767676', fontWeight: 500 }}>
          {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Log List */}
      {filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Activity size={40} color="#D1D5DB" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: '#6B7280', margin: '0 0 4px', fontSize: 15 }}>
            No activity found
          </h3>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Try adjusting your filters or date range</p>
        </div>
      ) : (
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden',
        }}>
          {visibleLogs.map((log, i) => {
            const user = getUser(log.userId);
            const typeConfig = TYPE_ICONS[log.type] || { icon: Activity, color: '#6B7280', bg: '#F3F4F6' };
            const Icon = typeConfig.icon;
            const isLast = i === visibleLogs.length - 1;

            return (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 20px',
                borderBottom: isLast ? 'none' : '1px solid #F3F4F6',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                {/* Icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: typeConfig.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  marginTop: 2,
                }}>
                  <Icon size={16} color={typeConfig.color} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: typeConfig.bg, color: typeConfig.color,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {TYPE_LABELS[log.type] || log.type}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 13, color: '#1A1A2E', margin: '0 0 4px',
                    lineHeight: 1.5, wordBreak: 'break-word',
                  }}>
                    {log.description || 'No description'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#999' }}>
                    {user && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <InitialsAvatar name={user.name} size={16} />
                        {user.name}
                      </span>
                    )}
                    <span>·</span>
                    <span>{formatTimestamp(log.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load More */}
          {visibleCount < filteredLogs.length && (
            <div style={{ textAlign: 'center', padding: '14px 20px', borderTop: '1px solid #F3F4F6' }}>
              <button
                onClick={() => setVisibleCount(c => c + 50)}
                style={{
                  padding: '8px 24px', borderRadius: 8, border: '1px solid #D4D2D0',
                  background: '#fff', fontSize: 13, fontWeight: 600, color: '#0451CC',
                  cursor: 'pointer',
                }}
              >
                Load More ({filteredLogs.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
