import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let toastId = 0;

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: { bg: '#F0FDF4', border: '#16A34A', text: '#166534', icon: '#16A34A' },
  error: { bg: '#FEF2F2', border: '#DC2626', text: '#991B1B', icon: '#DC2626' },
  warning: { bg: '#FFFBEB', border: '#D97706', text: '#92400E', icon: '#D97706' },
  info: { bg: '#EAF0FD', border: '#0451CC', text: '#0451CC', icon: '#0451CC' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      return next.slice(-3); // max 3
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
      }}>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          const c = COLORS[t.type];
          return (
            <div key={t.id} style={{
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              fontFamily: '"Noto Sans", sans-serif',
              fontSize: 14, color: c.text,
              animation: 'slideIn 0.3s ease',
              maxWidth: 400,
            }}>
              <Icon size={18} color={c.icon} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t.message}</span>
              <button onClick={() => removeToast(t.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 2, display: 'flex', flexShrink: 0,
              }}>
                <X size={14} color={c.text} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
