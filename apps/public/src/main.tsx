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
    query.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    return url.toString();
  }, [path]);

  useEffect(() => {
    const syncPath = () => setPath(getCurrentPublicPath());
    window.addEventListener('popstate', syncPath);

    const clickHandler = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      // Handle mobile menu toggle button click
      const toggleBtn = target.closest('.mobile-menu-toggle');
      if (toggleBtn) {
        event.preventDefault();
        const header = target.closest('.site-header');
        if (header) {
          const isOpen = header.classList.toggle('is-menu-open');
          toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        return;
      }

      const link = target.closest('a');
      if (!link) return;

      // Close mobile menu if open when clicking a link
      const header = document.querySelector('.site-header');
      if (header) {
        header.classList.remove('is-menu-open');
        const toggle = header.querySelector('.mobile-menu-toggle');
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'false');
        }
      }

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

  useEffect(() => {
    if (loading || !rendered) return;

    const container = document.querySelector('.theme-render-root');
    if (!container) return;

    const scripts = container.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [rendered, loading]);

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
