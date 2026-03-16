import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useToast } from './Toast';

export default function LogTimeModal({ date, users = [], tickets = [], currentUserId, existingEntries = [], onClose, onSave }) {
  const toast = useToast();
  const isAdmin = users.find((u) => u.uid === currentUserId)?.role === 'admin';

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
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid #E5E7EB', fontSize: 13,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, width: 600,
        maxHeight: '85vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 17, margin: 0 }}>
            Log Time — {date}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={20} color="#6B7280" />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {isAdmin && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', fontFamily: '"Poppins", sans-serif' }}>Designer</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} style={inputStyle}>
                {users.filter((u) => u.isActive && u.role !== 'pending').map((u) => (
                  <option key={u.uid} value={u.uid}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((row, idx) => (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 110px 1fr 32px',
                gap: 8, alignItems: 'start',
              }}>
                {row.category === 'ticket' ? (
                  <select value={row.ticketId} onChange={(e) => updateRow(idx, 'ticketId', e.target.value)} style={inputStyle}>
                    <option value="">Select ticket...</option>
                    {tickets.map((t) => (
                      <option key={t.id} value={t.id}>{t.jiraId} — {t.title}</option>
                    ))}
                  </select>
                ) : (
                  <input value={row.notes} onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                    placeholder="Description..." style={inputStyle} />
                )}

                <input type="number" min="0" max="24" step="0.5"
                  value={row.hours} onChange={(e) => updateRow(idx, 'hours', e.target.value)}
                  placeholder="Hrs" style={inputStyle} />

                <select value={row.category} onChange={(e) => updateRow(idx, 'category', e.target.value)} style={inputStyle}>
                  <option value="ticket">Ticket</option>
                  <option value="meeting">Meeting</option>
                  <option value="admin">Admin</option>
                  <option value="training">Training</option>
                  <option value="other">Other</option>
                </select>

                <input value={row.notes} onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                  placeholder="Notes" style={{ ...inputStyle, display: row.category === 'ticket' ? 'block' : 'none' }} />
                {row.category !== 'ticket' && <div />}

                <button onClick={() => removeRow(idx)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                  borderRadius: 6, display: 'flex', marginTop: 2,
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <Trash2 size={14} color="#DC2626" />
                </button>
              </div>
            ))}
          </div>

          <button onClick={addRow} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '8px 14px', borderRadius: 8, border: '1px dashed #E5E7EB',
            background: 'transparent', fontSize: 13, color: '#6B7280',
            cursor: 'pointer', marginTop: 12, width: '100%', justifyContent: 'center',
          }}>
            <Plus size={14} /> Add Entry
          </button>

          {/* Total */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 20, padding: '12px 16px', background: '#F9FAFB', borderRadius: 10,
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, fontFamily: '"Poppins", sans-serif' }}>Total Hours</span>
            <span style={{
              fontSize: 20, fontWeight: 700, fontFamily: '"Poppins", sans-serif',
              color: totalHours > 12 ? '#DC2626' : totalHours >= 8 ? '#0451CC' : '#2D2D2D',
            }}>
              {totalHours}h
            </span>
          </div>

          {totalHours > 12 && (
            <p style={{ fontSize: 12, color: '#DC2626', marginTop: 8 }}>⚠ Total exceeds 12 hours for this day</p>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: 10, border: '1px solid #E5E7EB',
              background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#6B7280',
            }}>Cancel</button>
            <button onClick={handleSave} style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: '#0451CC', color: '#fff', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, transition: 'background 0.2s ease',
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0340A0'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#0451CC'}
            >Save Time</button>
          </div>
        </div>
      </div>
    </div>
  );
}
