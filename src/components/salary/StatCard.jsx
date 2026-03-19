import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({ label, value, icon: Icon, trend, color = '#0451CC' }) {
  const isPositive = trend > 0;
  
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      borderRadius: 24,
      padding: 24,
      border: '1px solid rgba(255, 255, 255, 0.4)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
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
            color: isPositive ? '#16A34A' : '#DC2626',
            background: isPositive ? '#ECFDF5' : '#FEF2F2',
            padding: '4px 10px', borderRadius: 20
          }}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1A1A2E', letterSpacing: '-0.02em' }}>{value}</div>
      </div>
    </div>
  );
}
