import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export default function GlobalSearch({ tickets = [], onSelectTicket }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = query.length > 0
    ? tickets.filter((t) => {
        const q = query.toLowerCase();
        return t.jiraId?.toLowerCase().includes(q) || t.title?.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)',
        padding: '7px 12px', borderRadius: 10, width: 240,
        transition: 'all 0.2s ease',
        ...(open ? { borderColor: 'var(--color-primary)', boxShadow: '0 0 0 3px rgba(37,87,167,0.15)' } : {}),
      }}>
        <Search size={14} color="var(--color-secondary-text)" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search tickets..."
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            fontSize: 13, flex: 1, color: '#fff',
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
            <X size={14} color="var(--color-secondary-text)" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          marginTop: 6, background: 'var(--color-surface)', borderRadius: 12,
          border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden', zIndex: 100,
          maxHeight: 320, overflowY: 'auto',
        }}>
          {results.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => { onSelectTicket?.(ticket); setOpen(false); setQuery(''); }}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: '1px solid var(--color-border)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--color-primary)', minWidth: 70 }}>
                {ticket.jiraId}
              </span>
              <span style={{
                fontSize: 13, color: '#fff', flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {ticket.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
