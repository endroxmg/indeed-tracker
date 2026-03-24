import React, { useState, useEffect } from 'react';
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
    theme: 'dark', // Updated default
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
    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20
  };

  const contentStyle = {
    background: 'var(--color-surface)', borderRadius: 24, width: 720, maxWidth: '100%',
    maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    boxShadow: 'var(--shadow-modal)', border: '1px solid var(--color-border)'
  };

  const sidebarTabStyle = (id) => ({
    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
    cursor: 'pointer', borderRadius: 12, fontSize: 13, fontWeight: 600,
    color: activeTab === id ? 'var(--color-primary)' : 'var(--color-secondary-text)',
    background: activeTab === id ? 'var(--color-primary-light)' : 'transparent',
    border: activeTab === id ? '1px solid rgba(37, 87, 167, 0.2)' : '1px solid transparent',
    transition: 'all 0.2s', margin: '4px 0'
  });

  const sectionLabelStyle = {
    fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-text)', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: 12, display: 'block'
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 12,
    border: '1px solid var(--color-border)', fontSize: 13, fontFamily: '"Poppins", sans-serif',
    outline: 'none', transition: 'border-color 0.2s', background: 'var(--color-background)',
    color: '#fff'
  };

  if (loading) return (
    <div style={modalStyle}>
      <div style={{ ...contentStyle, padding: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="spinning" color="var(--color-primary)" size={32} />
      </div>
    </div>
  );

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface)' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, fontFamily: '"Poppins"' }}>Global Settings</h2>
            <p style={{ fontSize: 13, color: 'var(--color-secondary-text)', margin: '4px 0 0' }}>Configure integrations and workspace preferences</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 8, cursor: 'pointer', transition: 'all 0.2s' }} className="hover:bg-[var(--color-border)]">
            <X size={20} color="var(--color-secondary-text)" />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', flex: 1, minHeight: 460 }}>
          {/* Sidebar */}
          <div style={{ padding: '24px 16px', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
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
          <div style={{ padding: '32px 40px', overflowY: 'auto', background: 'var(--color-background)' }}>
            {activeTab === 'api' && (
              <div className="fade-in">
                <span style={sectionLabelStyle}>External Services</span>
                {!isAdmin && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: 16, borderRadius: 12, marginBottom: 24, color: '#F59E0B', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shield size={18} />
                    <strong>Notice:</strong> Only administrators can modify global API keys.
                  </div>
                )}
                
                <div style={{ marginBottom: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label style={{ ...sectionLabelStyle, fontSize: 13, textTransform: 'none', margin: 0 }}>Frame.io Personal Access Token</label>
                    <button 
                      onClick={handleTestFrameio} 
                      disabled={testing || !settings.frameioToken}
                      style={{ 
                        fontSize: 11, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-primary)',
                        background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, transition: 'all 0.2s'
                      }}
                      className="hover:bg-[var(--color-primary-light)]"
                    >
                      {testing ? <Loader2 size={12} className="spinning" /> : <RefreshCw size={12} />}
                      Test
                    </button>
                  </div>
                  <input 
                    type="password" 
                    value={settings.frameioToken} 
                    onChange={e => { setSettings(p => ({ ...p, frameioToken: e.target.value })); setTestResult(null); }}
                    placeholder="Enter Frame.io developer token..."
                    style={inputStyle}
                    disabled={!isAdmin}
                    className="focus:border-[var(--color-primary)] opacity-100 disabled:opacity-50"
                  />
                  {testResult && (
                    <div style={{ 
                      marginTop: 12, padding: '10px 16px', borderRadius: 10, fontSize: 12,
                      background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: testResult.success ? '#10B981' : '#EF4444',
                      display: 'flex', alignItems: 'center', gap: 10, border: '1px solid',
                      borderColor: testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                    }}>
                      {testResult.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                      {testResult.message}
                    </div>
                  )}
                  <p style={{ fontSize: 12, color: 'var(--color-secondary-text)', marginTop: 8 }}>Used for syncing comments and video metadata. Generate this in Frame.io Developer Tools.</p>
                </div>

                <div style={{ marginBottom: 32 }}>
                  <label style={{ ...sectionLabelStyle, fontSize: 13, textTransform: 'none' }}>Gemini API Key</label>
                  <input 
                    type="password" 
                    value={settings.geminiApiKey} 
                    onChange={e => setSettings(p => ({ ...p, geminiApiKey: e.target.value }))}
                    placeholder="AIzaSy..."
                    style={inputStyle}
                    disabled={!isAdmin}
                    className="focus:border-[var(--color-primary)] opacity-100 disabled:opacity-50"
                  />
                  <p style={{ fontSize: 12, color: 'var(--color-secondary-text)', marginTop: 8 }}>Used for AI-assisted task updates and summaries.</p>
                </div>

                <div style={{ marginBottom: 32 }}>
                  <label style={{ ...sectionLabelStyle, fontSize: 13, textTransform: 'none' }}>Jira Workspace Domain</label>
                  <input 
                    type="text" 
                    value={settings.jiraDomain} 
                    onChange={e => setSettings(p => ({ ...p, jiraDomain: e.target.value }))}
                    placeholder="your-org.atlassian.net"
                    style={inputStyle}
                    disabled={!isAdmin}
                    className="focus:border-[var(--color-primary)] opacity-100 disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="fade-in">
                <span style={sectionLabelStyle}>Preferences</span>
                <div style={{ marginBottom: 32 }}>
                  <label style={{ ...sectionLabelStyle, fontSize: 13, textTransform: 'none' }}>Default Currency</label>
                  <select 
                    value={settings.currency} 
                    onChange={e => setSettings(p => ({ ...p, currency: e.target.value }))}
                    style={inputStyle}
                    className="focus:border-[var(--color-primary)]"
                  >
                    <option value="INR">Indian Rupee (₹)</option>
                    <option value="USD">US Dollar ($)</option>
                  </select>
                </div>
                
                <div style={{ marginBottom: 32 }}>
                  <label style={{ ...sectionLabelStyle, fontSize: 13, textTransform: 'none' }}>Theme</label>
                  <select 
                    value={settings.theme} 
                    onChange={e => setSettings(p => ({ ...p, theme: e.target.value }))}
                    style={inputStyle}
                    className="focus:border-[var(--color-primary)]"
                  >
                    <option value="dark">Dark Theme (Default)</option>
                    <option value="light">Light Theme</option>
                  </select>
                  <p style={{ fontSize: 12, color: 'var(--color-secondary-text)', marginTop: 8 }}>This application is primarily designed for Dark Mode.</p>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary-text)' }}>
                <Bell size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
                <p style={{ fontSize: 14, fontWeight: 500 }}>Notification preferences coming soon.</p>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary-text)' }}>
                <Shield size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
                <p style={{ fontSize: 14, fontWeight: 500 }}>Role-based access controls and audit logs.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 16, background: 'var(--color-surface)' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '10px 24px' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !isAdmin} className={isAdmin ? 'btn-primary' : 'btn-secondary'} style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10, opacity: isAdmin ? 1 : 0.5 }}>
            {saving ? <Loader2 size={16} className="spinning" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
