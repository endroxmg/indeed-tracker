import { BarChart2 } from 'lucide-react';

const cardStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 16,
  padding: '24px 24px 32px 24px',
  boxShadow: 'var(--shadow-card)',
  marginBottom: 24,
};

export function ChartCard({ title, subtitle, icon: Icon, rightLabel, children, chartRef, style }) {
  return (
    <div ref={chartRef} style={{ ...cardStyle, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: subtitle ? 4 : 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {Icon && <div style={{ background: 'var(--color-primary-light)', padding: 6, borderRadius: 8 }}><Icon size={18} color="var(--color-primary)" /></div>}
          <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 16, color: '#fff', margin: 0 }}>{title}</h3>
        </div>
        {rightLabel && (
          <span style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 12, color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '2px 10px', borderRadius: 12 }}>{rightLabel}</span>
        )}
      </div>
      {subtitle && (
        <p style={{ fontSize: 13, color: 'var(--color-secondary-text)', margin: '0 0 20px', fontWeight: 500 }}>{subtitle}</p>
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

export function EmptyChart({ message = 'No data for this period' }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <BarChart2 size={40} color="var(--color-secondary-text)" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
      <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: 'var(--color-secondary-text)', margin: '0 0 4px', fontSize: 14 }}>{message}</h4>
      <p style={{ fontSize: 12, color: 'var(--color-secondary-text)', margin: 0 }}>Try selecting a different date range</p>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div style={cardStyle}>
      <div className="skeleton" style={{ height: 20, width: 180, borderRadius: 6, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 260, borderRadius: 8 }} />
    </div>
  );
}

const customTooltipStyle = {
  background: 'var(--color-surface-hover)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '12px 16px',
  fontFamily: '"Noto Sans", sans-serif',
  fontSize: 12,
  color: '#fff',
  boxShadow: 'var(--shadow-modal)',
};

export function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  const isOverridden = payload.some(p => p.payload?._isOverridden || p.payload?.payload?._isOverridden);
  
  return (
    <div style={customTooltipStyle}>
      {label && (
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, borderBottom: isOverridden ? '1px solid var(--color-border)' : 'none', paddingBottom: isOverridden ? 6 : 0, color: '#fff' }}>
          {label}
          {isOverridden && (
             <span style={{ 
               display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, 
               color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', 
               borderRadius: 10, fontWeight: 700, textTransform: 'uppercase' 
             }}>
               <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
               Modified
             </span>
          )}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill, flexShrink: 0, boxShadow: `0 0 6px ${p.color || p.fill}` }} />
          <span style={{ color: 'var(--color-secondary-text)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: '#fff' }}>{formatter ? formatter(p.value, p.name) : p.value}</span>
        </div>
      ))}
    </div>
  );
}
