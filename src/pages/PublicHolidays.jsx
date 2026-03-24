import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, isSunday } from 'date-fns';
import { X, Plus, Trash2, Edit2, Calendar as CalIcon } from 'lucide-react';
import { getCurrentFinancialYear } from '../utils/helpers';

export default function PublicHolidays({ onClose }) {
  const { userDoc } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const currentFY = getCurrentFinancialYear();

  useEffect(() => {
    const q = query(collection(db, 'publicHolidays'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setHolidays(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const handleSave = async () => {
    if (!date || !name) return;
    try {
      if (editingHoliday) {
        await updateDoc(doc(db, 'publicHolidays', editingHoliday.id), {
          date, name, updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'publicHolidays'), {
          date, name, year: new Date(date).getFullYear(), 
          createdBy: userDoc.uid, createdAt: serverTimestamp()
        });
      }
      setShowAddModal(false);
      setEditingHoliday(null);
      setDate('');
      setName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      await deleteDoc(doc(db, 'publicHolidays', id));
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, fontFamily: '"Poppins"', color: '#fff' }}>Public Holidays — FY {currentFY}</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={24} /></button>
        </div>

        <div style={contentStyle}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
            <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}>
              <Plus size={18} /> Add Holiday
            </button>
          </div>

          <div style={tableContainerStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Day</th>
                  <th style={thStyle}>Holiday Name</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map(h => {
                  const d = new Date(h.date);
                  const isSun = isSunday(d);
                  return (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                      <td style={tdStyle}>{format(d, 'dd MMM yyyy')}</td>
                      <td style={tdStyle}>
                        {format(d, 'EEEE')}
                        {isSun && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-secondary-text)', fontStyle: 'italic' }}>(Sunday — already excluded)</span>}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#fff' }}>{h.name}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button onClick={() => { setEditingHoliday(h); setDate(h.date); setName(h.name); setShowAddModal(true); }} style={iconBtnStyle} className="hover:bg-[var(--color-surface-hover)]"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(h.id)} style={{ ...iconBtnStyle, color: '#EF4444' }} className="hover:bg-[rgba(239,68,68,0.1)]"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={infoBoxStyle}>
            <div style={{ display: 'flex', gap: 12 }}>
              <CalIcon size={20} color="#F59E0B" />
              <div style={{ fontSize: 13, color: '#F59E0B', lineHeight: 1.5 }}>
                Holidays apply to all users. Working on a holiday earns 1 comp-off day. 
                Holidays are shown in yellow on all calendars and excluded from MBR reports.
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div style={nestedOverlayStyle}>
          <div style={addModalStyle}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#fff', fontFamily: '"Poppins"', fontWeight: 700 }}>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</h3>
              <button onClick={() => { setShowAddModal(false); setEditingHoliday(null); }} style={closeBtnStyle}><X size={20} /></button>
            </div>
            <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} className="focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label style={labelStyle}>Holiday Name</label>
                <input type="text" placeholder="e.g. Diwali" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} className="focus:border-[var(--color-primary)]" />
              </div>
            </div>
            <div style={{ padding: '20px 28px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
              <button onClick={handleSave} className="btn-primary" style={{ padding: '10px 20px' }}>Save Holiday</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalStyle = { width: 800, background: 'var(--color-surface)', borderRadius: 24, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-modal)', overflow: 'hidden', height: '80vh', display: 'flex', flexDirection: 'column' };
const headerStyle = { padding: '24px 32px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const contentStyle = { padding: 32, flex: 1, overflowY: 'auto' };
const closeBtnStyle = { background: 'var(--color-surface-hover)', border: 'none', cursor: 'pointer', color: 'var(--color-secondary-text)', padding: 8, borderRadius: 10, display: 'flex' };
const tableContainerStyle = { border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', marginBottom: 24 };
const thStyle = { padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-text)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '16px 24px', fontSize: 14, color: 'var(--color-secondary-text)' };
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-secondary-text)', padding: 8, borderRadius: 8, transition: 'all 0.2s' };
const infoBoxStyle = { background: 'rgba(245, 158, 11, 0.1)', padding: 20, borderRadius: 16, border: '1px solid rgba(245, 158, 11, 0.3)' };
const nestedOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const addModalStyle = { width: 440, background: 'var(--color-surface)', borderRadius: 20, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-modal)' };
const labelStyle = { fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-text)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 14, background: 'var(--color-background)', color: '#fff', outline: 'none', transition: 'border-color 0.2s' };
