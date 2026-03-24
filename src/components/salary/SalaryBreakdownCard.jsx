import { IndianRupee, TrendingUp, TrendingDown } from 'lucide-react';

export default function SalaryBreakdownCard({ record }) {
  const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  const earnings = [
    { label: 'Base Monthly Salary', value: formatCurrency(record.monthlySalary) },
    { label: 'Sunday Work Bonus', value: `+${formatCurrency(record.sundayBonusAmount)}`, sub: `(${record.sundayBonusCount} Sundays × 1.5 days)` },
    { label: 'Public Holiday Bonus', value: `+${formatCurrency(record.holidayBonusAmount)}`, sub: `(${record.holidayBonusCount} holidays × 2.5 days)` },
    { label: 'Overtime Pay', value: `+${formatCurrency(record.overtimeAmount)}`, sub: `(${record.overtimeHours.toFixed(1)} hrs × ${formatCurrency(record.overtimeHourlyRate)}/hr)` },
  ];

  const deductions = [
    { label: 'Half Day Deductions', value: `-${formatCurrency(record.halfDayDeductionAmount)}`, sub: `(${record.halfDayCount} half days × 0.5 day)` },
    { label: 'Early Leave Deductions', value: `-${formatCurrency(record.earlyLeaveDeductionAmount)}`, sub: `(${record.earlyLeaveHalfDays} triggers × 0.5 day)` },
    { label: 'Leave Without Balance', value: `-${formatCurrency(record.leaveWithoutBalanceAmount + record.sickLeaveWithoutBalanceAmount + record.festivalLeaveWithoutBalanceAmount)}`, sub: `(${record.leaveWithoutBalanceCount + record.sickLeaveWithoutBalanceCount + record.festivalLeaveWithoutBalanceCount} days × daily rate)` },
  ];

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: '"Poppins"' }}>Salary Breakdown — {record.month}</h3>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {/* Earnings */}
        <div style={{ padding: '24px', borderRight: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16A34A', marginBottom: 20 }}>
            <TrendingUp size={18} />
            <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>Earnings</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {earnings.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--color-secondary-text)', fontWeight: 500 }}>{item.label}</div>
                  {item.sub && <div style={{ fontSize: 11, color: 'var(--color-secondary-text)' }}>{item.sub}</div>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: i === 0 ? '#111827' : '#16A34A' }}>{item.value}</div>
              </div>
            ))}
            <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Total Earnings</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#16A34A' }}>{formatCurrency(record.totalEarnings)}</span>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626', marginBottom: 20 }}>
            <TrendingDown size={18} />
            <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>Deductions</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {deductions.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--color-secondary-text)', fontWeight: 500 }}>{item.label}</div>
                  {item.sub && <div style={{ fontSize: 11, color: 'var(--color-secondary-text)' }}>{item.sub}</div>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#DC2626' }}>{item.value}</div>
              </div>
            ))}
            <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Total Deductions</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#DC2626' }}>{formatCurrency(record.totalDeductions)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', background: 'var(--color-primary-light)', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--color-secondary-text)', marginBottom: 4 }}>Net Salary Payable</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-primary)', fontFamily: '"Poppins"' }}>{formatCurrency(record.netSalary)}</div>
        <div style={{ fontSize: 12, color: 'var(--color-secondary-text)', marginTop: 4 }}>
          = {formatCurrency(record.totalEarnings)} earnings – {formatCurrency(record.totalDeductions)} deductions
        </div>
      </div>
    </div>
  );
}
