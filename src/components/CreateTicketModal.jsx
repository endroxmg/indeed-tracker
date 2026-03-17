import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { useToast } from './Toast';
import { LDAP_ACCOUNTS } from '../utils/helpers';

export default function CreateTicketModal({ users = [], onClose, onSubmit }) {
  const toast = useToast();
  const [form, setForm] = useState({
    jiraId: '',
    title: '',
    type: 'video',
    description: '',
    assigneeId: '',
    priority: 'medium',
    frameioLink: '',
    figmaAvailable: false,
    ldap: '',
  });

  const designers = users.filter((u) => u.role !== 'pending' && u.isActive);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.jiraId.trim() || !form.title.trim()) {
      toast.error('Jira ID and Title are required');
      return;
    }
    onSubmit(form);
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid #D4D2D0', fontSize: 14,
    fontFamily: '"Noto Sans", sans-serif', color: '#1A1A2E',
    transition: 'all 0.2s ease',
  };

  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: '#1A1A2E', marginBottom: 6,
    fontFamily: '"Poppins", sans-serif',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, width: 560,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{
            fontFamily: '"Poppins", sans-serif', fontWeight: 600,
            fontSize: 18, color: '#2D2D2D', margin: 0,
          }}>
            Create New Ticket
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, borderRadius: 6, display: 'flex',
          }}>
            <X size={20} color="#6B7280" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Jira Ticket ID *</label>
              <input style={inputStyle} placeholder="e.g. PROJ-123"
                value={form.jiraId} onChange={(e) => update('jiraId', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Ticket Type</label>
              <select style={inputStyle} value={form.type} onChange={(e) => update('type', e.target.value)}>
                <option value="webinar">Webinar</option>
                <option value="video">Video</option>
                <option value="screengrabs">Screengrabs</option>
                <option value="motion_graphics">Motion Graphics</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} placeholder="Ticket title"
              value={form.title} onChange={(e) => update('title', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              placeholder="Storyboard / brief details..."
              value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>LDAP Account</label>
              <select style={inputStyle} value={form.ldap} onChange={(e) => update('ldap', e.target.value)}>
                <option value="">Select LDAP...</option>
                {LDAP_ACCOUNTS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Assign To <span style={{ fontWeight: 400, color: '#999', fontSize: 11 }}>(designer)</span></label>
              <select style={inputStyle} value={form.assigneeId} onChange={(e) => update('assigneeId', e.target.value)}>
                <option value="">Select designer...</option>
                {designers.map((u) => (
                  <option key={u.uid} value={u.uid}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={form.priority} onChange={(e) => update('priority', e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Frame.io Link</label>
            <input style={inputStyle} placeholder="https://app.frame.io/..."
              value={form.frameioLink} onChange={(e) => update('frameioLink', e.target.value)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Figma Available?</label>
            <button type="button" onClick={() => update('figmaAvailable', !form.figmaAvailable)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none',
                background: form.figmaAvailable ? '#0451CC' : '#E5E7EB',
                cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease',
              }}>
              <span style={{
                position: 'absolute', top: 2, left: form.figmaAvailable ? 22 : 2,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s ease',
              }} />
            </button>
          </div>

          <div style={{
            display: 'flex', gap: 12, justifyContent: 'flex-end',
            paddingTop: 8, borderTop: '1px solid #E5E7EB',
          }}>
            <button type="button" onClick={onClose} style={{
              padding: '10px 20px', borderRadius: 10,
              border: '1px solid #E5E7EB', background: '#fff',
              cursor: 'pointer', fontSize: 14, fontWeight: 500,
              color: '#6B7280',
            }}>
              Cancel
            </button>
            <button type="submit" style={{
              padding: '10px 24px', borderRadius: 10,
              border: 'none', background: '#0451CC', color: '#fff',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
              transition: 'background 0.2s ease',
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0340A0'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#0451CC'}
            >
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
