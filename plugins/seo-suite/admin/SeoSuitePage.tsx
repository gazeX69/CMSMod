import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Gauge,
  Globe2,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  SearchX,
  Settings,
  Trash2,
} from 'lucide-react';
import './seo-suite.css';

type Props = { apiFetch(path: string, options?: RequestInit): Promise<Response> };
type Redirect = { id: number; sourcePath: string; targetUrl: string; statusCode: number; isActive: boolean; hitCount: number };
type Notice = { tone: 'success' | 'error'; text: string } | null;

export default function SeoSuitePage({ apiFetch }: Props) {
  const [tab, setTab] = useState<'overview' | 'redirects' | 'settings'>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [settingsData, setSettingsData] = useState<Record<string, string>>({});
  const [publicSiteUrl, setPublicSiteUrl] = useState('http://localhost:5174');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [newRedirect, setNewRedirect] = useState({ sourcePath: '', targetUrl: '', statusCode: 301 });

  const load = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const [overviewRes, redirectsRes, settingsRes, publicSettingsRes] = await Promise.all([
        apiFetch('/api/seo/admin/overview'),
        apiFetch('/api/seo/admin/redirects'),
        apiFetch('/api/seo/admin/settings'),
        apiFetch('/api/settings'),
      ]);
      if (!overviewRes.ok || !redirectsRes.ok || !settingsRes.ok) throw new Error('SEO data could not be loaded.');
      setOverview(await overviewRes.json());
      setRedirects((await redirectsRes.json()).items || []);
      setSettingsData(await settingsRes.json());
      if (publicSettingsRes.ok) {
        const publicSettings = await publicSettingsRes.json();
        const siteUrl = publicSettings.find((item: any) => item.key === 'system.site_url')?.value;
        if (siteUrl) setPublicSiteUrl(String(siteUrl).replace(/\/$/, ''));
      }
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'SEO data could not be loaded.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const saveSettings = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const response = await apiFetch('/api/seo/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });
      if (!response.ok) throw new Error('Settings could not be saved.');
      setNotice({ tone: 'success', text: 'SEO settings saved successfully.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Settings could not be saved.' });
    } finally {
      setSaving(false);
    }
  };

  const addRedirect = async () => {
    if (!newRedirect.sourcePath.trim() || !newRedirect.targetUrl.trim()) {
      setNotice({ tone: 'error', text: 'Source path and target URL are required.' });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const response = await apiFetch('/api/seo/admin/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRedirect),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Redirect could not be created.');
      setNewRedirect({ sourcePath: '', targetUrl: '', statusCode: 301 });
      await load();
      setNotice({ tone: 'success', text: 'Redirect created successfully.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Redirect could not be created.' });
    } finally {
      setSaving(false);
    }
  };

  const deleteRedirect = async (id: number) => {
    if (!confirm('Delete this redirect?')) return;
    const response = await apiFetch(`/api/seo/admin/redirects/${id}`, { method: 'DELETE' });
    if (response.ok) {
      setRedirects((items) => items.filter((item) => item.id !== id));
      setNotice({ tone: 'success', text: 'Redirect deleted.' });
    } else {
      setNotice({ tone: 'error', text: 'Redirect could not be deleted.' });
    }
  };

  return (
    <div className="seo-page">
      <header className="seo-page-header">
        <div className="seo-page-heading">
          <span className="seo-kicker"><Globe2 size={13} /> Search optimization</span>
          <h1>SEO Suite</h1>
          <p>Manage search appearance, content quality, indexing, structured data, and redirects.</p>
        </div>
        <button type="button" className="seo-button seo-button--secondary" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'seo-spin' : ''} />
          Refresh
        </button>
      </header>

      <nav className="seo-page-tabs" aria-label="SEO Suite sections">
        <button type="button" className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><Gauge size={15} /> Overview</button>
        <button type="button" className={tab === 'redirects' ? 'active' : ''} onClick={() => setTab('redirects')}><Link2 size={15} /> Redirects <span className="seo-tab-count">{redirects.length}</span></button>
        <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Settings size={15} /> Settings</button>
      </nav>

      {notice && <div className={`seo-notice seo-notice--${notice.tone}`}>{notice.tone === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}<span>{notice.text}</span></div>}

      {loading ? (
        <div className="seo-loading"><Loader2 size={22} className="seo-spin" /><span>Loading SEO workspace...</span></div>
      ) : tab === 'overview' ? (
        <Overview data={overview} sitemapUrl={`${publicSiteUrl}/sitemap.xml`} />
      ) : tab === 'redirects' ? (
        <RedirectPanel redirects={redirects} value={newRedirect} saving={saving} onChange={setNewRedirect} onAdd={addRedirect} onDelete={deleteRedirect} />
      ) : (
        <SettingsPanel value={settingsData} saving={saving} onChange={setSettingsData} onSave={saveSettings} />
      )}
    </div>
  );
}

