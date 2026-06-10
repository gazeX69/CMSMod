import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

interface RenderResponse {
  success: boolean;
  html: string;
  seo?: {
    title?: string;
    description?: string;
    canonicalUrl?: string;
  };
  theme?: {
    id: string;
    name: string;
    template: string;
  };
}

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';

function getCurrentPublicPath() {
  return `${window.location.pathname}${window.location.search}`;
}

function App() {
  const [path, setPath] = useState(getCurrentPublicPath);
  const [rendered, setRendered] = useState<RenderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const renderUrl = useMemo(() => {
    const url = new URL(`${apiBase}/api/public/render`);
    url.searchParams.set('path', window.location.pathname || '/');

    const query = new URLSearchParams(window.location.search);
    const searchQuery = query.get('q');
    if (searchQuery) {
      url.searchParams.set('q', searchQuery);
    }

    return url.toString();
  }, [path]);

  useEffect(() => {
    const syncPath = () => setPath(getCurrentPublicPath());
    window.addEventListener('popstate', syncPath);

    const clickHandler = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      const targetAttr = link.getAttribute('target');
      if (!href || targetAttr === '_blank' || href.startsWith('http') || href.startsWith('mailto:')) return;

      event.preventDefault();
      window.history.pushState(null, '', href);
      syncPath();
    };

    document.addEventListener('click', clickHandler);

    return () => {
      window.removeEventListener('popstate', syncPath);
      document.removeEventListener('click', clickHandler);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(renderUrl);
        const data = await response.json();
        if (cancelled) return;

        setRendered(data);
        document.title = data.seo?.title || 'ModernCMS';

        const description = document.querySelector('meta[name="description"]') || document.createElement('meta');
        description.setAttribute('name', 'description');
        description.setAttribute('content', data.seo?.description || '');
        if (!description.parentElement) document.head.appendChild(description);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render public page');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [renderUrl]);

  if (loading) {
    return (
      <main className="public-shell public-state">
        <p>Loading public page...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="public-shell public-state">
        <h1>Public Renderer Error</h1>
        <p>{error}</p>
      </main>
    );
  }

  return (
    <div className="public-shell" data-theme={rendered?.theme?.id || 'default'}>
      <div
        className="theme-render-root"
        dangerouslySetInnerHTML={{ __html: rendered?.html || '' }}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
