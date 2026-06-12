import type { AdminRuntimeSdk } from '@modern-cms/plugin-sdk';
import SeoInspector, { bindSeoInspectorSdk } from './SeoInspector';
import { getSeoEditorDraft } from './editorStore';

const apiFetch = (path: string, options: RequestInit = {}) => fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000'}${path}`, { ...options, credentials: 'include' });

export function registerSeoEditorIntegration(sdk: AdminRuntimeSdk) {
  bindSeoInspectorSdk(sdk);
  sdk.editor.inspector.register({ id: 'search-appearance', title: 'SEO Suite', order: 30, component: SeoInspector });
  sdk.editor.document.registerSupplementalSave(async (context) => {
    const response = await apiFetch(`/api/seo/content/${context.contentUuid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(getSeoEditorDraft()) });
    if (!response.ok) throw new Error('SEO metadata save failed');
  });
  sdk.editor.publish.registerCheck((context) => {
    const draft = getSeoEditorDraft();
    if (draft.robots.includes('noindex')) return { status: 'warning', message: 'This content is configured as noindex.' };
    if (!draft.description && !context.excerpt) return { status: 'warning', message: 'Add a meta description or excerpt before publishing.' };
    if (!draft.focus_keyword) return { status: 'warning', message: 'No focus keyword has been configured.' };
    return { status: 'pass' };
  });
}
