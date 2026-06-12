import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, ArrowLeft, Save, RotateCw, Download, Upload,
  AlertCircle, CheckCircle, ChevronRight,
  Palette, PaintBucket, Type, LayoutTemplate, PanelTop, PanelBottom,
  Navigation, Home, FileText, Image as ImageIcon, Share2, Sparkles,
  Boxes, Puzzle, Accessibility, Languages, Gauge, Settings2, Zap
} from 'lucide-react';

interface ThemeSettingsField {
  type: string;
  label: string;
  description: string;
  default: any;
  required: boolean;
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
}

interface ThemeSettingsSection {
  label: string;
  description?: string;
  fields: Record<string, ThemeSettingsField>;
}

interface ThemeSettingsSchema {
  schemaVersion: number;
  sections: Record<string, ThemeSettingsSection>;
}

interface ThemeSettingsPageProps {
  themeId: string;
  themeName?: string;
  onBack: () => void;
}

const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:4000';

// ───────────────────────────────────────────────
// Section icon/color mapping for visual tabs
// ───────────────────────────────────────────────
const sectionMeta: Record<string, { icon: React.ComponentType<any>; group: string }> = {
  branding:      { icon: Palette, group: 'CORE' },
  colors:        { icon: PaintBucket, group: 'CORE' },
  typography:    { icon: Type, group: 'CORE' },
  layout:        { icon: LayoutTemplate, group: 'CORE' },
  header:        { icon: PanelTop, group: 'SITE' },
  footer:        { icon: PanelBottom, group: 'SITE' },
  navigation:    { icon: Navigation, group: 'SITE' },
  homepage:      { icon: Home, group: 'SITE' },
  content:       { icon: FileText, group: 'CONTENT' },
  media:         { icon: ImageIcon, group: 'CONTENT' },
  socialSharing: { icon: Share2, group: 'CONTENT' },
  appearance:    { icon: Sparkles, group: 'EXTENDED' },
  designSystem:  { icon: Boxes, group: 'EXTENDED' },
  components:    { icon: Puzzle, group: 'EXTENDED' },
  glowEffects:   { icon: Zap, group: 'EXTENDED' },
  accessibility: { icon: Accessibility, group: 'EXTENDED' },
  localization:  { icon: Languages, group: 'EXTENDED' },
  performance:   { icon: Gauge, group: 'EXTENDED' },
  advanced:      { icon: Settings2, group: 'ADVANCED' },
};

