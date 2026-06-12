import React, { useState, useEffect } from 'react';
import { Mail, Settings, Inbox, Layout } from 'lucide-react';
import ContactFormManager from './ContactFormManager.js';
import SubmissionsViewer from './SubmissionsViewer.js';

interface ContactFormPageProps {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

export default function ContactFormPage({ apiFetch }: ContactFormPageProps) {
  const [activeTab, setActiveTab] = useState<'forms' | 'submissions' | 'settings'>('forms');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Settings state
  const [enableCaptcha, setEnableCaptcha] = useState<boolean>(false);
  const [maxSubmissions, setMaxSubmissions] = useState<number>(60);
  const [defaultSuccessMsg, setDefaultSuccessMsg] = useState<string>('Terima kasih, pesan Anda telah terkirim!');
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);

  const loadSettings = async () => {
    try {
      const res = await apiFetch('/api/admin/settings/scope/contact-form');
      if (res.ok) {
        const data = await res.json();
        const settingsMap: Record<string, string> = {};
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            settingsMap[item.key] = item.value;
          });
        }

        if (settingsMap['contact-form.enable_captcha'] !== undefined) {
          setEnableCaptcha(settingsMap['contact-form.enable_captcha'] === 'true');
        }
        if (settingsMap['contact-form.max_submissions_per_hour'] !== undefined) {
          setMaxSubmissions(parseInt(settingsMap['contact-form.max_submissions_per_hour'], 10) || 60);
        }
        if (settingsMap['contact-form.default_success_message'] !== undefined) {
          setDefaultSuccessMsg(settingsMap['contact-form.default_success_message']);
        }
      }
    } catch (err) {
      console.error('Failed to load contact form settings', err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const settingsToSave = [
        { key: 'contact-form.enable_captcha', value: enableCaptcha ? 'true' : 'false', type: 'boolean', isPublic: true },
        { key: 'contact-form.max_submissions_per_hour', value: String(maxSubmissions), type: 'number', isPublic: false },
        { key: 'contact-form.default_success_message', value: defaultSuccessMsg, type: 'string', isPublic: true }
      ];

      for (const item of settingsToSave) {
        await apiFetch(`/api/admin/settings/${item.key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: item.value,
            group: 'contact-form',
            type: item.type,
            isPublic: item.isPublic,
            description: `Contact form setting for ${item.key}`
          })
        });
      }

      setSuccessMsg('Settings saved successfully.');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save settings.');
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="workspace-container">
      {/* Header Area */}
      <div className="view-header-with-action" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>
            <Mail className="lucide-icon" size={28} /> Contact Form Manager
          </h2>
          <p className="view-subtitle" style={{ margin: '0.4rem 0 0 0', color: 'var(--text-muted)' }}>
            Create customizable dynamic forms, capture leads, and manage message submissions.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '0.5rem' }}>
        <button
          onClick={() => { setActiveTab('forms'); setSuccessMsg(null); setErrorMsg(null); }}
          className={`nav-item ${activeTab === 'forms' ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.75rem 1rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'forms' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'forms' ? 'var(--text)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <Layout size={16} /> Forms Builder
        </button>
        <button
          onClick={() => { setActiveTab('submissions'); setSuccessMsg(null); setErrorMsg(null); }}
          className={`nav-item ${activeTab === 'submissions' ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.75rem 1rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'submissions' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'submissions' ? 'var(--text)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <Inbox size={16} /> Submissions Inbox
        </button>
        <button
          onClick={() => { setActiveTab('settings'); setSuccessMsg(null); setErrorMsg(null); }}
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.75rem 1rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'settings' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'settings' ? 'var(--text)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <Settings size={16} /> Global Settings
        </button>
      </div>

      {/* Tab Contents */}
      <div className="tab-content">
        {activeTab === 'forms' && (
          <ContactFormManager apiFetch={apiFetch} />
        )}

        {activeTab === 'submissions' && (
          <SubmissionsViewer apiFetch={apiFetch} />
        )}

        {activeTab === 'settings' && (
          <div className="glass" style={{ padding: '2rem', borderRadius: '8px', border: '1px solid var(--border)', maxWidth: '600px' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: 600 }}>Form Settings</h3>
            
            {successMsg && (
              <div className="login-error-box" style={{ background: 'var(--accent-success-bg)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#a7f3d0', marginBottom: '1.5rem' }}>
                <span>✔️</span> {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="login-error-box" style={{ marginBottom: '1.5rem' }}>
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Default Success Message</label>
                <input 
                  type="text"
                  value={defaultSuccessMsg}
                  onChange={(e) => setDefaultSuccessMsg(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                  required
                />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Submission Rate Limit (per IP per Hour)</label>
                <input 
                  type="number"
                  value={maxSubmissions}
                  onChange={(e) => setMaxSubmissions(parseInt(e.target.value, 10) || 60)}
                  min={1}
                  style={{ width: '100px', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input 
                    type="checkbox"
                    checked={enableCaptcha}
                    onChange={(e) => setEnableCaptcha(e.target.checked)}
                  />
                  Enable Captcha protection (future integration)
                </label>
              </div>

              <button 
                type="submit" 
                className="btn-primary-action"
                style={{ width: '150px', alignSelf: 'flex-start', marginTop: '0.5rem' }}
                disabled={settingsLoading}
              >
                {settingsLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
