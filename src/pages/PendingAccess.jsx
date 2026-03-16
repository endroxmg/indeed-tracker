import { useAuth } from '../contexts/AuthContext';
import { LogOut, Clock } from 'lucide-react';

export default function PendingAccess() {
  const { userDoc, logout } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #1A1A2E 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '56px 48px',
        width: 440,
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: '#FFF7ED', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Clock size={28} color="#D97706" />
        </div>

        <h1 style={{
          fontFamily: '"Poppins", sans-serif', fontWeight: 700,
          fontSize: 22, color: '#1A1A2E', margin: '0 0 8px',
        }}>
          Access Pending
        </h1>

        <p style={{ fontSize: 14, color: '#767676', lineHeight: 1.6, margin: '0 0 8px' }}>
          Your account has been registered but is awaiting admin approval.
        </p>

        <p style={{ fontSize: 13, color: '#999', margin: '0 0 32px' }}>
          Signed in as <strong style={{ color: '#1A1A2E' }}>{userDoc?.email}</strong>
        </p>

        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, width: '100%', padding: '12px',
          background: '#FFFFFF', border: '2px solid #D4D2D0', borderRadius: 10,
          cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1A1A2E',
          transition: 'all 0.2s ease',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C91B1B'; e.currentTarget.style.color = '#C91B1B'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#D4D2D0'; e.currentTarget.style.color = '#1A1A2E'; }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