export default function ThemeSettingsPage({ themeId, themeName, onBack }: ThemeSettingsPageProps) {
  const [schema, setSchema] = useState<ThemeSettingsSchema | null>(null);
  const [values, setValues] = useState<Record<string, Record<string, any>>>({});
  const [regions, setRegions] = useState<Record<string, { label: string; description?: string }>>({});
  const [activeSection, setActiveSection] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // ─── Load settings ───
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/admin/themes/${themeId}/settings`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load settings');
      setSchema(data.schema);
      setValues(data.values);
      setRegions(data.regions || {});
      // Set first section as active
      if (data.schema?.sections) {
        const keys = Object.keys(data.schema.sections);
        if (keys.length > 0 && !activeSection) {
          setActiveSection(keys[0]);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [themeId]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // ─── Save ───
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${apiUrl}/api/admin/themes/${themeId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSuccess('Settings saved successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Reset ───
  const handleReset = async () => {
    if (!confirm('Reset all settings to schema defaults? This cannot be undone.')) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${apiUrl}/api/admin/themes/${themeId}/settings/reset`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reset');
      setSuccess('Settings reset to defaults.');
      setTimeout(() => setSuccess(null), 3000);
      await loadSettings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ─── Export ───
  const handleExport = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/themes/${themeId}/settings/export`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to export');

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${themeId}-settings.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ─── Import ───
  const handleImport = async () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(importJson);
      const res = await fetch(`${apiUrl}/api/admin/themes/${themeId}/settings/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      if (data.warnings?.length) {
        setImportError(`Import completed with warnings:\n${data.warnings.join('\n')}`);
      }
      setShowImportModal(false);
      setImportJson('');
      setSuccess('Settings imported successfully.');
      setTimeout(() => setSuccess(null), 3000);
      await loadSettings();
    } catch (err: any) {
      setImportError(err.message);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportJson(ev.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  // ─── Field Value Updater ───
  const updateFieldValue = (sectionKey: string, fieldKey: string, value: any) => {
    setValues(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [fieldKey]: value,
      },
    }));
  };

  // ─── Render Field ───
  const renderField = (sectionKey: string, fieldKey: string, field: ThemeSettingsField) => {
    const value = values[sectionKey]?.[fieldKey] ?? field.default;

    return (
      <div key={fieldKey} style={{
        display: 'flex', flexDirection: 'column', gap: '0.35rem',
        padding: '1rem 0', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>{field.label}</label>
          {field.required && <span style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.75rem' }}>Required</span>}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.5rem 0' }}>
          {field.description}
        </p>

        {field.type === 'color' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => updateFieldValue(sectionKey, fieldKey, e.target.value)}
              style={{ width: 40, height: 40, border: 'none', borderRadius: 'var(--radius-md, 8px)', cursor: 'pointer', padding: 0, background: 'transparent' }}
            />
            <input
              type="text"
              className="search-filter-input"
              value={value || ''}
              onChange={(e) => updateFieldValue(sectionKey, fieldKey, e.target.value)}
              style={{ flex: 1, maxWidth: 200, boxSizing: 'border-box' }}
              placeholder="#000000"
            />
          </div>
        )}

        {field.type === 'text' && (
          <input
            type="text"
            className="search-filter-input"
            value={value || ''}
            onChange={(e) => updateFieldValue(sectionKey, fieldKey, e.target.value)}
            style={{ maxWidth: 400, boxSizing: 'border-box' }}
          />
        )}

        {field.type === 'url' && (
          <input
            type="url"
            className="search-filter-input"
            value={value || ''}
            onChange={(e) => updateFieldValue(sectionKey, fieldKey, e.target.value)}
            style={{ maxWidth: 400, boxSizing: 'border-box' }}
            placeholder="https://..."
          />
        )}

        {field.type === 'number' && (
          <input
            type="number"
            className="search-filter-input"
            value={value ?? ''}
            min={field.min}
            max={field.max}
            onChange={(e) => updateFieldValue(sectionKey, fieldKey, Number(e.target.value))}
            style={{ maxWidth: 200, boxSizing: 'border-box' }}
          />
        )}

        {field.type === 'media' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="text"
              className="search-filter-input"
              value={value || ''}
              onChange={(e) => updateFieldValue(sectionKey, fieldKey, e.target.value)}
              style={{ flex: 1, maxWidth: 400, boxSizing: 'border-box' }}
              placeholder="Media UUID or asset reference"
            />
            {value && (
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md, 8px)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden',
              }}>
                🖼️
              </div>
            )}
          </div>
        )}

        {field.type === 'boolean' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <div
              onClick={() => updateFieldValue(sectionKey, fieldKey, !value)}
              style={{
                width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                background: value ? 'var(--primary, #3b82f6)' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3, transition: 'left 0.2s',
                left: value ? 23 : 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
            <span style={{ fontSize: '0.85rem' }}>{value ? 'Enabled' : 'Disabled'}</span>
          </label>
        )}

        {field.type === 'select' && field.options && (
          <select
            className="filter-select"
            value={value || ''}
            onChange={(e) => updateFieldValue(sectionKey, fieldKey, e.target.value)}
            style={{ maxWidth: 300 }}
          >
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {field.type === 'textarea' && (
          <textarea
            className="search-filter-input"
            value={value || ''}
            onChange={(e) => updateFieldValue(sectionKey, fieldKey, e.target.value)}
            rows={field.label.toLowerCase().includes('css') ? 8 : 4}
            style={{
              maxWidth: 600, boxSizing: 'border-box', resize: 'vertical',
              fontFamily: field.label.toLowerCase().includes('css') ? 'monospace' : 'inherit',
            }}
          />
        )}

        {/* Dynamic Contextual Helper Hints for declared theme regions */}
        {sectionKey === 'layout' && fieldKey === 'sidebarPosition' && (
          regions.sidebar ? (
            <div style={{
              marginTop: '0.75rem',
              padding: '1rem',
              fontSize: '0.8rem',
              lineHeight: '1.4',
              color: 'var(--text)',
              background: 'rgba(59, 130, 246, 0.06)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-md, 8px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--primary, #3b82f6)' }}>
                <LayoutTemplate size={14} />
                <span>{regions.sidebar.label || 'Main Sidebar'}</span>
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                {regions.sidebar.description || 'Area visual yang disediakan oleh theme aktif.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.25rem 0.5rem', marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--text-muted)' }}>Status:</strong>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Theme-provided content</span>

                <strong style={{ color: 'var(--text-muted)' }}>Current Behavior:</strong>
                <span>The sidebar content is currently supplied by the active theme template.</span>

                <strong style={{ color: 'var(--text-muted)' }}>Layout Control:</strong>
                <span>This setting only changes the sidebar position (left, right, or hidden).</span>

                <strong style={{ color: 'var(--text-muted)' }}>Customization:</strong>
                <span style={{ color: '#ef4444' }}>Sidebar content cannot yet be customized from the CMS.</span>
              </div>
            </div>
          ) : (
            <div style={{
              marginTop: '0.75rem',
              padding: '1rem',
              fontSize: '0.8rem',
              lineHeight: '1.4',
              color: 'var(--text)',
              background: 'rgba(245, 158, 11, 0.06)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 'var(--radius-md, 8px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#f59e0b' }}>
                <AlertCircle size={14} />
                <span>No Sidebar Region</span>
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                The active theme does not declare a sidebar area.
              </p>
              <p style={{ margin: 0, fontWeight: 500 }}>
                Changing Sidebar Position may not affect the public layout.
              </p>
            </div>
          )
        )}

        {sectionKey === 'footer' && fieldKey === 'footerColumns' && (() => {
          const footerRegs = Object.keys(regions).filter(k => k.startsWith('footer_'));
          return footerRegs.length > 0 ? (
            <div style={{
              marginTop: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.75rem',
              color: 'var(--text)', background: 'rgba(16, 185, 129, 0.08)',
              borderLeft: '3px solid #10b981', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.35rem'
            }}>
              <span>ℹ️ <strong>Active Theme Areas:</strong> Declared footer areas: <strong>{footerRegs.join(', ')}</strong>.</span>
            </div>
          ) : (
            <div style={{
              marginTop: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.75rem',
              color: 'var(--text-muted)', background: 'rgba(245, 158, 11, 0.08)',
              borderLeft: '3px solid #f59e0b', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.35rem'
            }}>
              <span>⚠️ Current theme does not declare any footer areas, so this setting may not affect the public layout.</span>
            </div>
          );
        })()}
      </div>
    );
  };

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="route-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={32} />
          <p style={{ marginTop: '1rem' }}>Loading theme settings...</p>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="route-view">
        <button className="t-action-btn" onClick={onBack} style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Themes
        </button>
        <div className="card glass" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={32} style={{ color: 'var(--color-danger, #ef4444)', marginBottom: '1rem' }} />
          <h3>No Settings Schema</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            This theme does not have a <code>settings-schema.json</code> file.
            {error && <><br />{error}</>}
          </p>
        </div>
      </div>
    );
  }

// ───────────────────────────────────────────────
// Visual layout hints using ASCII art blocks
// ───────────────────────────────────────────────
const sectionVisualHints: Record<string, string> = {
  header: `┌───────────────────────────────────────────────┐
│ [Logo / Title]       [Search Icon] [Menu Toggle]│
└───────────────────────────────────────────────┘`,

  navigation: `┌───────────────────────────────────────────────┐
│ Desktop:  Link 1   Link 2   Link 3            │
│ Mobile:   [ ☰ ] Menu Toggle Button            │
└───────────────────────────────────────────────┘`,

  homepage: `┌───────────────────────────────────────────────┐
│            WELCOME HERO BANNER                │
│         Dynamic Heading Title & Desc          │
│                [Call-to-Action]               │
└───────────────────────────────────────────────┘`,

  footer: `┌───────────────────────────────────────────────┐
│ Column 1          Column 2           Column 3 │
│ (About Text)      (Quick Links)      (Social) │
│ ───────────────────────────────────────────── │
│ © Copyright notice, Site name & Year          │
└───────────────────────────────────────────────┘`,

  layout: `┌───────────────────┬───────────────────────────┐
│                   │                           │
│   [Left Sidebar]  │       [Main Content]      │
│   (Widget Area)   │       (Body Text)         │
│                   │                           │
└───────────────────┴───────────────────────────┘`,
};

  const sectionKeys = Object.keys(schema.sections);
  const currentSection = schema.sections[activeSection];

  // Group sections by category
  const groupedSections: Record<string, string[]> = {};
  for (const key of sectionKeys) {
    const meta = sectionMeta[key] || { icon: Settings2, group: 'ADVANCED' };
    if (!groupedSections[meta.group]) groupedSections[meta.group] = [];
    groupedSections[meta.group].push(key);
  }

  const groupOrder = ['CORE', 'SITE', 'CONTENT', 'EXTENDED', 'ADVANCED'];

  return (
    <div className="route-view theme-settings-view">
      {/* Top Bar */}
      <div className="theme-settings-toolbar" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap',
      }}>
        <div className="theme-settings-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="t-action-btn" onClick={onBack}>
            <ArrowLeft size={16} />
          </button>
          <h2 style={{ margin: 0 }}>
            Customize: <span style={{ color: 'var(--primary)' }}>{themeName || themeId}</span>
          </h2>
          <span style={{
            fontSize: '0.7rem', background: 'var(--bg-elevated)', padding: '0.15rem 0.5rem',
            borderRadius: '4px', color: 'var(--text-muted)',
          }}>
            Schema v{schema.schemaVersion}
          </span>
        </div>
        <div className="theme-settings-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="t-action-btn" onClick={handleExport} title="Export Settings">
            <Download size={14} /> Export
          </button>
          <button className="t-action-btn" onClick={() => setShowImportModal(true)} title="Import Settings">
            <Upload size={14} /> Import
          </button>
          <button className="t-action-btn" onClick={handleReset} title="Reset to Defaults">
            <RotateCw size={14} /> Reset
          </button>
          <button className="btn-primary-action" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Settings</>}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="tax-message error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="tax-message success" style={{ marginBottom: '1rem' }}>
          <CheckCircle size={16} /> <span>{success}</span>
        </div>
      )}

      {/* Split Layout: Sidebar + Content */}
      <div className="theme-settings-layout" style={{
        display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem',
        minHeight: '60vh',
      }}>
        {/* Sidebar: Section Tabs */}
        <div className="card glass theme-settings-navigation" style={{
          padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
          maxHeight: '75vh', overflowY: 'auto',
        }}>
          {groupOrder.map((groupName) => {
            const keys = groupedSections[groupName];
            if (!keys || keys.length === 0) return null;
            return (
              <div key={groupName} style={{ marginBottom: '0.5rem' }}>
                <div style={{
                  fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--text-muted)',
                  padding: '0.5rem 0.75rem 0.25rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  marginBottom: '0.35rem',
                }}>
                  {groupName}
                </div>
                {keys.map(key => {
                  const section = schema.sections[key];
                  const meta = sectionMeta[key] || { icon: Settings2 };
                  const isActive = activeSection === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveSection(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        width: '100%', padding: '0.5rem 0.75rem',
                        border: 'none', borderRadius: 'var(--radius-md, 8px)',
                        background: isActive ? 'var(--primary)' : 'transparent',
                        color: isActive ? '#fff' : 'var(--text)',
                        cursor: 'pointer', fontSize: '0.85rem', fontWeight: isActive ? 600 : 400,
                        textAlign: 'left', transition: 'all 0.15s',
                        marginBottom: '2px',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', color: isActive ? '#fff' : 'var(--primary)' }}>
                        <meta.icon size={16} />
                      </span>
                      <span style={{ flex: 1 }}>{section.label}</span>
                      {isActive && <ChevronRight size={14} />}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Fallback for any other groups not in groupOrder */}
          {Object.entries(groupedSections).map(([groupName, keys]) => {
            if (groupOrder.includes(groupName)) return null;
            return (
              <div key={groupName} style={{ marginBottom: '0.5rem' }}>
                <div style={{
                  fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--text-muted)',
                  padding: '0.5rem 0.75rem 0.25rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  marginBottom: '0.35rem',
                }}>
                  {groupName}
                </div>
                {keys.map(key => {
                  const section = schema.sections[key];
                  const meta = sectionMeta[key] || { icon: Settings2 };
                  const isActive = activeSection === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveSection(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        width: '100%', padding: '0.5rem 0.75rem',
                        border: 'none', borderRadius: 'var(--radius-md, 8px)',
                        background: isActive ? 'var(--primary)' : 'transparent',
                        color: isActive ? '#fff' : 'var(--text)',
                        cursor: 'pointer', fontSize: '0.85rem', fontWeight: isActive ? 600 : 400,
                        textAlign: 'left', transition: 'all 0.15s',
                        marginBottom: '2px',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', color: isActive ? '#fff' : 'var(--primary)' }}>
                        <meta.icon size={16} />
                      </span>
                      <span style={{ flex: 1 }}>{section.label}</span>
                      {isActive && <ChevronRight size={14} />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Right Panel: Dynamic Form */}
        <div className="card glass theme-settings-content" style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '75vh' }}>
          {currentSection ? (
            <>
              <h3 style={{ margin: '0 0 0.25rem 0' }}>{currentSection.label}</h3>
              {currentSection.description && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                  {currentSection.description}
                </p>
              )}

              {/* Compact Visual Areas Card */}
              {Object.keys(regions).length > 0 && (
                <div style={{
                  background: 'var(--bg-elevated, rgba(255,255,255,0.02))',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <LayoutTemplate size={12} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Visual Areas declared by theme</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.4rem' }}>
                    {Object.entries(regions).map(([key, reg]) => (
                      <div
                        key={key}
                        title={reg.description || 'No description provided.'}
                        style={{
                          fontSize: '0.7rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '0.1rem 0.35rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          cursor: 'help',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{key}</span>
                        <span style={{ color: 'var(--text-muted)' }}>({reg.label})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lightweight visual layout hints */}
              {sectionVisualHints[activeSection] && (
                <div style={{
                  background: 'var(--bg-elevated, rgba(255,255,255,0.02))',
                  border: '1px dashed var(--border, rgba(0,0,0,0.15))',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Visual Structure Guide:
                  </div>
                  <pre style={{
                    margin: 0,
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    lineHeight: '1.2rem',
                    color: 'var(--primary, #3b82f6)',
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                  }}>
                    {sectionVisualHints[activeSection]}
                  </pre>
                </div>
              )}

              <div>
                {Object.entries(currentSection.fields).map(([fieldKey, field]) =>
                  renderField(activeSection, fieldKey, field)
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <p>Select a section from the sidebar to begin customizing.</p>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="card glass" style={{ maxWidth: 500, width: '90%', padding: '2rem' }}>
            <h3 style={{ marginTop: 0 }}>Import Theme Settings</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Upload a previously exported <code>{themeId}-settings.json</code> file or paste the JSON content below.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <input type="file" accept=".json" onChange={handleFileImport} />
            </div>

            <textarea
              className="search-filter-input"
              rows={8}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='Paste JSON content here...'
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '0.8rem' }}
            />

            {importError && (
              <div className="tax-message error" style={{ marginTop: '0.75rem' }}>
                <AlertCircle size={14} /> <span style={{ whiteSpace: 'pre-wrap' }}>{importError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="t-action-btn" onClick={() => { setShowImportModal(false); setImportJson(''); setImportError(null); }}>
                Cancel
              </button>
              <button className="btn-primary-action" onClick={handleImport} disabled={!importJson.trim()}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
