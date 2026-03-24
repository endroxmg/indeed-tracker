import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({ label, value, icon: Icon, trend, color = 'var(--color-primary)' }) {
  const isPositive = trend > 0;
  
  return (
    <div style={{
      background: 'var(--color-surface)',
      backdropFilter: 'blur(12px)',
      borderRadius: 24,
      padding: 24,
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-card)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      minWidth: 200,
      flex: 1
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ 
          width: 44, height: 44, borderRadius: 14, 
          background: `${color}15`, 
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
          <Icon size={22} color={color} />
        </div>
        {trend !== undefined && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 4, 
            fontSize: 12, fontWeight: 700,
            color: isPositive ? '#10B981' : '#EF4444',
            background: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            padding: '4px 10px', borderRadius: 20
          }}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 13, color: 'var(--color-secondary-text)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{value}</div>
      </div>
    </div>
  );
}
