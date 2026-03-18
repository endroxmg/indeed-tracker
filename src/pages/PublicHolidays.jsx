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
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Poppins' }}>Public Holidays — FY {currentFY}</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={24} /></button>
        </div>

        <div style={contentStyle}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button onClick={() => setShowAddModal(true)} style={addBtnStyle}>
              <Plus size={18} /> Add Holiday
            </button>
          </div>

          <div style={tableContainerStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
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
                    <tr key={h.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={tdStyle}>{format(d, 'dd MMM yyyy')}</td>
                      <td style={tdStyle}>
                        {format(d, 'EEEE')}
                        {isSun && <span style={{ marginLeft: 8, fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>(Sunday — already excluded)</span>}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{h.name}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button onClick={() => { setEditingHoliday(h); setDate(h.date); setName(h.name); setShowAddModal(true); }} style={iconBtnStyle}><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(h.id)} style={{ ...iconBtnStyle, color: '#DC2626' }}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={infoBoxStyle}>
            <div style={{ display: 'flex', gap: 12 }}>
              <CalIcon size={20} color="#92400E" />
              <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
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
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</h3>
              <button onClick={() => { setShowAddModal(false); setEditingHoliday(null); }} style={closeBtnStyle}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Holiday Name</label>
                <input type="text" placeholder="e.g. Diwali" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowAddModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSave} style={saveBtnStyle}>Save Holiday</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalStyle = { width: 800, background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden', height: '80vh', display: 'flex', flexDirection: 'column' };
const headerStyle = { padding: '24px 32px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const contentStyle = { padding: 32, flex: 1, overflowY: 'auto' };
const closeBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' };
const addBtnStyle = { background: '#0451CC', color: '#fff', padding: '10px 20px', borderRadius: 10, border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 };
const tableContainerStyle = { border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', marginBottom: 24 };
const thStyle = { padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6B7280' };
const tdStyle = { padding: '14px 20px', fontSize: 14 };
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 6 };
const infoBoxStyle = { background: '#FEF9C3', padding: 20, borderRadius: 16, border: '1px solid #FDE68A' };
const nestedOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const addModalStyle = { width: 440, background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' };
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, display: 'block' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14 };
const cancelBtnStyle = { background: '#fff', color: '#1A1A2E', padding: '10px 20px', borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer' };
const saveBtnStyle = { background: '#0451CC', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' };
