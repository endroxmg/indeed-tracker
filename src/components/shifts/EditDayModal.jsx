import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { 
  X, Clock, Umbrella, AlertTriangle, 
  Calendar, CheckCircle, Info 
} from 'lucide-react';
import { 
  calculateShiftEnd, toDateString, getCurrentFinancialYear,
  ATTENDANCE_STATUS_LABELS, formatShiftTime
} from '../../utils/helpers';
import { startOfWeek } from 'date-fns';

export default function EditDayModal({ user, date, onClose }) {
  const { userDoc: currentUser, publicHolidays } = useAuth();
  const [loading, setLoading] = useState(false);
  const [shiftStart, setShiftStart] = useState('08:00');
  const [status, setStatus] = useState('working');
  const [earlyLeaveMinutes, setEarlyLeaveMinutes] = useState(0);
  const [leaveType, setLeaveType] = useState('normal');
  const [notes, setNotes] = useState('');
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [hasSundayShift, setHasSundayShift] = useState(false);

  const dateStr = toDateString(date);
  const currentFY = getCurrentFinancialYear();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const attRef = doc(db, 'attendance', `${user.id}_${dateStr}`);
      const shiftRef = doc(db, 'shifts', `${user.id}_${dateStr}`);
      const balanceRef = doc(db, 'leaveBalances', `${user.id}_${currentFY}`);

      const [attSnap, shiftSnap, balanceSnap] = await Promise.all([
        getDoc(attRef), getDoc(shiftRef), getDoc(balanceRef)
      ]);

      if (attSnap.exists()) {
        const data = attSnap.data();
        setStatus(data.status);
        setEarlyLeaveMinutes(data.earlyLeaveMinutes || 0);
        setLeaveType(data.leaveType || 'normal');
        setNotes(data.notes || '');
      }

      if (shiftSnap.exists()) {
        setShiftStart(shiftSnap.data().shiftStart);
      }

      if (balanceSnap.exists()) {
        setLeaveBalance(balanceSnap.data());
      }

      // Check for Sunday shift in the current week
      const sundayDate = startOfWeek(date, { weekStartsOn: 0 });
      const sundayStr = toDateString(sundayDate);
      const sunShiftRef = doc(db, 'shifts', `${user.id}_${sundayStr}`);
      const sunShiftSnap = await getDoc(sunShiftRef);
      setHasSundayShift(sunShiftSnap.exists());

      setLoading(false);
    };

    fetchData();
  }, [user, dateStr]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const shiftEnd = calculateShiftEnd(shiftStart);
      const attId = `${user.id}_${dateStr}`;
      const shiftId = `${user.id}_${dateStr}`;
      const fy = getCurrentFinancialYear();

      // Update Attendance
      await setDoc(doc(db, 'attendance', attId), {
        userId: user.id,
        date: dateStr,
        status,
        shiftStart,
        shiftEnd,
        earlyLeaveMinutes: status === 'early_leave' ? Number(earlyLeaveMinutes) : 0,
        leaveType: (status === 'leave' || status === 'comp_off') ? leaveType : null,
        notes,
        markedBy: currentUser.uid,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });

      // Update Shift
      if (status === 'working' || status === 'half_day' || status === 'early_leave') {
        await setDoc(doc(db, 'shifts', shiftId), {
          userId: user.id,
          date: dateStr,
          shiftStart,
          shiftEnd,
          setBy: currentUser.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      // Business Logic for Leave Balances
      const balanceRef = doc(db, 'leaveBalances', `${user.id}_${fy}`);
      if (status === 'leave') {
        if (leaveType === 'normal') {
          await updateDoc(balanceRef, { 
            normalLeaveBalance: increment(-1),
            normalLeaveTaken: increment(1)
          });
        } else if (leaveType === 'sick') {
          await updateDoc(balanceRef, { 
            sickLeaveTaken: increment(1)
          });
        } else if (leaveType === 'festival') {
          await updateDoc(balanceRef, { 
            festivalLeaveUsed: true
          });
        }
      } else if (status === 'half_day') {
        await updateDoc(balanceRef, { 
          halfDaysTaken: increment(1)
        });
      } else if (status === 'early_leave') {
        const newTotalMins = (leaveBalance?.earlyLeaveMinutesTotal || 0) + Number(earlyLeaveMinutes);
        if (newTotalMins >= 240) {
          await updateDoc(balanceRef, {
            earlyLeaveMinutesTotal: newTotalMins - 240,
            earlyLeaveHalfDaysTriggered: increment(1),
            halfDaysTaken: increment(1)
          });
          // Show alert in real app (toast)
        } else {
          await updateDoc(balanceRef, {
            earlyLeaveMinutesTotal: newTotalMins
          });
        }
      }

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: '"Poppins"', color: '#fff' }}>{user.name}</span>
            <span style={{ fontSize: 13, color: 'var(--color-secondary-text)' }}>{format(date, 'EEEE, dd MMM yyyy')}</span>
          </div>
          <div style={{ fontSize: 11, background: 'var(--color-background)', padding: '6px 14px', borderRadius: 20, color: 'var(--color-primary)', fontWeight: 700, border: '1px solid rgba(37, 87, 167, 0.3)' }}>
            12-Hour Format Active
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        <div style={contentStyle}>
          {/* Shift Timing */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}><Clock size={16} color="var(--color-primary)" /> Shift Timing</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={labelStyle}>Shift Start</label>
                  <input 
                    type="time" 
                    value={shiftStart} 
                    onChange={(e) => setShiftStart(e.target.value)}
                    style={inputStyle} className="focus:border-[var(--color-primary)] outline-none"
                  />
                  <div style={{ fontSize: 11, color: 'var(--color-primary)', marginTop: 8, fontWeight: 600 }}>
                    Starts at {formatShiftTime(shiftStart)}
                  </div>
                </div>
              <div>
                <label style={labelStyle}>Shift End (9hrs)</label>
                <div style={{ ...inputStyle, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  {formatShiftTime(calculateShiftEnd(shiftStart))}
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Status */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}><CheckCircle size={16} color="var(--color-primary)" /> Attendance Status</div>
            <div style={radioGridStyle}>
              {['working', 'half_day', 'early_leave', 'leave', 'comp_off', 'week_off'].map(s => {
                const isDisabled = s === 'week_off' && !hasSundayShift;
                return (
                  <label key={s} style={{ 
                    ...radioLabelStyle, 
                    borderColor: status === s ? 'var(--color-primary)' : 'var(--color-border)',
                    background: status === s ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    color: status === s ? '#fff' : 'var(--color-secondary-text)',
                    opacity: isDisabled ? 0.4 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer'
                  }} title={isDisabled ? 'Sunday shift required for Week-off' : ''} className={!isDisabled && status !== s ? 'hover:bg-[var(--color-surface-hover)]' : ''}>
                    <input 
                      type="radio" 
                      name="status" 
                      value={s} 
                      checked={status === s} 
                      disabled={isDisabled}
                      onChange={(e) => setStatus(e.target.value)}
                      style={{ position: 'absolute', opacity: 0 }}
                    />
                    {ATTENDANCE_STATUS_LABELS[s]}
                    {isDisabled && <AlertTriangle size={12} style={{ marginTop: 4, color: '#EF4444' }} />}
                  </label>
                );
              })}
            </div>

            {!hasSundayShift && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#EF4444', fontSize: 11, fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: 8 }}>
                <Info size={14} />
                <span>Week-off is disabled (No Sunday shift scheduled for this week)</span>
              </div>
            )}

            {status === 'early_leave' && (
              <div style={{ marginTop: 20, padding: '16px', background: 'var(--color-surface-hover)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <div style={labelStyle}>Minutes Early (1–60)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <input 
                    type="range" min="1" max="60" 
                    value={earlyLeaveMinutes} 
                    onChange={(e) => setEarlyLeaveMinutes(e.target.value)}
                    style={{ flex: 1, accentColor: 'var(--color-primary)' }}
                  />
                  <span style={{ fontWeight: 700, color: '#fff' }}>{earlyLeaveMinutes} mins</span>
                </div>
                <div style={{ fontSize: 12, color: '#F59E0B', marginTop: 8, fontWeight: 500 }}>
                  Current Total: {leaveBalance?.earlyLeaveMinutesTotal || 0} mins ({240 - (leaveBalance?.earlyLeaveMinutesTotal || 0)} until next deduction)
                </div>
              </div>
            )}

            {status === 'leave' && (
              <div style={{ marginTop: 20 }}>
                <label style={labelStyle}>Leave Type</label>
                <div style={radioGridStyle}>
                  {[
                    { id: 'normal', label: 'Normal Leave', bal: leaveBalance?.normalLeaveBalance },
                    { id: 'sick', label: 'Sick Leave', bal: 6 - (leaveBalance?.sickLeaveTaken || 0) },
                    { id: 'festival', label: 'Festival', used: leaveBalance?.festivalLeaveUsed }
                  ].map(l => (
                    <label key={l.id} style={{ 
                      ...radioLabelStyle, 
                      borderColor: leaveType === l.id ? 'var(--color-primary)' : 'var(--color-border)',
                      background: leaveType === l.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      color: leaveType === l.id ? '#fff' : 'var(--color-secondary-text)',
                      opacity: (l.id === 'sick' && l.bal <= 0) || (l.id === 'festival' && l.used) ? 0.3 : 1
                    }}>
                      <input 
                        type="radio" name="leaveType" value={l.id}
                        disabled={(l.id === 'sick' && l.bal <= 0) || (l.id === 'festival' && l.used)}
                        checked={leaveType === l.id}
                        onChange={(e) => setLeaveType(e.target.value)}
                        style={{ position: 'absolute', opacity: 0 }}
                      />
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{l.label}</div>
                      <div style={{ fontSize: 10, color: 'inherit', opacity: 0.8, marginTop: 4 }}>
                        {l.id === 'festival' ? (l.used ? 'Used' : 'Available') : `${l.bal} left`}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Notes (optional)</div>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any specific details..."
              style={{ ...inputStyle, minHeight: 100, resize: 'none' }} className="focus:border-[var(--color-primary)] outline-none"
            />
          </div>
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '12px 24px' }}>Cancel</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary" style={{ padding: '12px 24px' }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalStyle = { width: 560, background: 'var(--color-surface)', borderRadius: 24, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' };
const headerStyle = { padding: '24px 32px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const sectionStyle = { marginBottom: 32 };
const sectionTitleStyle = { fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, textTransform: 'uppercase', letterSpacing: '0.05em' };
const contentStyle = { padding: '32px', maxHeight: '70vh', overflowY: 'auto' };
const labelStyle = { fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-text)', marginBottom: 10, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = { width: '100%', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: '#fff', fontSize: 14, fontFamily: 'inherit', transition: 'border-color 0.2s' };
const radioGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 };
const radioLabelStyle = { padding: '14px 10px', borderRadius: 12, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', fontSize: 13, fontWeight: 600 };
const footerStyle = { padding: '20px 32px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 16, background: 'rgba(0,0,0,0.2)' };
const closeBtnStyle = { background: 'var(--color-surface-hover)', border: 'none', cursor: 'pointer', color: 'var(--color-secondary-text)', padding: 8, borderRadius: 10, display: 'flex' };
