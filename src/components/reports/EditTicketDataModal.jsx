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
    dailyLogs: ticket.dailyLogs || {}, // { 'YYYY-MM-DD': hours }
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
      dailyLogs: {
        ...prev.dailyLogs,
        [newLogDate]: parseFloat(newLogHours)
      }
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
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#fff', width: '100%', maxWidth: 500, borderRadius: 16,
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: '"Poppins"' }}>Edit MBR Data</h2>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Ticket: {ticket.jiraId}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#6B7280" />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>Total Time (hrs)</label>
              <input 
                type="number" step="0.1" value={formData.totalTime}
                onChange={e => setFormData({...formData, totalTime: e.target.value})}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>Work Time (hrs)</label>
              <input 
                type="number" step="0.1" value={formData.productionTime}
                onChange={e => setFormData({...formData, productionTime: e.target.value})}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>QA Time (hrs)</label>
              <input 
                type="number" step="0.1" value={formData.qaTime}
                onChange={e => setFormData({...formData, qaTime: e.target.value})}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>Status</label>
              <select 
                value={formData.billableStatus}
                onChange={e => setFormData({...formData, billableStatus: e.target.value})}
                style={inputStyle}
              >
                <option value="billable">Billable</option>
                <option value="non-billable">Non-Billable</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 24, padding: 16, border: '1px solid #E5E7EB', borderRadius: 12, background: '#F9FAFB' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase' }}>Daily Time Records Override</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} style={{ ...inputStyle, flex: 1.5 }} />
              <input type="number" step="0.1" placeholder="Hrs" value={newLogHours} onChange={e => setNewLogHours(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={addDailyLog} className="btn-secondary" style={{ padding: '8px 12px' }}>Add</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
              {Object.entries(formData.dailyLogs).length === 0 ? (
                <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center' }}>No daily overrides added</div>
              ) : (
                Object.entries(formData.dailyLogs).sort().map(([date, hrs]) => (
                  <div key={date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{date}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{hrs} hrs</span>
                      <button type="button" onClick={() => removeDailyLog(date)} style={{ border: 'none', background: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Remove</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {Object.keys(formData.dailyLogs).length > 0 && (
              <button 
                type="button" onClick={calculateTotalFromLogs}
                style={{ marginTop: 12, border: 'none', background: 'none', color: '#0451CC', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Sync Total Time with Daily Logs
              </button>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>Reason for Override</label>
            <textarea 
              value={formData.note}
              onChange={e => setFormData({...formData, note: e.target.value})}
              placeholder="Explain why this data is being manually adjusted..."
              style={{ ...inputStyle, height: 80, resize: 'none' }}
              required
            />
          </div>

          <div style={{ marginTop: 24, padding: 16, background: '#FFFBEB', borderRadius: 12, border: '1px solid #FEF3C7', display: 'flex', gap: 12 }}>
            <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
              <strong>Non-Destructive Edit:</strong> This change will only affect MBR reports. 
              The original ticket metadata and designer logs will remain unchanged for audit purposes.
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button 
              type="submit" disabled={saving}
              className="btn-primary" 
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save Override'}
            </button>
            <button 
              type="button" onClick={onClose}
              className="btn-secondary" style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #D4D2D0',
  fontSize: 14,
  background: '#fff',
  transition: 'border-color 0.2s',
  outline: 'none',
  boxSizing: 'border-box'
};
