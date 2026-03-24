import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { X, Save, AlertCircle, History, Info } from 'lucide-react';
import { useToast } from '../Toast';
import { useAuth } from '../../contexts/AuthContext';

export default function EditTicketDataModal({ ticket, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({
    totalTime: ticket.totalTime || 0,
    productionTime: ticket.productionTime || 0,
    qaTime: ticket.qaTime || 0,
    feedbackTime: ticket.feedbackTime || 0,
    billableStatus: ticket.billableStatus || 'billable',
    turnaroundTime: ticket.turnaroundTime || 0,
    dailyLogs: ticket.dailyLogs || {},
    note: ''
  });
  const [newLogDate, setNewLogDate] = useState('');
  const [newLogHours, setNewLogHours] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExistingOverride, setHasExistingOverride] = useState(false);

  useEffect(() => {
    const fetchOverride = async () => {
      setLoading(true);
      const docRef = doc(db, 'mbrOverrides', ticket.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setFormData(prev => ({
          ...prev,
          ...data.fields,
          dailyLogs: data.fields.dailyLogs || {},
          note: data.metadata?.reason || ''
        }));
        setHasExistingOverride(true);
      }
      setLoading(false);
    };
    fetchOverride();
  }, [ticket.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const overrideRef = doc(db, 'mbrOverrides', ticket.id);
      const payload = {
        ticketId: ticket.id,
        jiraId: ticket.jiraId,
        fields: {
          totalTime: parseFloat(formData.totalTime) || 0,
          productionTime: parseFloat(formData.productionTime) || 0,
          qaTime: parseFloat(formData.qaTime) || 0,
          feedbackTime: parseFloat(formData.feedbackTime) || 0,
          billableStatus: formData.billableStatus,
          turnaroundTime: parseFloat(formData.turnaroundTime) || 0,
          dailyLogs: formData.dailyLogs
        },
        metadata: {
          overriddenBy: user.uid,
          overriddenAt: new Date().toISOString(),
          reason: formData.note,
          originalValues: {
            totalTime: ticket.totalTime || 0,
            productionTime: ticket.productionTime || 0,
            qaTime: ticket.qaTime || 0,
          }
        },
        updatedAt: serverTimestamp()
      };
      await setDoc(overrideRef, payload);
      toast.success('MBR data override saved');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save override');
    } finally {
      setSaving(false);
    }
  };

  const addDailyLog = () => {
    if (!newLogDate || !newLogHours) return;
    setFormData(prev => ({
      ...prev,
      dailyLogs: { ...prev.dailyLogs, [newLogDate]: parseFloat(newLogHours) }
    }));
    setNewLogDate('');
    setNewLogHours('');
  };

  const removeDailyLog = (date) => {
    setFormData(prev => {
      const newLogs = { ...prev.dailyLogs };
      delete newLogs[date];
      return { ...prev, dailyLogs: newLogs };
    });
  };

  const calculateTotalFromLogs = () => {
    const total = Object.values(formData.dailyLogs).reduce((s, h) => s + h, 0);
    setFormData(prev => ({ ...prev, totalTime: total }));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    }}>
      <div style={{
        background: 'var(--color-surface)', width: '100%', maxWidth: 520, borderRadius: 24,
        border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-modal)', overflow: 'hidden'
      }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: '"Poppins"', color: '#fff' }}>Edit MBR Data</h2>
            <div style={{ fontSize: 12, color: 'var(--color-secondary-text)', marginTop: 4 }}>Ticket: <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{ticket.jiraId}</span></div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--color-surface-hover)', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 10, display: 'flex' }}>
            <X size={20} color="var(--color-secondary-text)" />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: '28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { label: 'Total Time (hrs)', key: 'totalTime' },
              { label: 'Work Time (hrs)', key: 'productionTime' },
              { label: 'QA Time (hrs)', key: 'qaTime' },
            ].map(field => (
              <div key={field.key}>
                <label style={labelStyle}>{field.label}</label>
                <input type="number" step="0.1" value={formData[field.key]}
                  onChange={e => setFormData({...formData, [field.key]: e.target.value})}
                  style={inputStyle} className="focus:border-[var(--color-primary)]" />
              </div>
            ))}
            <div>
              <label style={labelStyle}>Status</label>
              <select value={formData.billableStatus}
                onChange={e => setFormData({...formData, billableStatus: e.target.value})}
                style={inputStyle} className="focus:border-[var(--color-primary)]">
                <option value="billable">Billable</option>
                <option value="non-billable">Non-Billable</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 28, padding: 20, border: '1px solid var(--color-border)', borderRadius: 16, background: 'var(--color-surface-hover)' }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-secondary-text)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Time Records Override</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} style={{ ...inputStyle, flex: 1.5 }} className="focus:border-[var(--color-primary)]" />
              <input type="number" step="0.1" placeholder="Hrs" value={newLogHours} onChange={e => setNewLogHours(e.target.value)} style={{ ...inputStyle, flex: 1 }} className="focus:border-[var(--color-primary)]" />
              <button type="button" onClick={addDailyLog} className="btn-secondary" style={{ padding: '10px 16px' }}>Add</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 120, overflowY: 'auto' }}>
              {Object.entries(formData.dailyLogs).length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--color-secondary-text)', fontStyle: 'italic', textAlign: 'center', padding: 12 }}>No daily overrides added</div>
              ) : (
                Object.entries(formData.dailyLogs).sort().map(([date, hrs]) => (
                  <div key={date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-background)', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{date}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13, color: 'var(--color-secondary-text)' }}>{hrs} hrs</span>
                      <button type="button" onClick={() => removeDailyLog(date)} style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Remove</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {Object.keys(formData.dailyLogs).length > 0 && (
              <button type="button" onClick={calculateTotalFromLogs}
                style={{ marginTop: 12, border: 'none', background: 'none', color: 'var(--color-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                Sync Total Time with Daily Logs
              </button>
            )}
          </div>

          <div style={{ marginTop: 24 }}>
            <label style={labelStyle}>Reason for Override</label>
            <textarea value={formData.note}
              onChange={e => setFormData({...formData, note: e.target.value})}
              placeholder="Explain why this data is being manually adjusted..."
              style={{ ...inputStyle, height: 80, resize: 'none' }} required className="focus:border-[var(--color-primary)]" />
          </div>

          <div style={{ marginTop: 24, padding: 16, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', gap: 12 }}>
            <AlertCircle size={20} color="#F59E0B" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: '#F59E0B', lineHeight: 1.5 }}>
              <strong>Non-Destructive Edit:</strong> This change will only affect MBR reports. 
              The original ticket metadata and designer logs will remain unchanged for audit purposes.
            </div>
          </div>

          <div style={{ marginTop: 28, display: 'flex', gap: 16 }}>
            <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Override'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-text)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1px solid var(--color-border)', fontSize: 14,
  background: 'var(--color-background)', color: '#fff',
  transition: 'border-color 0.2s', outline: 'none', boxSizing: 'border-box'
};
