import { useEffect, useMemo, useState } from 'react';
import type { AdminRuntimeSdk, EditorDocumentContext } from '@modern-cms/plugin-sdk';
import { CheckCircle2, CircleAlert, Loader2, Save, Search, Share2, SlidersHorizontal } from 'lucide-react';
import { emptySeoDraft, getLoadedSeoUuid, getSeoEditorDraft, patchSeoEditorDraft, setSeoEditorDraft, type SeoEditorDraft } from './editorStore';

let sdk: AdminRuntimeSdk | null = null;
export function bindSeoInspectorSdk(value: AdminRuntimeSdk) { sdk = value; }

const apiFetch = (path: string, options: RequestInit = {}) => fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000'}${path}`, { ...options, credentials: 'include' });
const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function calculateScore(document: EditorDocumentContext | null, draft: SeoEditorDraft) {
  if (!document) return { score: 0, checks: [] as Array<{ ok: boolean; label: string }> };
  const keyword = draft.focus_keyword.toLowerCase();
  const text = stripHtml(document.bodyHtml).toLowerCase();
  const title = (draft.title || document.title).toLowerCase();
  const description = (draft.description || document.excerpt).toLowerCase();
  const checks = [
    { ok: title.length >= 30 && title.length <= 60, label: 'Title is 30-60 characters' },
    { ok: description.length >= 110 && description.length <= 160, label: 'Description is 110-160 characters' },
    { ok: Boolean(keyword), label: 'Focus keyword is configured' },
    { ok: Boolean(keyword) && title.includes(keyword), label: 'Keyword appears in title' },
    { ok: Boolean(keyword) && description.includes(keyword), label: 'Keyword appears in description' },
    { ok: Boolean(keyword) && document.slug.replace(/-/g, ' ').toLowerCase().includes(keyword), label: 'Keyword appears in slug' },
    { ok: text.split(/\s+/).length >= 300, label: 'Content has at least 300 words' },
    { ok: /<h[2-4][^>]*>/i.test(document.bodyHtml), label: 'Content has subheadings' },
  ];
  return { score: Math.round(checks.filter((check) => check.ok).length / checks.length * 100), checks };
}

