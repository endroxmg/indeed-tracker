import { X, Save, Key, Cpu, Bell, Shield, Wallet, Globe, Loader2, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateGlobalSettings, getGlobalSettings } from '../services/firestoreService';
import { useToast } from './Toast';

export default function SettingsModal({ onClose }) {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('api');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  const [settings, setSettings] = useState({
    frameioToken: '',
    geminiApiKey: '',
    jiraDomain: '',
    notificationsEnabled: true,
    theme: 'light',
    currency: 'INR'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getGlobalSettings();
        setSettings(prev => ({ ...prev, ...data }));
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can update global settings');
      return;
    }
    setSaving(true);
    try {
      await updateGlobalSettings(settings);
      toast.success('Settings updated successfully');
      onClose();
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestFrameio = async () => {
    if (!settings.frameioToken) {
      toast.warning('Please enter a Frame.io token first');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/frameio?action=test', {
        headers: { 'x-frameio-token': settings.frameioToken }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: `Connected as ${data.user} (${data.email})` });
        toast.success('Connection successful!');
      } else {
        throw new Error(data.error || 'Invalid token');
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message });
      toast.error('Connection failed: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const modalStyle = {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(26,26,46,0.6)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20
  };

  const contentStyle = {
    background: '#fff', borderRadius: 20, width: 640, maxWidth: '100%',
    maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
  };

  const sidebarTabStyle = (id) => ({
    padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
    cursor: 'pointer', borderRadius: 12, fontSize: 13, fontWeight: 600,
    color: activeTab === id ? '#2557A7' : '#6B7280',
    background: activeTab === id ? '#E8EDF7' : 'transparent',
    transition: 'all 0.2s', margin: '2px 0'
  });

  const sectionLabelStyle = {
    fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: 12, display: 'block'
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid #E5E7EB', fontSize: 13, fontFamily: '"Poppins", sans-serif',
    outline: 'none', transition: 'border-color 0.2s'
  };

  if (loading) return (
    <div style={modalStyle}>
      <div style={{ ...contentStyle, padding: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="spinning" color="#2557A7" size={32} />
      </div>
    </div>
  );

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: 0, fontFamily: '"Poppins"' }}>Settings</h2>
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Configure your experience and integration keys</p>
          </div>
          <button onClick={onClose} style={{ background: '#F9FAFB', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer' }}>
            <X size={20} color="#6B7280" />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', flex: 1, minHeight: 400 }}>
          {/* Sidebar */}
          <div style={{ padding: 16, borderRight: '1px solid #F3F4F6', background: '#FAFBFC' }}>
            <div style={sidebarTabStyle('api')} onClick={() => setActiveTab('api')}>
              <Key size={18} /> API & Integrations
            </div>
            <div style={sidebarTabStyle('general')} onClick={() => setActiveTab('general')}>
              <Globe size={18} /> General
            </div>
            <div style={sidebarTabStyle('notifications')} onClick={() => setActiveTab('notifications')}>
              <Bell size={18} /> Notifications
            </div>
            <div style={sidebarTabStyle('security')} onClick={() => setActiveTab('security')}>
              <Shield size={18} /> Security
            </div>
          </div>

          {/* Tab Content */}
          <div style={{ padding: 24, overflowY: 'auto' }}>
            {activeTab === 'api' && (
              <div className="fade-in">
                <span style={sectionLabelStyle}>External Services</span>
                {!isAdmin && (
                  <div style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', padding: 12, borderRadius: 10, marginBottom: 20, color: '#9A3412', fontSize: 12 }}>
                    <strong>Notice:</strong> Only administrators can modify global API keys.
                  </div>
                )}
                
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ ...sectionLabelStyle, fontSize: 10, textTransform: 'none', color: '#6B7280', margin: 0 }}>Frame.io Personal Access Token</label>
                    <button 
                      onClick={handleTestFrameio} 
                      disabled={testing || !settings.frameioToken}
                      style={{ 
                        fontSize: 10, padding: '4px 8px', borderRadius: 6, border: '1px solid #2557A7',
                        background: '#fff', color: '#2557A7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      {testing ? <Loader2 size={10} className="spinning" /> : <RefreshCw size={10} />}
                      Test
                    </button>
                  </div>
                  <input 
                    type="password" 
                    value={settings.frameioToken} 
                    onChange={e => { setSettings(p => ({ ...p, frameioToken: e.target.value })); setTestResult(null); }}
                    placeholder="fio-u-..."
                    style={inputStyle}
                    disabled={!isAdmin}
                  />
                  {testResult && (
                    <div style={{ 
                      marginTop: 8, padding: '8px 12px', borderRadius: 8, fontSize: 11,
                      background: testResult.success ? '#F0FDF4' : '#FEF2F2',
                      color: testResult.success ? '#166534' : '#991B1B',
                      display: 'flex', alignItems: 'center', gap: 8, border: '1px solid',
                      borderColor: testResult.success ? '#DCFCE7' : '#FEE2E2'
                    }}>
                      {testResult.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                      {testResult.message}
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>Used for syncing comments and video metadata. Generate this in Frame.io Developer Tools.</p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ ...sectionLabelStyle, fontSize: 10, textTransform: 'none', color: '#6B7280' }}>Gemini API Key</label>
                  <input 
                    type="password" 
                    value={settings.geminiApiKey} 
                    onChange={e => setSettings(p => ({ ...p, geminiApiKey: e.target.value }))}
                    placeholder="AIza..."
                    style={inputStyle}
                    disabled={!isAdmin}
                  />
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>Used for AI-assisted task updates and summaries.</p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ ...sectionLabelStyle, fontSize: 10, textTransform: 'none', color: '#6B7280' }}>Jira Workspace Domain</label>
                  <input 
                    type="text" 
                    value={settings.jiraDomain} 
                    onChange={e => setSettings(p => ({ ...p, jiraDomain: e.target.value }))}
                    placeholder="your-org.atlassian.net"
                    style={inputStyle}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="fade-in">
                <span style={sectionLabelStyle}>Preference</span>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ ...sectionLabelStyle, fontSize: 10, textTransform: 'none', color: '#6B7280' }}>Default Currency</label>
                  <select 
                    value={settings.currency} 
                    onChange={e => setSettings(p => ({ ...p, currency: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="INR">Indian Rupee (₹)</option>
                    <option value="USD">US Dollar ($)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="fade-in" style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                <Bell size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                <p style={{ fontSize: 14 }}>Notification preferences coming soon.</p>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="fade-in" style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                <Shield size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                <p style={{ fontSize: 14 }}>Role-based access controls and audit logs.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 12, border: '1px solid #E5E7EB',
            background: '#fff', fontSize: 13, fontWeight: 600, color: '#4B5563', cursor: 'pointer'
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !isAdmin} style={{
            padding: '10px 24px', borderRadius: 12, border: 'none',
            background: isAdmin ? '#2557A7' : '#D1D5DB', fontSize: 13, fontWeight: 700, color: '#fff', 
            cursor: isAdmin ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8
          }}>
            {saving ? <Loader2 size={16} className="spinning" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
