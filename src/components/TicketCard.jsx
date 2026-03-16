import { TICKET_TYPE_COLORS, TYPE_LABELS, PRIORITY_COLORS, daysInCurrentStage, isOverdue } from '../utils/helpers';
import { ExternalLink, Clock, AlertCircle } from 'lucide-react';

export default function TicketCard({ ticket, users = [], onClick }) {
  const assignee = users.find((u) => u.uid === ticket.assigneeId);
  const overdue = isOverdue(ticket);
  const daysInStage = daysInCurrentStage(ticket.statusHistory);
  const typeColor = TICKET_TYPE_COLORS[ticket.type] || TICKET_TYPE_COLORS.other;
  const priorityColor = PRIORITY_COLORS[ticket.priority] || {};

  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        borderRadius: 10,
        padding: 16,
        border: overdue ? '1px solid #C91B1B' : '1px solid #D4D2D0',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        e.currentTarget.style.borderColor = '#2557A7';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        e.currentTarget.style.borderColor = overdue ? '#C91B1B' : '#D4D2D0';
      }}
    >
      {/* Top row: Jira ID + Type */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{
          fontWeight: 700, fontSize: 13, color: '#2557A7',
          fontFamily: '"Poppins", sans-serif',
        }}>
          {ticket.jiraId}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '2px 8px',
          borderRadius: 20, background: typeColor.bg, color: typeColor.text,
        }}>
          {TYPE_LABELS[ticket.type]}
        </span>
      </div>

      {/* Title */}
      <h4 style={{
        fontSize: 14, fontWeight: 600, color: '#1A1A2E',
        margin: '0 0 10px', lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {ticket.title}
      </h4>

      {/* Meta badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {ticket.priority && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px',
            borderRadius: 20, background: priorityColor.bg, color: priorityColor.text,
          }}>
            {ticket.priority}
          </span>
        )}
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '2px 8px',
          borderRadius: 20, background: '#F3F2F1', color: '#4B5563',
        }}>
          v{ticket.versions?.length || 1}
        </span>
        {daysInStage > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 500, padding: '2px 8px',
            borderRadius: 20, background: daysInStage > 3 ? '#FEE2E2' : '#F3F2F1',
            color: daysInStage > 3 ? '#C91B1B' : '#767676',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <Clock size={10} /> {daysInStage}d
          </span>
        )}
      </div>

      {/* Bottom row: Assignee + Frame.io */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {assignee ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img
              src={assignee.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignee.name)}&size=24&background=E8EDF7&color=2557A7`}
              alt=""
              style={{ width: 22, height: 22, borderRadius: '50%' }}
            />
            <span style={{ fontSize: 12, color: '#767676', fontWeight: 500 }}>{assignee.name}</span>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: '#999' }}>Unassigned</span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {ticket.frameioUrl && (
            <ExternalLink size={12} color="#2557A7" />
          )}
          {overdue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <AlertCircle size={12} color="#C91B1B" />
              <span style={{ fontSize: 10, color: '#C91B1B', fontWeight: 700 }}>OVERDUE</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
