import { TYPE_LABELS, PRIORITY_COLORS, daysInCurrentStage, isOverdue } from '../utils/helpers';
import { Clock, AlertTriangle } from 'lucide-react';
import InitialsAvatar from './InitialsAvatar';

export default function TicketCard({ ticket, users = [], onClick }) {
  const assignee = users.find((u) => u.uid === ticket.assigneeId);
  const overdue = isOverdue(ticket);
  const daysInStage = daysInCurrentStage(ticket.statusHistory);
  const priorityColor = PRIORITY_COLORS[ticket.priority] || {};

  // Priority accent bar color
  const accentColor = ticket.priority === 'high' ? '#C91B1B'
    : ticket.priority === 'medium' ? '#D97706' : '#2557A7';

  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        borderRadius: 10,
        border: overdue ? '1px solid #FCA5A5' : '1px solid #E8E8E8',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Priority accent bar */}
      <div style={{ height: 3, background: accentColor }} />

      <div style={{ padding: '12px 14px' }}>
        {/* Row 1: Jira ID + Type */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{
            fontWeight: 700, fontSize: 12, color: '#2557A7',
            fontFamily: '"Poppins", sans-serif', letterSpacing: '0.01em',
          }}>
            {ticket.jiraId}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 7px',
            borderRadius: 4, background: '#F3F2F1', color: '#767676',
            textTransform: 'uppercase', letterSpacing: '0.03em',
          }}>
            {TYPE_LABELS[ticket.type]}
          </span>
        </div>

        {/* Title — max 2 lines */}
        <h4 style={{
          fontSize: 13, fontWeight: 600, color: '#1A1A2E',
          margin: '0 0 10px', lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {ticket.title}
        </h4>

        {/* Bottom: LDAP / assignee + meta */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {ticket.ldap ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                background: '#F0FDF4', color: '#166534', fontFamily: 'monospace',
              }}>
                {ticket.ldap}
              </span>
              {assignee && (
                <span style={{ fontSize: 10, color: '#999' }}>· {assignee.name.split(' ')[0]}</span>
              )}
            </div>
          ) : assignee ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <InitialsAvatar name={assignee.name} size={20} />
              <span style={{ fontSize: 11, color: '#767676', fontWeight: 500 }}>{assignee.name.split(' ')[0]}</span>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: '#C4C4C4', fontStyle: 'italic' }}>Unassigned</span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {daysInStage > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '1px 6px',
                borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2,
                background: daysInStage > 3 ? '#FEF2F2' : '#F9F9F9',
                color: daysInStage > 3 ? '#B91C1C' : '#999',
              }}>
                <Clock size={9} /> {daysInStage}d
              </span>
            )}
            {overdue && <AlertTriangle size={13} color="#C91B1B" />}
          </div>
        </div>
      </div>
    </div>
  );
}
