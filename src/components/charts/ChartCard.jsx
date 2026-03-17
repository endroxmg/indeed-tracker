import { BarChart2 } from 'lucide-react';

const cardStyle = {
  background: '#fff',
  border: '1px solid #E5E7EB',
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  marginBottom: 24,
};

export function ChartCard({ title, subtitle, icon: Icon, rightLabel, children, chartRef, style }) {
  return (
    <div ref={chartRef} style={{ ...cardStyle, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: subtitle ? 4 : 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={18} color="#0451CC" />}
          <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 16, color: '#2D2D2D', margin: 0 }}>{title}</h3>
        </div>
        {rightLabel && (
          <span style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 12, color: '#0451CC' }}>{rightLabel}</span>
        )}
      </div>
      {subtitle && (
        <p style={{ fontSize: 13, color: '#0451CC', margin: '0 0 16px', fontWeight: 500 }}>{subtitle}</p>
      )}
      {children}
    </div>
  );
}

export function EmptyChart({ message = 'No data for this period' }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <BarChart2 size={40} color="#D1D5DB" style={{ margin: '0 auto 12px', display: 'block' }} />
      <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: '#6B7280', margin: '0 0 4px', fontSize: 14 }}>{message}</h4>
      <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Try selecting a different date range</p>
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
  background: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  padding: '10px 14px',
  fontFamily: '"Noto Sans", sans-serif',
  fontSize: 12,
  color: '#2D2D2D',
  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
};

export function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={customTooltipStyle}>
      {label && <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill, flexShrink: 0 }} />
          <span style={{ color: '#6B7280' }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{formatter ? formatter(p.value, p.name) : p.value}</span>
        </div>
      ))}
    </div>
  );
}
