import { useMemo } from 'react';
import { format } from 'date-fns';
import { Info, CheckCircle, Clock } from 'lucide-react';
import InitialsAvatar from '../InitialsAvatar';

export default function TeamSalaryTable({ users, records, profiles, yearMonth, onRecalculate }) {
  const tableData = useMemo(() => {
    return users.map(user => {
      const profile = profiles.find(p => p.userId === user.id) || {};
      const record = records.find(r => r.userId === user.id);
      return { user, profile, record };
    });
  }, [users, records, profiles]);

  const totalNet = tableData.reduce((sum, d) => sum + (d.record?.netSalary || 0), 0);

  const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: '"Poppins"' }}>Team Salary — {format(new Date(yearMonth + '-01'), 'MMMM yyyy')}</h2>
        <div style={{ fontSize: 13, color: '#6B7280' }}>{users.length} Active Designers</div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ padding: '12px 24px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Designer</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Monthly Salary</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Daily Rate</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Base</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Bonuses</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Deductions</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Net Salary</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 24px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map(({ user, profile, record }) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.2s' }} className="hover-bg">
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <InitialsAvatar name={user.name} size={36} />
                    <span style={{ fontWeight: 600, color: '#1A1A2E', fontSize: 14 }}>{user.name}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 16px', fontSize: 14, fontWeight: 500 }}>
                  {profile.monthlySalary ? formatCurrency(profile.monthlySalary) : <span style={{ color: '#9CA3AF' }}>Not Set</span>}
                </td>
                <td style={{ padding: '16px 16px', fontSize: 14, color: '#6B7280' }}>
                  {record ? `₹${Math.round(record.dailyRate)}` : '—'}
                </td>
                <td style={{ padding: '16px 16px', fontSize: 14, color: '#6B7280' }}>
                  {record ? formatCurrency(record.baseSalary) : '—'}
                </td>
                <td style={{ padding: '16px 16px' }}>
                  {record ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#16A34A' }}>
                        +{formatCurrency(record.sundayBonusAmount + record.holidayBonusAmount + record.overtimeAmount)}
                      </span>
                      <div className="tooltip-trigger">
                        <Info size={14} color="#9CA3AF" />
                        <div className="tooltip">
                          <div>Sun: {formatCurrency(record.sundayBonusAmount)}</div>
                          <div>Hol: {formatCurrency(record.holidayBonusAmount)}</div>
                          <div>OT: {formatCurrency(record.overtimeAmount)}</div>
                        </div>
                      </div>
                    </div>
                  ) : '—'}
                </td>
                <td style={{ padding: '16px 16px' }}>
                  {record ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#DC2626' }}>
                        -{formatCurrency(record.totalDeductions)}
                      </span>
                      <div className="tooltip-trigger">
                        <Info size={14} color="#9CA3AF" />
                        <div className="tooltip">
                          <div>Half Day: {formatCurrency(record.halfDayDeductionAmount)}</div>
                          <div>Early: {formatCurrency(record.earlyLeaveDeductionAmount)}</div>
                          <div>Leave: {formatCurrency(record.leaveWithoutBalanceAmount + record.sickLeaveWithoutBalanceAmount)}</div>
                        </div>
                      </div>
                    </div>
                  ) : '—'}
                </td>
                <td style={{ padding: '16px 16px' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0451CC' }}>
                    {record ? formatCurrency(record.netSalary) : '—'}
                  </span>
                </td>
                <td style={{ padding: '16px 16px' }}>
                  {record ? (
                    <span style={{ 
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: record.isFinalized ? '#ECFDF5' : '#FFFBEB',
                      color: record.isFinalized ? '#16A34A' : '#D97706',
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      {record.isFinalized ? <CheckCircle size={10} /> : <Clock size={10} />}
                      {record.isFinalized ? 'Finalized' : 'Draft'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#9CA3AF italic' }}>No data</span>
                  )}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <button 
                    onClick={() => onRecalculate(user.id)}
                    style={{ 
                      background: 'none', border: 'none', color: '#0451CC', 
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 8px' 
                    }}
                  >
                    {record ? 'Recalculate' : 'Generate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#F9FAFB', fontWeight: 700 }}>
              <td colSpan={6} style={{ padding: '16px 24px', textAlign: 'right', fontSize: 14, color: '#6B7280' }}>
                Team Total Net Salary:
              </td>
              <td style={{ padding: '16px 16px', fontSize: 18, color: '#0451CC' }}>
                {formatCurrency(totalNet)}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <style>{`
        .hover-bg:hover { background: #F9FAFB; }
        .tooltip-trigger { position: relative; display: flex; align-items: center; cursor: help; }
        .tooltip { 
          visibility: hidden; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
          background: #1A1A2E; color: #fff; padding: 8px 12px; borderRadius: 8px; z-index: 50;
          font-size: 11px; white-space: nowrap; margin-bottom: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }
        .tooltip-trigger:hover .tooltip { visibility: visible; }
      `}</style>
    </div>
  );
}
