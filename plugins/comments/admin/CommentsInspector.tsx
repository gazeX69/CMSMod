import React, { useEffect, useState } from 'react';
import type { AdminRuntimeSdk } from '@modern-cms/plugin-sdk';
import { MessageSquare, Loader2 } from 'lucide-react';

let sdk: AdminRuntimeSdk | null = null;
export function bindCommentsInspectorSdk(value: AdminRuntimeSdk) {
  sdk = value;
}

const apiFetch = (path: string, options: RequestInit = {}) =>
  fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000'}${path}`, {
    ...options,
    credentials: 'include',
  });

// A global map to hold the state of comments toggles per contentUuid
export const commentToggles = new Map<string, boolean>();

export default function CommentsInspector() {
  const document = sdk?.editor.document.getContext() || null;
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [globalDefaults, setGlobalDefaults] = useState<{ page: boolean; article: boolean }>({
    page: false,
    article: true,
  });

  // Load global defaults
  useEffect(() => {
    let active = true;
    const loadDefaults = async () => {
      try {
        const res = await apiFetch('/api/admin/settings/scope/comments');
        if (res.ok && active) {
          const data = await res.json();
          const settingsMap: Record<string, string> = {};
          if (Array.isArray(data)) {
            data.forEach((item: any) => {
              settingsMap[item.key] = item.value;
            });
          }
          setGlobalDefaults({
            page: settingsMap['comments.default_enabled_page'] === 'true',
            article: settingsMap['comments.default_enabled_article'] !== 'false', // default is true
          });
        }
      } catch (err) {
        console.error('Failed to load global comments defaults', err);
      }
    };
    loadDefaults();
    return () => {
      active = false;
    };
  }, []);

  // Fetch or calculate enabled state for the current document
  useEffect(() => {
    if (!document?.contentUuid) {
      // New content (not saved yet). Use default for this content type.
      const defaultVal = document?.type === 'page' ? globalDefaults.page : globalDefaults.article;
      setEnabled(defaultVal);
      // Store in global map so supplemental save knows what to save
      if (document?.type) {
        commentToggles.set('__new_draft__', defaultVal);
      }
      return;
    }

    // Existing content
    const cached = commentToggles.get(document.contentUuid);
    if (cached !== undefined) {
      setEnabled(cached);
      return;
    }

    setLoading(true);
    apiFetch(`/api/comments/admin/metadata/${document.contentUuid}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.enabled !== null) {
            setEnabled(data.enabled);
            commentToggles.set(document.contentUuid, data.enabled);
          } else {
            // No override found, use content-type default
            const defaultVal = document.type === 'page' ? globalDefaults.page : globalDefaults.article;
            setEnabled(defaultVal);
            commentToggles.set(document.contentUuid, defaultVal);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [document?.contentUuid, document?.type, globalDefaults]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (document?.contentUuid) {
      commentToggles.set(document.contentUuid, checked);
    } else {
      commentToggles.set('__new_draft__', checked);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', color: 'var(--text-muted)' }}>
        <Loader2 size={16} className="animate-spin" />
        <span>Loading discussion settings...</span>
      </div>
    );
  }

  const defaultStatusLabel = document?.type === 'page' 
    ? (globalDefaults.page ? 'Aktif' : 'Nonaktif')
    : (globalDefaults.article ? 'Aktif' : 'Nonaktif');

  return (
    <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          id="comments-enabled-checkbox"
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <label htmlFor="comments-enabled-checkbox" style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, userSelect: 'none' }}>
          Aktifkan Komentar
        </label>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
        {enabled ? (
          <span style={{ color: '#34d399' }}>✓ Komentar diaktifkan untuk {document?.type === 'page' ? 'halaman' : 'artikel'} ini.</span>
        ) : (
          <span style={{ color: '#f87171' }}>✗ Komentar dinonaktifkan untuk {document?.type === 'page' ? 'halaman' : 'artikel'} ini.</span>
        )}
        <div style={{ marginTop: '0.25rem' }}>
          Default global untuk {document?.type === 'page' ? 'halaman' : 'artikel'}: <strong>{defaultStatusLabel}</strong>.
        </div>
      </div>
    </div>
  );
}
