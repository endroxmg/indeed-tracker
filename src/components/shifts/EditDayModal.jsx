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
            <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Poppins' }}>{user.name}</span>
            <span style={{ fontSize: 13, color: '#6B7280' }}>{format(date, 'EEEE, dd MMM yyyy')}</span>
          </div>
          <div style={{ fontSize: 12, background: '#F3F4F6', padding: '4px 12px', borderRadius: 20, color: '#4B5563', fontWeight: 600 }}>
            12-Hour Format Active
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        <div style={contentStyle}>
          {/* Shift Timing */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}><Clock size={16} /> Shift Timing</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Shift Start</label>
                  <input 
                    type="time" 
                    value={shiftStart} 
                    onChange={(e) => setShiftStart(e.target.value)}
                    style={inputStyle}
                  />
                  <div style={{ fontSize: 11, color: '#0451CC', marginTop: 4, fontWeight: 500 }}>
                    Starts at {formatShiftTime(shiftStart)}
                  </div>
                </div>
              <div>
                <label style={labelStyle}>Shift End (9hrs)</label>
                <div style={{ ...inputStyle, background: '#F0FDF4', color: '#16A34A', fontWeight: 700 }}>
                  {formatShiftTime(calculateShiftEnd(shiftStart))}
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Status */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}><CheckCircle size={16} /> Attendance Status</div>
            <div style={radioGridStyle}>
              {['working', 'half_day', 'early_leave', 'leave', 'comp_off', 'week_off'].map(s => {
                const isDisabled = s === 'week_off' && !hasSundayShift;
                return (
                  <label key={s} style={{ 
                    ...radioLabelStyle, 
                    borderColor: status === s ? '#0451CC' : '#E5E7EB',
                    background: status === s ? '#EAF0FD' : '#fff',
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer'
                  }} title={isDisabled ? 'Sunday shift required for Week-off' : ''}>
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
                    {isDisabled && <AlertTriangle size={10} style={{ marginTop: 2, color: '#DC2626' }} />}
                  </label>
                );
              })}
            </div>

            {!hasSundayShift && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: '#C91B1B', fontSize: 11, fontWeight: 500 }}>
                <Info size={14} />
                <span>Week-off is disabled (No Sunday shift scheduled for this week)</span>
              </div>
            )}

            {status === 'early_leave' && (
              <div style={{ marginTop: 16, padding: '12px', background: '#FFF7ED', borderRadius: 8 }}>
                <div style={labelStyle}>Minutes Early (1–60)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input 
                    type="range" min="1" max="60" 
                    value={earlyLeaveMinutes} 
                    onChange={(e) => setEarlyLeaveMinutes(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontWeight: 600 }}>{earlyLeaveMinutes} mins</span>
                </div>
                <div style={{ fontSize: 11, color: '#C2410C', marginTop: 4 }}>
                  Current Total: {leaveBalance?.earlyLeaveMinutesTotal || 0} mins ({240 - (leaveBalance?.earlyLeaveMinutesTotal || 0)} until next deduction)
                </div>
              </div>
            )}

            {status === 'leave' && (
              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>Leave Type</label>
                <div style={radioGridStyle}>
                  {[
                    { id: 'normal', label: 'Normal Leave', bal: leaveBalance?.normalLeaveBalance },
                    { id: 'sick', label: 'Sick Leave', bal: 6 - (leaveBalance?.sickLeaveTaken || 0) },
                    { id: 'festival', label: 'Festival Leave', used: leaveBalance?.festivalLeaveUsed }
                  ].map(l => (
                    <label key={l.id} style={{ 
                      ...radioLabelStyle, 
                      borderColor: leaveType === l.id ? '#0451CC' : '#E5E7EB',
                      opacity: (l.id === 'sick' && l.bal <= 0) || (l.id === 'festival' && l.used) ? 0.5 : 1
                    }}>
                      <input 
                        type="radio" name="leaveType" value={l.id}
                        disabled={(l.id === 'sick' && l.bal <= 0) || (l.id === 'festival' && l.used)}
                        checked={leaveType === l.id}
                        onChange={(e) => setLeaveType(e.target.value)}
                        style={{ position: 'absolute', opacity: 0 }}
                      />
                      <div style={{ fontSize: 12 }}>{l.label}</div>
                      <div style={{ fontSize: 10, color: '#6B7280' }}>
                        {l.id === 'festival' ? (l.used ? 'Used' : 'Available') : `${l.bal} remaining`}
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
              style={{ ...inputStyle, minHeight: 80, resize: 'none' }}
            />
          </div>
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleSave} disabled={loading} style={saveBtnStyle}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalStyle = { width: 560, background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' };
const headerStyle = { padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const sectionStyle = { marginBottom: 24 };
const sectionTitleStyle = { fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 };
const contentStyle = { padding: 24, maxHeight: '70vh', overflowY: 'auto' };
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, display: 'block' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit' };
const radioGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 };
const radioLabelStyle = { padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', fontSize: 12, fontWeight: 500 };
const footerStyle = { padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: 12 };
const saveBtnStyle = { background: '#0451CC', color: '#fff', padding: '10px 24px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' };
const cancelBtnStyle = { background: '#fff', color: '#1A1A2E', padding: '10px 24px', borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer' };
const closeBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' };
