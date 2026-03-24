import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useToast } from './Toast';

export default function LogTimeModal({ date, users = [], tickets = [], currentUserId, existingEntries = [], onClose, onSave }) {
  const toast = useToast();
  const targetUser = users.find((u) => u.uid === currentUserId);
  const isAdmin = targetUser?.roles?.includes('admin') || targetUser?.role === 'admin';

  const [rows, setRows] = useState(
    existingEntries.length > 0
      ? existingEntries.map((e) => ({
          id: e.id,
          ticketId: e.ticketId || '',
          hours: e.hours,
          category: e.category || 'ticket',
          notes: e.notes || '',
        }))
      : [{ id: null, ticketId: '', hours: '', category: 'ticket', notes: '' }]
  );
  const [userId, setUserId] = useState(currentUserId);

  const addRow = () => setRows((p) => [...p, { id: null, ticketId: '', hours: '', category: 'ticket', notes: '' }]);
  const removeRow = (idx) => setRows((p) => p.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => setRows((p) => p.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const totalHours = rows.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);

  const handleSave = () => {
    const valid = rows.filter((r) => r.hours && parseFloat(r.hours) > 0);
    if (valid.length === 0) {
      toast.error('Please add at least one time entry');
      return;
    }
    if (totalHours > 12) {
      toast.warning('Total hours exceed 12 for this day');
    }
    onSave(userId, valid);
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid var(--color-border)', fontSize: 14,
    background: 'var(--color-surface)', color: '#fff', outline: 'none', transition: 'border-color 0.2s'
  };

  const labelStyle = { fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'block', fontFamily: '"Poppins", sans-serif', color: 'var(--color-secondary-text)', textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-surface)', borderRadius: 24, width: 640,
        maxHeight: '85vh', overflow: 'auto', border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-modal)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: '24px 32px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 20, margin: 0, color: '#fff' }}>
            Log Time — <span style={{ color: 'var(--color-primary)' }}>{date}</span>
          </h2>
          <button onClick={onClose} style={{ background: 'var(--color-surface-hover)', border: 'none', cursor: 'pointer', display: 'flex', padding: 8, borderRadius: 10, transition: 'background 0.2s' }} className="hover:bg-[rgba(255,255,255,0.1)]">
            <X size={20} color="var(--color-secondary-text)" />
          </button>
        </div>

        <div style={{ padding: 32 }}>
          {isAdmin && (
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Designer</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} style={inputStyle} className="focus:border-[var(--color-primary)]">
                {users.filter((u) => u.isActive && (u.roles?.some(r => r !== 'pending') || u.role !== 'pending')).map((u) => (
                  <option key={u.uid} value={u.uid}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {rows.map((row, idx) => (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: '1fr 90px 130px 1fr 40px',
                gap: 12, alignItems: 'start',
              }}>
                {row.category === 'ticket' ? (
                  <select value={row.ticketId} onChange={(e) => updateRow(idx, 'ticketId', e.target.value)} style={inputStyle} className="focus:border-[var(--color-primary)]">
                    <option value="">Select ticket...</option>
                    {tickets.map((t) => (
                      <option key={t.id} value={t.id}>{t.jiraId} — {t.title}</option>
                    ))}
                  </select>
                ) : (
                  <input value={row.notes} onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                    placeholder="Description..." style={inputStyle} className="focus:border-[var(--color-primary)]" />
                )}

                <input type="number" min="0" max="24" step="0.5"
                  value={row.hours} onChange={(e) => updateRow(idx, 'hours', e.target.value)}
                  placeholder="Hrs" style={inputStyle} className="focus:border-[var(--color-primary)]" />

                <select value={row.category} onChange={(e) => updateRow(idx, 'category', e.target.value)} style={inputStyle} className="focus:border-[var(--color-primary)]">
                  <option value="ticket">Ticket</option>
                  <option value="meeting">Meeting</option>
                  <option value="admin">Admin</option>
                  <option value="training">Training</option>
                  <option value="other">Other</option>
                </select>

                <input value={row.notes} onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                  placeholder="Notes" style={{ ...inputStyle, display: row.category === 'ticket' ? 'block' : 'none' }} className="focus:border-[var(--color-primary)]" />
                {row.category !== 'ticket' && <div />}

                <button onClick={() => removeRow(idx)} style={{
                  background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', cursor: 'pointer', padding: 10,
                  borderRadius: 10, display: 'flex', marginTop: 2, alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                }}
                  className="hover:bg-[rgba(239,68,68,0.1)] hover:border-[#EF4444]"
                >
                  <Trash2 size={16} color="#EF4444" />
                </button>
              </div>
            ))}
          </div>

          <button onClick={addRow} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 10, border: '1px dashed var(--color-border)',
            background: 'var(--color-background)', fontSize: 14, fontWeight: 600, color: 'var(--color-primary)',
            cursor: 'pointer', marginTop: 16, width: '100%', justifyContent: 'center', transition: 'all 0.2s'
          }} className="hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-hover)]">
            <Plus size={16} /> Add Another Entry
          </button>

          {/* Total */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 32, padding: '16px 24px', background: 'var(--color-surface-hover)', borderRadius: 12, border: '1px solid var(--color-border)'
          }}>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: '"Poppins", sans-serif', color: 'var(--color-secondary-text)' }}>Total Logged Hours</span>
            <span style={{
              fontSize: 24, fontWeight: 800, fontFamily: '"Poppins", sans-serif',
              color: totalHours > 12 ? '#EF4444' : totalHours >= 8 ? '#10B981' : '#fff',
            }}>
              {totalHours}h
            </span>
          </div>

          {totalHours > 12 && (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239, 68, 68, 0.1)', padding: '10px 16px', borderRadius: 8 }}>
              ⚠ Total exceeds 12 hours for this day
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
            <button onClick={onClose} className="btn-secondary" style={{ padding: '12px 28px' }}>Cancel</button>
            <button onClick={handleSave} className="btn-primary" style={{ padding: '12px 28px' }}>Save Log</button>
          </div>
        </div>
      </div>
    </div>
  );
}
