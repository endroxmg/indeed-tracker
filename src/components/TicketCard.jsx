import { TYPE_LABELS, PRIORITY_COLORS, daysInCurrentStage, isOverdue } from '../utils/helpers';
import { Clock, AlertTriangle } from 'lucide-react';
import InitialsAvatar from './InitialsAvatar';

export default function TicketCard({ ticket, users = [], onClick }) {
  const assignee = users.find((u) => u.uid === ticket.assigneeId);
  const overdue = isOverdue(ticket);
  const daysInStage = daysInCurrentStage(ticket.statusHistory);
  
  // Custom dark theme accent colors
  const accentColor = ticket.priority === 'high' ? '#EF4444'
    : ticket.priority === 'medium' ? '#F59E0B' : 'var(--color-primary)';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface-hover)',
        borderRadius: 12,
        border: overdue ? '1px solid #EF4444' : '1px solid var(--color-border)',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = accentColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = overdue ? '#EF4444' : 'var(--color-border)';
      }}
    >
      {/* Sleek edge accent bar instead of top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: accentColor }} />

      <div style={{ padding: '16px 16px 16px 20px' }}>
        {/* Row 1: Jira ID + Type */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{
            fontWeight: 700, fontSize: 13, color: 'var(--color-primary)',
            fontFamily: '"Poppins", sans-serif', letterSpacing: '0.02em',
          }}>
            {ticket.jiraId}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px',
            borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'var(--color-secondary-text)',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {TYPE_LABELS[ticket.type]}
          </span>
        </div>

        {/* Title — max 2 lines */}
        <h4 style={{
          fontSize: 14, fontWeight: 500, color: '#fff',
          margin: '0 0 16px', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {ticket.title}
        </h4>

        {/* Bottom: LDAP / assignee + meta */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {assignee ? (
              <InitialsAvatar name={assignee.name} size={24} bg="var(--color-surface)" color="#fff" />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#777' }}>?</span>
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, color: 'var(--color-secondary-text)', fontWeight: 500 }}>
                {assignee ? assignee.name.split(' ')[0] : 'Unassigned'}
              </span>
              {ticket.ldap && (
                <span style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 600, fontFamily: 'monospace' }}>
                  {ticket.ldap}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {daysInStage > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px',
                borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4,
                background: daysInStage > 3 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                color: daysInStage > 3 ? '#EF4444' : 'var(--color-secondary-text)',
                border: `1px solid ${daysInStage > 3 ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-border)'}`
              }}>
                <Clock size={12} /> {daysInStage}d
              </span>
            )}
            {overdue && <AlertTriangle size={16} color="#EF4444" />}
          </div>
        </div>
      </div>
    </div>
  );
}
