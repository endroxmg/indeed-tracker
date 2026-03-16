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
        background: '#F3F2F1', border: '1px solid #D4D2D0',
        padding: '7px 12px', borderRadius: 10, width: 240,
        transition: 'all 0.2s ease',
        ...(open ? { borderColor: '#2557A7', boxShadow: '0 0 0 3px rgba(37,87,167,0.1)' } : {}),
      }}>
        <Search size={14} color="#767676" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search tickets..."
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            fontSize: 13, flex: 1, color: '#1A1A2E',
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
            <X size={14} color="#767676" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          marginTop: 6, background: '#fff', borderRadius: 12,
          border: '1px solid #D4D2D0', boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
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
                background: '#fff', border: 'none', cursor: 'pointer',
                borderBottom: '1px solid #F3F2F1',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F3F2F1'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              <span style={{
                fontWeight: 700, fontSize: 12, color: '#2557A7',
                minWidth: 70,
              }}>
                {ticket.jiraId}
              </span>
              <span style={{
                fontSize: 13, color: '#1A1A2E', flex: 1,
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
