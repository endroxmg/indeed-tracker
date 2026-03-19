import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { IndianRupee, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SalaryDashboardWidget() {
  const [records, setSalaryRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const yearMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    const q = query(collection(db, 'salaryHistory'), where('month', '==', yearMonth));
    const unsub = onSnapshot(q, (snap) => {
      setSalaryRecords(snap.docs.map(d => d.data()));
      setLoading(false);
    });
    return unsub;
  }, [yearMonth]);

  if (loading) return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: 16, border: '1px solid #E5E7EB', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader small"></div>
    </div>
  );

  const totalNet = records.reduce((sum, r) => sum + (r.netSalary || 0), 0);
  const totalBonus = records.reduce((sum, r) => 
    sum + ((r.sundayBonusAmount || 0) + (r.holidayBonusAmount || 0) + (r.overtimeAmount || 0)), 0);
  const totalDeduction = records.reduce((sum, r) => sum + (r.totalDeductions || 0), 0);

  const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#EAF0FD', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IndianRupee size={16} color="#0451CC" />
          </div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, display: 'block' }}>Salary Preview</span>
            <span style={{ fontSize: 11, color: '#6B7280' }}>{format(new Date(), 'MMMM yyyy')}</span>
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#FFFBEB', color: '#D97706', textTransform: 'uppercase' }}>
          Preliminary
        </span>
      </div>

      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Estimated Team Total Net</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0451CC', fontFamily: '"Poppins"' }}>
            {formatCurrency(totalNet)}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: '#F0FDF4', padding: '12px', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16A34A', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
              <TrendingUp size={12} /> Total Bonuses
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#166534' }}>{formatCurrency(totalBonus)}</div>
          </div>
          <div style={{ background: '#FEF2F2', padding: '12px', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#DC2626', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
              <TrendingDown size={12} /> Total Deductions
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#991B1B' }}>{formatCurrency(totalDeduction)}</div>
          </div>
        </div>
      </div>

      <button 
        onClick={() => navigate('/salary')}
        style={{ 
          width: '100%', padding: '12px', background: 'none', border: 'none', 
          borderTop: '1px solid #E5E7EB', color: '#0451CC', fontSize: 13, 
          fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', gap: 6, transition: 'background 0.2s' 
        }}
        onMouseEnter={(e) => e.target.style.background = '#F9FAFB'}
        onMouseLeave={(e) => e.target.style.background = 'none'}
      >
        View Full Details <ArrowRight size={14} />
      </button>

      <div style={{ padding: '8px', textAlign: 'center', fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>
        Salary data is private. Only visible to admin.
      </div>
    </div>
  );
}
