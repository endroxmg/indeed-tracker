import { useMemo } from 'react';
import { format } from 'date-fns';
import { 
  Info, CheckCircle, Clock, RefreshCcw, 
  TrendingUp, TrendingDown, Wallet, ArrowRight 
} from 'lucide-react';
import InitialsAvatar from '../InitialsAvatar';

export default function TeamSalaryTable({ users, records, profiles, yearMonth, onRecalculate }) {
  const tableData = useMemo(() => {
    return users.map(user => {
      const profile = profiles.find(p => p.userId === user.id) || {};
      const record = records.find(r => r.userId === user.id);
      return { user, profile, record };
    });
  }, [users, records, profiles]);

  const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>
          Team Payroll Breakdown — {format(new Date(yearMonth + '-01'), 'MMMM yyyy')}
        </h2>
        <div style={{ fontSize: 13, background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
          {users.length} Active Members
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {tableData.map(({ user, profile, record }) => (
          <div key={user.id} style={cardStyle}>
            {/* Header: User Info & Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <InitialsAvatar name={user.name} size={44} bg="var(--color-primary)" color='var(--color-surface)' />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-secondary-text)' }}>Base: {profile.monthlySalary ? formatCurrency(profile.monthlySalary) : 'Not Set'}</div>
                </div>
              </div>
              
              {record ? (
                <div style={{ 
                  padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  background: record.isFinalized ? '#ECFDF5' : '#FFFBEB',
                  color: record.isFinalized ? '#16A34A' : '#D97706',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  {record.isFinalized ? <CheckCircle size={12} /> : <Clock size={12} />}
                  {record.isFinalized ? 'Finalized' : 'Draft'}
                </div>
              ) : (
                <div style={{ fontSize: 10, color: 'var(--color-secondary-text)', fontWeight: 700, textTransform: 'uppercase' }}>No Data</div>
              )}
            </div>

            {/* Main Value */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--color-secondary-text)', marginBottom: 4 }}>Net Payable</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
                {record ? formatCurrency(record.netSalary) : '—'}
              </div>
            </div>

            {/* Breakdown Mini-Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div style={miniStatStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-secondary-text)', fontSize: 10, marginBottom: 4 }}>
                  <Wallet size={12} /> Base
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{record ? formatCurrency(record.baseSalary) : '—'}</div>
              </div>
              <div style={miniStatStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16A34A', fontSize: 10, marginBottom: 4 }}>
                  <TrendingUp size={12} /> Bonus
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>
                  {record ? `+${formatCurrency((record.sundayBonusAmount || 0) + (record.holidayBonusAmount || 0) + (record.overtimeAmount || 0))}` : '—'}
                </div>
              </div>
              <div style={miniStatStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#DC2626', fontSize: 10, marginBottom: 4 }}>
                  <TrendingDown size={12} /> Ded.
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>
                  {record ? `-${formatCurrency(record.totalDeductions)}` : '—'}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => onRecalculate(user.id)}
                style={{ 
                  flex: 1, padding: '10px', borderRadius: 12, border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)', color: '#fff', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                className="card-btn-secondary"
              >
                <RefreshCcw size={16} /> {record ? 'Recalculate' : 'Generate'}
              </button>
              <button 
                style={{ 
                  padding: '10px 14px', borderRadius: 12, border: 'none',
                  background: 'var(--color-primary)', color: 'var(--color-surface)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center'
                }}
                title="View Detailed Payslip"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .card-btn-secondary:hover { background: #F9FAFB; border-color: var(--color-border); }
      `}</style>
    </div>
  );
}

const cardStyle = {
  background: 'var(--color-surface)', borderRadius: 24, padding: 24,
  border: '1px solid var(--color-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
  transition: 'transform 0.2s, box-shadow 0.2s',
  cursor: 'default'
};

const miniStatStyle = {
  background: 'var(--color-background)', padding: '10px 12px', borderRadius: 12,
  border: '1px solid var(--color-border)'
};
