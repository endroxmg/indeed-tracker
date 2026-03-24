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
  ticket_created: { icon: Plus, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  ticket_moved: { icon: ArrowRight, color: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
  ticket_completed: { icon: CheckCircle2, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  ticket_deleted: { icon: Trash2, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
  ticket_updated: { icon: Edit3, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  user_approved: { icon: UserCheck, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  user_created: { icon: UserCheck, color: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
  user_invited: { icon: Send, color: '#2557A7', bg: 'rgba(37, 87, 167, 0.15)' },
  role_changed: { icon: GitBranch, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  time_logged: { icon: Clock, color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)' },
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

  const inputStyle = { padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 13, fontFamily: '"Noto Sans", sans-serif', background: 'var(--color-surface)', color: '#fff', outline: 'none' };

  if (loading) return (
    <div style={{ display: 'grid', gap: 16 }}>
      {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ height: 80, background: 'var(--color-surface)', borderRadius: 16 }} className="animate-pulse" />)}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 24, color: '#fff', margin: '0 0 8px' }}>
          Activity Log
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-secondary-text)', margin: 0, fontWeight: 500 }}>
          Track every action across the platform.
        </p>
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--color-surface)', borderRadius: 16, padding: '16px 24px',
        border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)',
        marginBottom: 28,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-background)', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border)', flex: 1, minWidth: 200 }}>
          <Search size={16} color="var(--color-secondary-text)" />
          <input
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
            placeholder="Search logs..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, width: '100%', color: '#fff' }}
          />
        </div>

        <select
          value={filters.type}
          onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
          style={{ ...inputStyle, minWidth: 160 }}
          className="focus:border-[var(--color-primary)] transition-colors"
        >
          <option value="all">All Event Types</option>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-surface-hover)', padding: '4px 12px', borderRadius: 10, border: '1px solid var(--color-border)' }}>
          <Calendar size={16} color="var(--color-secondary-text)" />
          <input type="date" value={filters.dateFrom} onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))} style={{ ...inputStyle, background: 'transparent', border: 'none', padding: '4px 0' }} />
          <span style={{ color: 'var(--color-secondary-text)', fontSize: 13, fontWeight: 600 }}>to</span>
          <input type="date" value={filters.dateTo} onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))} style={{ ...inputStyle, background: 'transparent', border: 'none', padding: '4px 0' }} />
        </div>

        <div style={{ flexShrink: 0, marginLeft: 'auto' }}>
          <span style={{ fontSize: 13, color: 'var(--color-secondary-text)', fontWeight: 600, background: 'var(--color-surface-hover)', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--color-border)' }}>
            <strong style={{ color: '#fff' }}>{filteredLogs.length}</strong> event{filteredLogs.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Log List */}
      {filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, background: 'var(--color-surface)', borderRadius: 24, border: '1px dashed var(--color-border)' }}>
          <div style={{ background: 'var(--color-surface-hover)', width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Activity size={32} color="var(--color-secondary-text)" />
          </div>
          <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, color: '#fff', margin: '0 0 8px', fontSize: 18 }}>
            No activity found
          </h3>
          <p style={{ fontSize: 14, color: 'var(--color-secondary-text)', margin: 0, fontWeight: 500 }}>Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div style={{
          background: 'var(--color-surface)', borderRadius: 20, border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)', overflow: 'hidden',
        }}>
          {visibleLogs.map((log, i) => {
            const user = getUser(log.userId);
            const typeConfig = TYPE_ICONS[log.type] || { icon: Activity, color: 'var(--color-secondary-text)', bg: 'var(--color-surface-hover)' };
            const Icon = typeConfig.icon;
            const isLast = i === visibleLogs.length - 1;

            return (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 16,
                padding: '20px 24px',
                borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                transition: 'background 0.2s',
              }}
                className="hover:bg-[var(--color-surface-hover)]"
              >
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 12, border: `1px solid ${typeConfig.color}40`,
                  background: typeConfig.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={18} color={typeConfig.color} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 6,
                      background: typeConfig.bg, color: typeConfig.color, border: `1px solid ${typeConfig.color}40`,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {TYPE_LABELS[log.type] || log.type}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-secondary-text)', fontWeight: 500, marginLeft: 'auto' }}>
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 14, color: '#fff', margin: '0 0 10px', fontWeight: 500,
                    lineHeight: 1.6, wordBreak: 'break-word',
                  }}>
                    {log.description || 'No description'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--color-secondary-text)', fontWeight: 600 }}>
                    {user && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-background)', padding: '2px 8px 2px 2px', borderRadius: 20, border: '1px solid var(--color-border)' }}>
                        <InitialsAvatar name={user.name} size={20} />
                        <span style={{ color: '#fff' }}>{user.name}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load More */}
          {visibleCount < filteredLogs.length && (
            <div style={{ textAlign: 'center', padding: '20px', borderTop: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
              <button
                onClick={() => setVisibleCount(c => c + 50)}
                style={{
                  padding: '10px 28px', borderRadius: 12, border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)', fontSize: 13, fontWeight: 700, color: '#fff',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                className="hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary)]"
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
