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

  const designers = users.filter((u) => (u.roles?.some(r => r !== 'pending') || u.role !== 'pending') && u.isActive);

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
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: '1px solid var(--color-border)', fontSize: 14,
    fontFamily: '"Noto Sans", sans-serif', color: '#fff',
    transition: 'all 0.2s ease', background: 'var(--color-background)',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 700,
    color: 'var(--color-secondary-text)', marginBottom: 8,
    fontFamily: '"Poppins", sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-surface)', borderRadius: 24, width: 560,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: 'var(--shadow-modal)', border: '1px solid var(--color-border)'
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '24px 32px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{
              fontFamily: '"Poppins", sans-serif', fontWeight: 700,
              fontSize: 20, color: '#fff', margin: '0 0 4px',
            }}>
              Create New Ticket
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-secondary-text)'}}>Configure task details and assignment.</p>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--color-surface-hover)', border: 'none', cursor: 'pointer',
            padding: 8, borderRadius: 10, display: 'flex', transition: 'all 0.2s'
          }} className="hover:bg-[rgba(255,255,255,0.1)]">
            <X size={20} color="var(--color-secondary-text)" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={labelStyle}>Jira Ticket ID *</label>
              <input style={inputStyle} placeholder="e.g. PROJ-123"
                value={form.jiraId} onChange={(e) => update('jiraId', e.target.value)} className="focus:border-[var(--color-primary)]" />
            </div>
            <div>
              <label style={labelStyle}>Ticket Type</label>
              <select style={inputStyle} value={form.type} onChange={(e) => update('type', e.target.value)} className="focus:border-[var(--color-primary)]">
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
            <input style={inputStyle} placeholder="Task title/headline"
              value={form.title} onChange={(e) => update('title', e.target.value)} className="focus:border-[var(--color-primary)]" />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
              placeholder="Storyboard / brief details..."
              value={form.description} onChange={(e) => update('description', e.target.value)} className="focus:border-[var(--color-primary)]" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={labelStyle}>LDAP Account</label>
              <select style={inputStyle} value={form.ldap} onChange={(e) => update('ldap', e.target.value)} className="focus:border-[var(--color-primary)]">
                <option value="">Select LDAP...</option>
                {LDAP_ACCOUNTS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Assign To</label>
              <select style={inputStyle} value={form.assigneeId} onChange={(e) => update('assigneeId', e.target.value)} className="focus:border-[var(--color-primary)]">
                <option value="">Select teammate...</option>
                {designers.map((u) => (
                  <option key={u.uid} value={u.uid}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={form.priority} onChange={(e) => update('priority', e.target.value)} className="focus:border-[var(--color-primary)]">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Frame.io Link</label>
              <input style={inputStyle} placeholder="https://app.frame.io/..."
                value={form.frameioLink} onChange={(e) => update('frameioLink', e.target.value)} className="focus:border-[var(--color-primary)]" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface-hover)', padding: '16px 20px', borderRadius: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 0, color: '#fff' }}>Figma Resource Available?</label>
            <button type="button" onClick={() => update('figmaAvailable', !form.figmaAvailable)}
              style={{
                width: 48, height: 26, borderRadius: 13, border: 'none',
                background: form.figmaAvailable ? 'var(--color-primary)' : 'var(--color-secondary-text)',
                cursor: 'pointer', position: 'relative', transition: 'background 0.3s ease',
              }}>
              <span style={{
                position: 'absolute', top: 3, left: form.figmaAvailable ? 25 : 3,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }} />
            </button>
          </div>

          <div style={{
            display: 'flex', gap: 12, justifyContent: 'flex-end',
            paddingTop: 16, borderTop: '1px solid var(--color-border)', marginTop: 8
          }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '12px 24px' }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '12px 24px' }}>
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
