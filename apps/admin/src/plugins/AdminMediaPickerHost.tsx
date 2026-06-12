import { useEffect, useState } from 'react';
import type { MediaAsset } from '@modern-cms/plugin-sdk';
import { resolveAdminCapability, setAdminMediaPickerHost } from './adminRuntimeSdk';

type PickerOptions = { mimeTypes?: string[]; multiple?: boolean };
type PickerProvider = {
  render(props: {
    apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
    options?: PickerOptions;
    onSelect(value: MediaAsset | MediaAsset[] | null): void;
    onCancel(): void;
  }): React.ReactNode;
};

type PendingRequest = {
  options?: PickerOptions;
  resolve(value: MediaAsset | MediaAsset[] | null): void;
};

export function AdminMediaPickerHost() {
  const [request, setRequest] = useState<PendingRequest | null>(null);

  useEffect(() => {
    setAdminMediaPickerHost((options) => new Promise((resolve) => setRequest({ options, resolve })));
    return () => setAdminMediaPickerHost(null);
  }, []);

  if (!request) return null;
  const provider = resolveAdminCapability<PickerProvider>('media.picker');

  const close = (value: MediaAsset | MediaAsset[] | null) => {
    request.resolve(value);
    setRequest(null);
  };

  if (!provider) {
    close(null);
    return null;
  }

  const apiFetch = (path: string, options: RequestInit = {}) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';
    return fetch(`${apiUrl}${path}`, { ...options, credentials: 'include' });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Media picker" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15, 23, 42, .72)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: 'min(1100px, 96vw)', maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 12, background: 'var(--bg-card)', boxShadow: '0 24px 70px rgba(0,0,0,.55)' }}>
        {provider.render({ apiFetch, options: request.options, onSelect: close, onCancel: () => close(null) })}
      </div>
    </div>
  );
}
