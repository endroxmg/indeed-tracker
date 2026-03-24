export function Skeleton({ width, height, borderRadius = 8, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: 24,
      border: '1px solid var(--color-border)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    }}>
      <Skeleton width="40%" height={14} style={{ marginBottom: 12 }} />
      <Skeleton width="60%" height={28} style={{ marginBottom: 8 }} />
      <Skeleton width="30%" height={12} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 16 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={`${100 / cols}%`} height={20} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonKanban() {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ flex: 1 }}>
          <Skeleton width="100%" height={32} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={120} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={120} />
        </div>
      ))}
    </div>
  );
}
