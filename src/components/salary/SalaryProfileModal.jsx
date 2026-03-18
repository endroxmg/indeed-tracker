import { useState } from 'react';
import { db } from '../../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { X, Save, AlertCircle } from 'lucide-react';
import { useToast } from '../Toast';
import InitialsAvatar from '../InitialsAvatar';

export default function SalaryProfileModal({ users, profiles, onClose }) {
  const toast = useToast();
  const [editingUserId, setEditingUserId] = useState(null);
  const [editData, setEditData] = useState({ monthlySalary: '', effectiveFrom: '' });
  const [saving, setSaving] = useState(false);

  const handleEdit = (user, profile) => {
    setEditingUserId(user.id);
    setEditData({
      monthlySalary: profile.monthlySalary || '',
      effectiveFrom: profile.effectiveFrom || new Date().toISOString().split('T')[0]
    });
  };

  const handleSave = async (userId) => {
    setSaving(true);
    try {
      const salary = parseFloat(editData.monthlySalary);
      if (isNaN(salary) || salary <= 0) {
        toast.error('Please enter a valid salary amount');
        return;
      }

      const ref = doc(db, 'salaryProfiles', userId);
      await setDoc(ref, {
        userId,
        monthlySalary: salary,
        effectiveFrom: editData.effectiveFrom,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success('Salary profile updated');
      setEditingUserId(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update salary');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#fff', width: '100%', maxWidth: 640, borderRadius: 16,
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: '"Poppins"' }}>Salary Profiles</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#6B7280" />
          </button>
        </div>

        <div style={{ maxHeight: 500, overflowY: 'auto', padding: '12px 0' }}>
          {users.map(user => {
            const profile = profiles.find(p => p.userId === user.id) || {};
            const isEditing = editingUserId === user.id;

            return (
              <div key={user.id} style={{ 
                padding: '12px 24px', borderBottom: '1px solid #F3F4F6',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <InitialsAvatar name={user.name} size={32} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      {profile.monthlySalary ? `₹${profile.monthlySalary.toLocaleString()}` : 'No salary set'}
                    </div>
                  </div>
                </div>

                {isEditing ? (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 120 }}>
                      <input 
                        type="number"
                        placeholder="Amount (₹)"
                        value={editData.monthlySalary}
                        onChange={(e) => setEditData(p => ({ ...p, monthlySalary: e.target.value }))}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
                      />
                    </div>
                    <div style={{ width: 140 }}>
                      <input 
                        type="date"
                        value={editData.effectiveFrom}
                        onChange={(e) => setEditData(p => ({ ...p, effectiveFrom: e.target.value }))}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
                      />
                    </div>
                    <button 
                      onClick={() => handleSave(user.id)}
                      disabled={saving}
                      style={{ 
                        background: '#0451CC', color: '#fff', border: 'none', borderRadius: 8, 
                        padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6
                      }}
                    >
                      <Save size={14} /> Save
                    </button>
                    <button 
                      onClick={() => setEditingUserId(null)}
                      style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleEdit(user, profile)}
                    style={{ 
                      padding: '6px 16px', borderRadius: 8, border: '1px solid #D1D5DB', 
                      background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' 
                    }}
                  >
                    Edit Salary
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: '16px 24px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', gap: 10, color: '#D97706' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
              Setting an effective date in the past will affect previous months' calculations. 
              Be sure to recalculate if necessary.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