function Overview({ data, sitemapUrl }: { data: any; sitemapUrl: string }) {
  const items = data?.items || [];
  const published = items.filter((item: any) => item.status === 'published').length;
  return (
    <>
      <div className="seo-metrics">
        <Metric icon={<Gauge />} label="Average score" value={`${data?.averageScore || 0}`} suffix="/100" />
        <Metric icon={<FileSearch />} label="Analyzed content" value={data?.analyzed || 0} />
        <Metric icon={<Link2 />} label="Managed redirects" value={data?.redirects || 0} />
        <Metric icon={<Activity />} label="Published coverage" value={published} suffix={`/${items.length}`} />
      </div>
      <section className="seo-panel">
        <div className="seo-panel-heading">
          <div><span className="seo-section-eyebrow">Content audit</span><h2>SEO health</h2><p>The latest content records, scored using actionable on-page checks.</p></div>
          <a className="seo-button seo-button--secondary" href={sitemapUrl} target="_blank" rel="noreferrer">Open sitemap <ExternalLink size={13} /></a>
        </div>
        {items.length === 0 ? (
          <div className="seo-empty"><SearchX size={28} /><h3>No content to analyze</h3><p>Publish or save content and its SEO health will appear here.</p></div>
        ) : (
          <div className="seo-table-wrap">
            <div className="seo-table seo-content-table">
              <div className="seo-table-row seo-table-head"><span>Content</span><span>Focus keyword</span><span>Indexing</span><span>Score</span></div>
              {items.map((item: any) => (
                <div className="seo-table-row" key={item.uuid}>
                  <div className="seo-content-cell"><strong>{item.title}</strong><small>{item.type} <i /> {item.status}</small></div>
                  <span className={item.focusKeyword ? '' : 'seo-muted'}>{item.focusKeyword || 'Not configured'}</span>
                  <code className="seo-code-pill">{item.robots}</code>
                  <span className={`seo-badge ${item.grade}`}>{item.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function RedirectPanel({ redirects, value, saving, onChange, onAdd, onDelete }: { redirects: Redirect[]; value: { sourcePath: string; targetUrl: string; statusCode: number }; saving: boolean; onChange(value: { sourcePath: string; targetUrl: string; statusCode: number }): void; onAdd(): void; onDelete(id: number): void }) {
  return (
    <section className="seo-panel">
      <div className="seo-panel-heading"><div><span className="seo-section-eyebrow">URL management</span><h2>Redirect manager</h2><p>Send visitors and crawlers from retired URLs to the correct destination.</p></div></div>
      <div className="seo-redirect-form">
        <Field label="Source path" value={value.sourcePath} onChange={(sourcePath) => onChange({ ...value, sourcePath })} placeholder="/old-page" />
        <Field label="Target URL" value={value.targetUrl} onChange={(targetUrl) => onChange({ ...value, targetUrl })} placeholder="/new-page or https://..." />
        <label className="seo-setting-field"><span>Redirect type</span><select value={value.statusCode} onChange={(event) => onChange({ ...value, statusCode: Number(event.target.value) })}><option value={301}>301 Permanent</option><option value={302}>302 Temporary</option><option value={307}>307 Temporary</option><option value={308}>308 Permanent</option></select></label>
        <button type="button" className="seo-button seo-button--primary" onClick={onAdd} disabled={saving}>{saving ? <Loader2 size={15} className="seo-spin" /> : <Plus size={15} />} Add redirect</button>
      </div>
      {redirects.length === 0 ? <div className="seo-empty"><Link2 size={28} /><h3>No redirects configured</h3><p>Add a redirect when a public URL changes or content is consolidated.</p></div> : <div className="seo-table-wrap"><div className="seo-table seo-redirect-table"><div className="seo-table-row seo-table-head"><span>Source</span><span>Destination</span><span>Type</span><span>Hits</span><span /></div>{redirects.map((item) => <div className="seo-table-row" key={item.id}><code>{item.sourcePath}</code><span className="seo-target-url">{item.targetUrl}</span><strong>{item.statusCode}</strong><span>{item.hitCount}</span><button type="button" className="seo-icon-button seo-icon-button--danger" aria-label={`Delete redirect ${item.sourcePath}`} onClick={() => onDelete(item.id)}><Trash2 size={14} /></button></div>)}</div></div>}
    </section>
  );
}

function Metric({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: React.ReactNode; suffix?: React.ReactNode }) {
  return <div className="seo-metric"><span className="seo-metric-icon">{icon}</span><div><small>{label}</small><strong>{value}<em>{suffix}</em></strong></div></div>;
}

function SettingsPanel({ value, saving, onChange, onSave }: { value: Record<string, string>; saving: boolean; onChange(value: Record<string, string>): void; onSave(): void }) {
  const set = (key: string, next: string) => onChange({ ...value, [key]: next });
  return (
    <section className="seo-panel seo-settings">
      <div className="seo-panel-heading"><div><span className="seo-section-eyebrow">Global defaults</span><h2>Search appearance</h2><p>Configure fallback templates, crawling controls, and your knowledge graph identity.</p></div><button type="button" className="seo-button seo-button--primary" onClick={onSave} disabled={saving}>{saving ? <Loader2 size={15} className="seo-spin" /> : <Save size={15} />} Save settings</button></div>
      <div className="seo-settings-section"><div className="seo-settings-section-title"><h3>Title and indexing</h3><p>Defaults can be overridden from the SEO inspector on each document.</p></div><div className="seo-settings-grid"><Field label="Title template" hint="Variables: %title%, %sep%, %site%" value={value['seo.title_template'] || '%title% %sep% %site%'} onChange={(v) => set('seo.title_template', v)} /><Field label="Title separator" value={value['seo.title_separator'] || '-'} onChange={(v) => set('seo.title_separator', v)} /><Field label="Default description" textarea value={value['seo.default_description'] || ''} onChange={(v) => set('seo.default_description', v)} /><Field label="Default robots" value={value['seo.default_robots'] || 'index,follow'} onChange={(v) => set('seo.default_robots', v)} /></div></div>
      <div className="seo-settings-section"><div className="seo-settings-section-title"><h3>Knowledge graph identity</h3><p>Used to build Organization and WebSite structured data.</p></div><div className="seo-settings-grid"><Field label="Organization name" value={value['seo.organization_name'] || ''} onChange={(v) => set('seo.organization_name', v)} /><Field label="Organization type" value={value['seo.organization_type'] || 'Organization'} onChange={(v) => set('seo.organization_type', v)} /><Field label="Organization logo URL" value={value['seo.organization_logo'] || ''} onChange={(v) => set('seo.organization_logo', v)} /><Field label="Social profile URLs" hint="JSON array of public profile URLs" textarea value={value['seo.social_profiles'] || '[]'} onChange={(v) => set('seo.social_profiles', v)} /></div></div>
      <div className="seo-settings-section"><div className="seo-settings-section-title"><h3>Discovery endpoints</h3><p>Control the generated files used by search crawlers.</p></div><div className="seo-switch-grid"><Toggle label="XML sitemap" description="Generate and publish /sitemap.xml" checked={(value['seo.sitemap_enabled'] || 'true') === 'true'} onChange={(checked) => set('seo.sitemap_enabled', String(checked))} /><Toggle label="Managed robots.txt" description="Publish crawler rules and sitemap discovery" checked={(value['seo.robots_enabled'] || 'true') === 'true'} onChange={(checked) => set('seo.robots_enabled', String(checked))} /></div></div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder, hint, textarea = false }: { label: string; value: string; onChange(value: string): void; placeholder?: string; hint?: string; textarea?: boolean }) {
  return <label className="seo-setting-field"><span>{label}</span>{textarea ? <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /> : <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}{hint && <small>{hint}</small>}</label>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange(checked: boolean): void }) {
  return <label className="seo-switch"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>;
}