export default function SeoInspector() {
  const document = sdk?.editor.document.getContext() || null;
  const [draft, setDraft] = useState<SeoEditorDraft>(getSeoEditorDraft());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'social' | 'advanced'>('general');
  const [message, setMessage] = useState('');
  const analysis = useMemo(() => calculateScore(document, draft), [document?.title, document?.slug, document?.bodyHtml, draft]);

  useEffect(() => {
    if (!document?.contentUuid || getLoadedSeoUuid() === document.contentUuid) return;
    setLoading(true);
    apiFetch(`/api/seo/content/${document.contentUuid}`).then(async (response) => {
      if (!response.ok) throw new Error('Unable to load SEO metadata');
      const data = await response.json();
      const next = { ...emptySeoDraft, ...(data.metadata || {}) };
      setSeoEditorDraft(next, document.contentUuid);
      setDraft(next);
    }).catch((error) => setMessage(error.message)).finally(() => setLoading(false));
  }, [document?.contentUuid]);

  const update = (value: Partial<SeoEditorDraft>) => { const next = { ...draft, ...value }; setDraft(next); patchSeoEditorDraft(value); };
  const save = async () => {
    if (!document?.contentUuid) return setMessage('Save the content draft first, then save SEO metadata.');
    setSaving(true);
    setMessage('Saving...');
    try {
      const response = await apiFetch(`/api/seo/content/${document.contentUuid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      setMessage(response.ok ? 'SEO metadata saved.' : 'SEO metadata could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const previewTitle = draft.title || document?.title || 'Untitled page';
  const previewDescription = draft.description || document?.excerpt || 'Add a concise description for search results.';
  const previewUrl = draft.canonical || `/${document?.slug || 'page'}`;

  return (
    <div className="seo-inspector">
      <div className={`seo-score seo-score--${analysis.score >= 80 ? 'good' : analysis.score >= 50 ? 'medium' : 'poor'}`}><strong>{analysis.score}</strong><span>SEO score</span></div>
      <div className="seo-tabs">
        <button type="button" className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')}><Search size={13} /> General</button>
        <button type="button" className={activeTab === 'social' ? 'active' : ''} onClick={() => setActiveTab('social')}><Share2 size={13} /> Social</button>
        <button type="button" className={activeTab === 'advanced' ? 'active' : ''} onClick={() => setActiveTab('advanced')}><SlidersHorizontal size={13} /> Advanced</button>
      </div>
      {loading ? <div className="seo-inspector-loading"><Loader2 size={16} className="seo-spin" /> Loading SEO data...</div> : activeTab === 'general' ? <>
        <div className="seo-snippet"><span>{previewUrl}</span><strong>{previewTitle}</strong><p>{previewDescription}</p></div>
        <SeoField label="Focus keyword" value={draft.focus_keyword} onChange={(value) => update({ focus_keyword: value })} placeholder="Primary search phrase" />
        <SeoField label={`SEO title (${previewTitle.length}/60)`} value={draft.title} onChange={(value) => update({ title: value })} placeholder={document?.title || ''} />
        <SeoField textarea label={`Meta description (${previewDescription.length}/160)`} value={draft.description} onChange={(value) => update({ description: value })} placeholder={document?.excerpt || ''} />
        <div className="seo-checks">{analysis.checks.map((check) => <div key={check.label} className={check.ok ? 'pass' : 'fail'}>{check.ok ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}<span>{check.label}</span></div>)}</div>
      </> : activeTab === 'social' ? <>
        <div className="seo-social-preview">
          <div className="seo-social-preview-image">{draft.og_image_url ? <img src={draft.og_image_url} alt="Social preview" /> : <Share2 size={22} />}</div>
          <div><strong>{draft.og_title || previewTitle}</strong><p>{draft.og_description || previewDescription}</p><span>{previewUrl}</span></div>
        </div>
        <SeoField label="Open Graph title" value={draft.og_title} onChange={(value) => update({ og_title: value })} placeholder={previewTitle} />
        <SeoField textarea label="Open Graph description" value={draft.og_description} onChange={(value) => update({ og_description: value })} placeholder={previewDescription} />
        <SeoField label="Social image URL" value={draft.og_image_url} onChange={(value) => update({ og_image_url: value, twitter_image_url: value })} placeholder="https://..." />
        <SeoField label="Twitter title" value={draft.twitter_title} onChange={(value) => update({ twitter_title: value })} placeholder={draft.og_title || previewTitle} />
      </> : <>
        <SeoField label="Canonical URL" value={draft.canonical} onChange={(value) => update({ canonical: value })} placeholder="Use generated canonical" />
        <label className="seo-field"><span>Robots</span><select value={draft.robots} onChange={(event) => update({ robots: event.target.value })}><option value="">Use global default</option><option value="index,follow">Index, follow</option><option value="noindex,follow">Noindex, follow</option><option value="noindex,nofollow">Noindex, nofollow</option></select></label>
        <label className="seo-field"><span>Schema type</span><select value={draft.schema_type} onChange={(event) => update({ schema_type: event.target.value })}><option>Article</option><option>BlogPosting</option><option>NewsArticle</option><option>WebPage</option><option>FAQPage</option></select></label>
        <SeoField label="Breadcrumb title" value={draft.breadcrumb_title} onChange={(value) => update({ breadcrumb_title: value })} placeholder={document?.title || ''} />
        <label className="seo-toggle"><input type="checkbox" checked={draft.sitemap_exclude} onChange={(event) => update({ sitemap_exclude: event.target.checked })} /> Exclude from XML sitemap</label>
      </>}
      <button type="button" className="seo-save-button" onClick={save} disabled={saving}>{saving ? <><Loader2 size={14} className="seo-spin" /> Saving...</> : <><Save size={14} /> Save SEO metadata</>}</button>
      {message && <small className={message.includes('saved') ? 'seo-message-success' : ''}>{message}</small>}
    </div>
  );
}

function SeoField({ label, value, onChange, placeholder, textarea = false }: { label: string; value: string; onChange(value: string): void; placeholder?: string; textarea?: boolean }) {
  return <label className="seo-field"><span>{label}</span>{textarea ? <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /> : <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}</label>;
}
