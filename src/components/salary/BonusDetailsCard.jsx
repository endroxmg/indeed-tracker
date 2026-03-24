import { Star, Calendar, Zap } from 'lucide-react';

export default function BonusDetailsCard({ record }) {
  const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
      {/* Sunday Bonuses */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#F0FDF4', padding: '8px', borderRadius: 10 }}>
            <Star size={20} color="#16A34A" />
          </div>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Sunday Bonuses</h4>
        </div>

        {record.sundayBonusCount > 0 ? (
          <div>
            <div style={{ fontSize: 13, color: 'var(--color-secondary-text)', marginBottom: 12 }}>
              You earned <strong style={{ color: '#16A34A' }}>{record.sundayBonusCount}</strong> bonus(es) for working on Sundays without an alternative week-off.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--color-background)', borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--color-secondary-text)' }}>Total Sunday Bonus</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#16A34A' }}>{formatCurrency(record.sundayBonusAmount)}</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--color-secondary-text)', margin: 0 }}>No Sunday bonuses this month.</p>
          </div>
        )}
      </div>

      {/* Holiday Bonuses */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#FEF9C3', padding: '8px', borderRadius: 10 }}>
            <Calendar size={20} color="#92400E" />
          </div>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Holiday Bonuses</h4>
        </div>

        {record.holidayBonusCount > 0 ? (
          <div>
            <div style={{ fontSize: 13, color: 'var(--color-secondary-text)', marginBottom: 12 }}>
              You earned <strong style={{ color: '#D97706' }}>{record.holidayBonusCount}</strong> bonus(es) for working on public holidays (2.5x rate).
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#FDFBE7', borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: '#92400E' }}>Total Holiday Bonus</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#D97706' }}>{formatCurrency(record.holidayBonusAmount)}</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--color-secondary-text)', margin: 0 }}>No public holiday work recorded.</p>
          </div>
        )}
      </div>

      {/* Overtime Summary */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ background: 'var(--color-primary-light)', padding: '8px', borderRadius: 10 }}>
            <Zap size={20} color="var(--color-primary)" />
          </div>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Overtime Summary</h4>
        </div>

        {record.overtimeHours > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--color-secondary-text)' }}>Total OT Hours</span>
              <span style={{ fontWeight: 600 }}>{record.overtimeHours.toFixed(1)} hrs</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--color-secondary-text)' }}>OT Hourly Rate</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(record.overtimeHourlyRate)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--color-primary-light)', borderRadius: 8, marginTop: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600 }}>Total OT Earnings</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(record.overtimeAmount)}</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--color-secondary-text)', margin: 0 }}>No overtime hours this month.</p>
          </div>
        )}
      </div>
    </div>
  );
}
