import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #1A1A2E 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
    }}>
      {/* Logo above card — white on dark */}
      <div style={{ textAlign: 'center' }}>
        <img
          src="/indeed-logo.svg"
          alt="Indeed"
          style={{ height: 40, filter: 'brightness(0) invert(1)' }}
        />
      </div>

      {/* Login card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '48px 48px',
        width: 420,
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 700,
          fontSize: 22,
          color: '#1A1A2E',
          margin: '0 0 4px',
        }}>
          Content Creation Tracker
        </h1>

        <p style={{
          fontFamily: '"Noto Sans", sans-serif',
          fontSize: 14,
          color: '#767676',
          margin: '0 0 36px',
          lineHeight: 1.5,
        }}>
          Workflow Management & Analytics
        </p>

        <button
          onClick={login}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            width: '100%',
            padding: '14px 24px',
            background: '#FFFFFF',
            border: '2px solid #D4D2D0',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 600,
            color: '#1A1A2E',
            fontFamily: '"Noto Sans", sans-serif',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2557A7';
            e.currentTarget.style.background = '#F8FAFF';
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(37,87,167,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#D4D2D0';
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid #E8E8E8' }}>
          <p style={{ fontSize: 12, color: '#999', lineHeight: 1.5 }}>
            Only authorized team members can access this tool.
          </p>
        </div>
      </div>
    </div>
  );
}
