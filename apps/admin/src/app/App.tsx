import { useEffect, useState } from 'react';
import { SystemInfo } from '@modern-cms/shared';
import Login from './Login.tsx';
import { 
  Plus, Search, Loader2, 
  CheckCircle, 
  FileText, AlertCircle, Folder, Tag, ChevronDown, ChevronRight, ChevronLeft,
  Plug, LayoutDashboard, Files, Palette, Users, Settings,
  ChartLine, Globe, Circle, Bell, HelpCircle, LogOut, ExternalLink,
  UserPlus, Brush, Trash2, RotateCw
} from 'lucide-react';
import './App.css';
import '../layout/AdminShell.css';
import '../layout/SidebarRegion.css';
import '../layout/HeaderRegion.css';
import '../layout/WorkspaceRegion.css';
import '../editor/layout/EditorWorkspace.css';
import '../editor/layout/EditorCanvas.css';
import '../editor/layout/EditorInspector.css';

import { pluginManager } from '../plugins/pluginManager';
import ArticleManager from '../pages/ArticleManager.tsx';

export default function App() {
  const [user, setUser] = useState<{ id: number; username: string; email: string } | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Dashboard status variables
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null);
  const [publicSettings, setPublicSettings] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(false);
  const [metricError, setMetricError] = useState<string | null>(null);

  // Navigation state
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard');
  const [settingsTab, setSettingsTab] = useState<string>('general');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pages sub-view navigation state
  const [pagesSubView, setPagesSubView] = useState<'list' | 'create' | 'edit'>('list');
  // TAMBAHKAN KEMBALI BARIS INI:
  const [postsSubView, setPostsSubView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingPostRouteId, setEditingPostRouteId] = useState<number | null>(null);

  // Sidebar collapsible state
  const [articlesExpanded, setArticlesExpanded] = useState(false);
  const [pagesExpanded, setPagesExpanded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Taxonomy page CRUD states
  const [taxName, setTaxName] = useState('');
  const [taxSlug, setTaxSlug] = useState('');
  const [taxSlugManuallyEdited, setTaxSlugManuallyEdited] = useState(false);
  const [taxDescription, setTaxDescription] = useState('');
  const [taxParentId, setTaxParentId] = useState<number | null>(null);
  const [taxSortOrder, setTaxSortOrder] = useState(0);

  const [isEditingTaxonomyId, setIsEditingTaxonomyId] = useState<number | null>(null);
  const [taxonomySubmitLoading, setTaxonomySubmitLoading] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [taxonomySuccess, setTaxonomySuccess] = useState<string | null>(null);

  const [taxonomySearchQuery, setTaxonomySearchQuery] = useState('');



  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(false);


  const [pluginsList, setPluginsList] = useState<any[]>([]);
  const [loadingPlugins, setLoadingPlugins] = useState<boolean>(false);

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';
    return fetch(`${apiUrl}${path}`, {
      ...options,
      credentials: 'include',
    });
  };

  const loadPlugins = async () => {
    setLoadingPlugins(true);
    try {
      const res = await apiFetch('/api/admin/plugins');
      if (res.ok) {
        const data = await res.json();
        setPluginsList(data);
      }
    } catch (err) {
      console.error('Failed to load plugins:', err);
    } finally {
      setLoadingPlugins(false);
    }
  };

  const handleTogglePlugin = async (key: string) => {
    try {
      const res = await apiFetch(`/api/admin/plugins/${key}/toggle`, {
        method: 'POST',
      });
      if (res.ok) {
        await loadPlugins();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to toggle plugin');
      }
    } catch (err) {
      console.error(err);
      alert('Network error when toggling plugin');
    }
  };

  const parsePath = (path: string) => {
    const cleanPath = path
                        .replace(/^\/admin/, '')
                        .replace(/^\/+/, '')
                        .replace(/\/$/, '');
    if (cleanPath === 'login') return { route: 'login', subView: 'list' };
    if (cleanPath === 'posts' || cleanPath === 'articles') return { route: 'posts', subView: 'list' };
    if (cleanPath === 'posts/new' || cleanPath === 'articles/new') return { route: 'posts', subView: 'create' };
    const postEditMatch = cleanPath.match(/^(posts|articles)\/([^/]+)\/edit$/);
    if (postEditMatch) {
      const postId = Number.parseInt(postEditMatch[2], 10);
      return { route: 'posts', subView: 'edit', postId: Number.isFinite(postId) ? postId : null };
    }
    if (cleanPath === 'categories') return { route: 'categories', subView: 'list' };
    if (cleanPath === 'tags') return { route: 'tags', subView: 'list' };
    if (cleanPath === 'pages') return { route: 'pages', subView: 'list' };
    if (cleanPath === 'themes') return { route: 'themes', subView: 'list' };
    if (cleanPath === 'plugins') return { route: 'plugins', subView: 'list' };
    if (cleanPath === 'users') return { route: 'users', subView: 'list' };
    if (cleanPath === 'settings') return { route: 'settings', subView: 'list' };
    if (cleanPath === 'analytics') return { route: 'analytics', subView: 'list' };
    if (cleanPath && !cleanPath.includes('/')) return { route: cleanPath, subView: 'list' };
    return { route: 'dashboard', subView: 'list' };
  };

  const slugify = (text: string): string => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  };



  const loadTaxonomy = async () => {
    setLoadingTaxonomy(true);
    try {
      const catRes = await apiFetch('/api/categories');
      const tagRes = await apiFetch('/api/tags');
      if (catRes.ok && tagRes.ok) {
        setAllCategories(await catRes.json());
        setAllTags(await tagRes.json());
      }
    } catch (err) {
      console.error('Failed to load taxonomy:', err);
    } finally {
      setLoadingTaxonomy(false);
    }
  };

  useEffect(() => {
    if (user) {
      // App.tsx hanya perlu memuat Taxonomy untuk halaman Categories & Tags.
      // Halaman Posts sekarang sudah ditangani secara mandiri oleh ArticleManager.
      if (currentRoute === 'categories' || currentRoute === 'tags') {
        loadTaxonomy();
      }
    }
  }, [user, currentRoute]);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxName.trim() || !taxSlug.trim()) {
      setTaxonomyError('Name and Slug are required.');
      return;
    }

    setTaxonomySubmitLoading(true);
    setTaxonomyError(null);
    setTaxonomySuccess(null);

    try {
      const payload = {
        name: taxName.trim(),
        slug: taxSlug.trim(),
        description: taxDescription.trim() || null,
        parentId: taxParentId || null,
        sortOrder: taxSortOrder,
      };

      const path = isEditingTaxonomyId
        ? `/api/categories/${isEditingTaxonomyId}`
        : `/api/categories`;
      const method = isEditingTaxonomyId ? 'PUT' : 'POST';

      const response = await apiFetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setTaxonomySuccess(
          isEditingTaxonomyId
            ? 'Category updated successfully!'
            : 'Category created successfully!'
        );
        // Clear fields
        setTaxName('');
        setTaxSlug('');
        setTaxSlugManuallyEdited(false);
        setTaxDescription('');
        setTaxParentId(null);
        setTaxSortOrder(0);
        setIsEditingTaxonomyId(null);
        // Reload taxonomy
        loadTaxonomy();
      } else {
        const data = await response.json();
        setTaxonomyError(data.error || 'Failed to save category.');
      }
    } catch (err) {
      console.error(err);
      setTaxonomyError('Network error: Failed to save category.');
    } finally {
      setTaxonomySubmitLoading(false);
    }
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxName.trim() || !taxSlug.trim()) {
      setTaxonomyError('Name and Slug are required.');
      return;
    }

    setTaxonomySubmitLoading(true);
    setTaxonomyError(null);
    setTaxonomySuccess(null);

    try {
      const payload = {
        name: taxName.trim(),
        slug: taxSlug.trim(),
        description: taxDescription.trim() || null,
      };

      const path = isEditingTaxonomyId
        ? `/api/tags/${isEditingTaxonomyId}`
        : `/api/tags`;
      const method = isEditingTaxonomyId ? 'PUT' : 'POST';

      const response = await apiFetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setTaxonomySuccess(
          isEditingTaxonomyId
            ? 'Tag updated successfully!'
            : 'Tag created successfully!'
        );
        // Clear fields
        setTaxName('');
        setTaxSlug('');
        setTaxSlugManuallyEdited(false);
        setTaxDescription('');
        setIsEditingTaxonomyId(null);
        // Reload taxonomy
        loadTaxonomy();
      } else {
        const data = await response.json();
        setTaxonomyError(data.error || 'Failed to save tag.');
      }
    } catch (err) {
      console.error(err);
      setTaxonomyError('Network error: Failed to save tag.');
    } finally {
      setTaxonomySubmitLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    setTaxonomyError(null);
    setTaxonomySuccess(null);
    try {
      const response = await apiFetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setTaxonomySuccess('Category deleted successfully!');
        if (isEditingTaxonomyId === id) {
          cancelEditTaxonomy();
        }
        loadTaxonomy();
      } else {
        const data = await response.json();
        setTaxonomyError(data.error || 'Failed to delete category.');
      }
    } catch (err) {
      console.error(err);
      setTaxonomyError('Network error: Failed to delete category.');
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    setTaxonomyError(null);
    setTaxonomySuccess(null);
    try {
      const response = await apiFetch(`/api/tags/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setTaxonomySuccess('Tag deleted successfully!');
        if (isEditingTaxonomyId === id) {
          cancelEditTaxonomy();
        }
        loadTaxonomy();
      } else {
        const data = await response.json();
        setTaxonomyError(data.error || 'Failed to delete tag.');
      }
    } catch (err) {
      console.error(err);
      setTaxonomyError('Network error: Failed to delete tag.');
    }
  };

  const startEditCategory = (category: any) => {
    setIsEditingTaxonomyId(category.id);
    setTaxName(category.name);
    setTaxSlug(category.slug);
    setTaxSlugManuallyEdited(true);
    setTaxDescription(category.description || '');
    setTaxParentId(category.parentId || null);
    setTaxSortOrder(category.sortOrder || 0);
    setTaxonomyError(null);
    setTaxonomySuccess(null);
  };

  const startEditTag = (tag: any) => {
    setIsEditingTaxonomyId(tag.id);
    setTaxName(tag.name);
    setTaxSlug(tag.slug);
    setTaxSlugManuallyEdited(true);
    setTaxDescription(tag.description || '');
    setTaxParentId(null);
    setTaxSortOrder(0);
    setTaxonomyError(null);
    setTaxonomySuccess(null);
  };

  const cancelEditTaxonomy = () => {
    setIsEditingTaxonomyId(null);
    setTaxName('');
    setTaxSlug('');
    setTaxSlugManuallyEdited(false);
    setTaxDescription('');
    setTaxParentId(null);
    setTaxSortOrder(0);
    setTaxonomyError(null);
    setTaxonomySuccess(null);
  };

  const getSettingValue = (key: string, defaultVal: string): string => {
    const setting = publicSettings.find((s: any) => s.key === key);
    return setting ? setting.value : defaultVal;
  };

  const checkAuth = async () => {
    const parsed = parsePath(window.location.pathname);

    console.log('PATHNAME:', window.location.pathname);
    console.log('PARSED:', parsed);

   
    setAuthChecking(true);
    try {
      const response = await apiFetch('/api/auth/me');
      if (response.ok) {
        console.log('AUTH OK');
        const data = await response.json();
        setUser(data.user);
        
        // Sesi valid! Pulihkan halaman admin yang diminta atau dasbor.
        const parsed = parsePath(window.location.pathname);
        if (parsed.route === 'login') {
          setCurrentRoute('dashboard');
          window.history.replaceState(null, '', '/dashboard');
        } else {
          setCurrentRoute(parsed.route);
          if (parsed.route === 'posts') {
            setPostsSubView(parsed.subView as any);
            setEditingPostRouteId(parsed.subView === 'edit' ? parsed.postId ?? null : null);
          }
        }
      } else {
        console.log('AUTH FAILED');
        setUser(null);
        setCurrentRoute('login');
        window.history.replaceState(null, '', '/login');
      }
    } catch (err) {
      console.error('Failed to check auth status:', err);
      setUser(null);
      setCurrentRoute('login');
      window.history.replaceState(null, '', '/login');
    } finally {
      setAuthChecking(false);
    }
  };

  const fetchMetrics = async () => {
    if (!user) return;
    setLoadingMetrics(true);
    setMetricError(null);
    try {
      // 1. Fetch system info
      const sysResponse = await apiFetch('/api/system/info');
      if (sysResponse.ok) {
        const sysData = await sysResponse.json();
        setSystemInfo(sysData);
      }

      // 2. Fetch database health
      const dbResponse = await apiFetch('/api/database/health');
      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        setDbHealthy(dbData.ok);
      } else {
        setDbHealthy(false);
      }

      // 3. Fetch settings
      const settingsResponse = await apiFetch('/api/settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setPublicSettings(settingsData);
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard metrics:', err);
      setMetricError('Some system metrics could not be retrieved.');
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Mount logic: check authentication on start
  useEffect(() => {
    checkAuth();
  }, []);


  // Hydrate metrics once user is loaded
  useEffect(() => {
    if (user) {
      fetchMetrics();
      loadPlugins();
    }
  }, [user]);

  console.log('URL_SYNC', {
  user,
  currentRoute,
  postsSubView,
  pathname: window.location.pathname
});

  // Synchronize browser URL with currentRoute, postsSubView, and user states
  useEffect(() => {
  if (authChecking) {
    return;
  }

  if (!user) {
    if (window.location.pathname !== '/login') {
      window.history.replaceState(null, '', '/login');
    }
    return;
  }

  let path = `/${currentRoute}`;

  if (currentRoute === 'posts' && postsSubView === 'create') {
    path = '/posts/new';
  }

  if (currentRoute === 'posts' && postsSubView === 'edit' && editingPostRouteId) {
    path = `/posts/${editingPostRouteId}/edit`;
  }

  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path);
  }
}, [currentRoute, postsSubView, editingPostRouteId, user, authChecking]);

  // Handle popstate (browser back/forward button clicks)
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parsePath(window.location.pathname);
      if (user) {
        if (parsed.route === 'login') {
          setCurrentRoute('dashboard');
          window.history.replaceState(null, '', '/dashboard');
        } else {
          setCurrentRoute(parsed.route);
          if (parsed.route === 'posts') {
            setPostsSubView(parsed.subView as any);
            setEditingPostRouteId(parsed.subView === 'edit' ? parsed.postId ?? null : null);
          }
        }
      } else {
        setCurrentRoute('login');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // Handle active routes expanding corresponding parent dropdown menus automatically
  useEffect(() => {
    if (['posts', 'categories', 'tags'].includes(currentRoute)) {
      setArticlesExpanded(true);
    }
    if (currentRoute === 'pages') {
      setPagesExpanded(true);
    }
  }, [currentRoute]);

  const isArticleEditorRoute = currentRoute === 'posts' && ['create', 'edit'].includes(postsSubView);

  // Article writing gets the compact shell by default; other admin pages keep full navigation.
  useEffect(() => {
    setSidebarCollapsed(isArticleEditorRoute);
  }, [isArticleEditorRoute]);

  // Prevent logged-in users from accessing /login route
  useEffect(() => {
    if (user && currentRoute === 'login') {
      setCurrentRoute('dashboard');
      window.history.replaceState(null, '', '/dashboard');
    }
  }, [user, currentRoute]);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setCurrentRoute('login');
      window.history.replaceState(null, '', '/login');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMemoryPercentage = (): number => {
    if (!systemInfo) return 0;
    const { heapUsed, heapTotal } = systemInfo.memoryUsage;
    return Math.round((heapUsed / heapTotal) * 100);
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  };

  if (authChecking) {
    return (
      <div className="app-loader">
        <div className="spinner"></div>
        <p>Loading Modern CMS Admin Console...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-is-collapsed' : 'sidebar-is-expanded'}`}>
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar" data-sidebar-state={sidebarCollapsed ? 'collapsed' : 'expanded'}>
        <div className="sidebar-brand">
          <span className="brand-logo"><LayoutDashboard className="lucide-icon" size={20} /></span>
          <span className="brand-name">Modern CMS</span>
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={18} className="lucide-icon" />
            ) : (
              <ChevronLeft size={18} className="lucide-icon" />
            )}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          <button 
            className={`nav-item ${currentRoute === 'dashboard' ? 'active' : ''}`}
            aria-label="Dashboard"
            title="Dashboard"
            onClick={() => setCurrentRoute('dashboard')}
          >
            <span className="nav-icon"><LayoutDashboard className="lucide-icon" size={18} /></span> Dashboard
          </button>

          <div className="nav-section-label">Content</div>
          <div 
            className={`nav-group clickable ${['posts', 'categories', 'tags'].includes(currentRoute) ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Articles"
            title="Articles"
            onClick={() => {
              if (sidebarCollapsed) {
                setCurrentRoute('posts');
                setPostsSubView('list');
                return;
              }
              setArticlesExpanded(!articlesExpanded);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (sidebarCollapsed) {
                  setCurrentRoute('posts');
                  setPostsSubView('list');
                  return;
                }
                setArticlesExpanded(!articlesExpanded);
              }
            }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          >
            <span className="nav-group-icon"><FileText className="lucide-icon" size={18} /></span>
            <span>Articles</span>
            {articlesExpanded ? <ChevronDown size={14} className="lucide-icon chevron-toggle" /> : <ChevronRight size={14} className="lucide-icon chevron-toggle" />}
          </div>
          {articlesExpanded && !sidebarCollapsed && (
            <>
              <button 
                className={`nav-item nav-sub-item ${currentRoute === 'posts' && postsSubView === 'list' ? 'active' : ''}`}
                aria-label="All Articles"
                title="All Articles"
                onClick={() => {
                  setCurrentRoute('posts');
                  setPostsSubView('list');
                  setEditingPostRouteId(null);
                }}
              >
                <span className="nav-icon"><FileText className="lucide-icon" size={14} /></span> All Articles
              </button>
              <button 
                className={`nav-item nav-sub-item ${currentRoute === 'posts' && postsSubView === 'create' ? 'active' : ''}`}
                aria-label="New Article"
                title="New Article"
                onClick={() => {
                  // Ganti initNewPost() dengan ini:
                  setCurrentRoute('posts');
                  setPostsSubView('create');
                  setEditingPostRouteId(null);
                }}
              >
                <span className="nav-icon"><Plus className="lucide-icon" size={14} /></span> New Article
              </button>
              <button 
                className={`nav-item nav-sub-item ${currentRoute === 'categories' ? 'active' : ''}`}
                aria-label="Categories"
                title="Categories"
                onClick={() => {
                  setCurrentRoute('categories');
                  cancelEditTaxonomy();
                  loadTaxonomy();
                }}
              >
                <span className="nav-icon"><Folder className="lucide-icon" size={14} /></span> Categories
              </button>
              <button 
                className={`nav-item nav-sub-item ${currentRoute === 'tags' ? 'active' : ''}`}
                aria-label="Tags"
                title="Tags"
                onClick={() => {
                  setCurrentRoute('tags');
                  cancelEditTaxonomy();
                  loadTaxonomy();
                }}
              >
                <span className="nav-icon"><Tag className="lucide-icon" size={14} /></span> Tags
              </button>
            </>
          )}

          <div 
            className={`nav-group clickable ${currentRoute === 'pages' ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Pages"
            title="Pages"
            onClick={() => {
              if (sidebarCollapsed) {
                setCurrentRoute('pages');
                setPagesSubView('list');
                return;
              }
              setPagesExpanded(!pagesExpanded);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (sidebarCollapsed) {
                  setCurrentRoute('pages');
                  setPagesSubView('list');
                  return;
                }
                setPagesExpanded(!pagesExpanded);
              }
            }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          >
            <span className="nav-group-icon"><Files className="lucide-icon" size={18} /></span>
            <span>Pages</span>
            {pagesExpanded ? <ChevronDown size={14} className="lucide-icon chevron-toggle" /> : <ChevronRight size={14} className="lucide-icon chevron-toggle" />}
          </div>
          {pagesExpanded && !sidebarCollapsed && (
            <>
              <button 
                className={`nav-item nav-sub-item ${currentRoute === 'pages' && pagesSubView === 'list' ? 'active' : ''}`}
                aria-label="All Pages"
                title="All Pages"
                onClick={() => {
                  setCurrentRoute('pages');
                  setPagesSubView('list');
                }}
              >
                <span className="nav-icon"><Files className="lucide-icon" size={14} /></span> All Pages
              </button>
              <button 
                className={`nav-item nav-sub-item ${currentRoute === 'pages' && pagesSubView === 'create' ? 'active' : ''}`}
                aria-label="New Page"
                title="New Page"
                onClick={() => {
                  setCurrentRoute('pages');
                  setPagesSubView('create');
                }}
              >
                <span className="nav-icon"><Plus className="lucide-icon" size={14} /></span> New Page
              </button>
            </>
          )}

          {pluginManager.getMenus(pluginsList).length > 0 && (
            <div className="nav-section-label">Plugins</div>
          )}
          {pluginManager.getMenus(pluginsList).map(menu => {
            const IconComponent = menu.icon || Plug;
            return (
              <button
                key={menu.route}
                className={`nav-item ${currentRoute === menu.route ? 'active' : ''}`}
                aria-label={menu.label}
                title={menu.label}
                onClick={() => setCurrentRoute(menu.route)}
              >
                <span className="nav-icon">
                  <IconComponent size={18} className="lucide-icon" />
                </span>
                {menu.label}
              </button>
            );
          })}

          <div className="nav-section-label">Platform</div>
          <button 
            className={`nav-item ${currentRoute === 'themes' ? 'active' : ''}`}
            aria-label="Themes"
            title="Themes"
            onClick={() => setCurrentRoute('themes')}
          >
            <span className="nav-icon"><Palette className="lucide-icon" size={18} /></span> Themes
          </button>
          <button 
            className={`nav-item ${currentRoute === 'plugins' ? 'active' : ''}`}
            aria-label="Plugins"
            title="Plugins"
            onClick={() => setCurrentRoute('plugins')}
          >
            <span className="nav-icon"><Plug className="lucide-icon" size={18} /></span> Plugins
          </button>

          <div className="nav-section-label">Access</div>
          <button 
            className={`nav-item ${currentRoute === 'users' ? 'active' : ''}`}
            aria-label="Users"
            title="Users"
            onClick={() => setCurrentRoute('users')}
          >
            <span className="nav-icon"><Users className="lucide-icon" size={18} /></span> Users
          </button>

          <div className="nav-section-label">Operations</div>
          <button 
            className={`nav-item ${currentRoute === 'settings' ? 'active' : ''}`}
            aria-label="Settings"
            title="Settings"
            onClick={() => setCurrentRoute('settings')}
          >
            <span className="nav-icon"><Settings className="lucide-icon" size={18} /></span> Settings
          </button>
          <button 
            className={`nav-item ${currentRoute === 'analytics' ? 'active' : ''}`}
            aria-label="Analytics"
            title="Analytics"
            onClick={() => setCurrentRoute('analytics')}
          >
            <span className="nav-icon"><ChartLine className="lucide-icon" size={18} /></span> Analytics
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="site-status-pill" title="Production Mode" aria-label="Production Mode">
            <Circle className="status-icon healthy" size={8} fill="currentColor" />
            <span>Production Mode</span>
          </div>
          <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="btn-view-site" title="View Site" aria-label="View Site">
            <Globe className="lucide-icon" size={16} />
            <span>View Site</span>
            <ExternalLink className="lucide-icon external-link-icon" size={14} />
          </a>
        </div>
      </aside>

      {/* Main Panel Wrapper */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="topbar-search">
            <span className="search-icon">🔍</span>
            <Search className="lucide-icon topbar-search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search pages, posts, plugins, or users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="topbar-actions">
            <button className="topbar-btn" title="Create New">
              <span className="btn-icon">➕</span>
              <Plus className="lucide-icon topbar-action-icon" size={18} />
              <span className="btn-text">New</span>
            </button>
            <button className="topbar-btn-icon" title="Notifications">
              <Bell className="lucide-icon" size={18} />
              🔔 <span className="notification-badge">3</span>
            </button>
            <button className="topbar-btn-icon" title="Help & Documentation">
              <HelpCircle className="lucide-icon" size={18} />
              ❓
            </button>
            
            <div className="profile-dropdown-container">
              <div className="profile-trigger">
                <div className="profile-avatar">{user.username[0].toUpperCase()}</div>
                <div className="profile-info">
                  <span className="profile-name">{user.username}</span>
                  <span className="profile-role">Administrator</span>
                </div>
              </div>
              <button onClick={handleLogout} className="btn-logout-header">
                <LogOut className="lucide-icon" size={16} />
                <span>Logout</span>
                🚪 Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="admin-content-viewport">
          
          {/* 1. DASHBOARD VIEW */}
          {currentRoute === 'dashboard' && (
            <div className="route-view dashboard-view">
              <div className="view-header">
                <h2>Dashboard Overview</h2>
                <p>Welcome back, {user.username}. Here is what is happening with your site.</p>
              </div>

              {/* Metric Cards */}
              <div className="metrics-grid">
                <div className="metric-card glass">
                  <div className="metric-card-header">
                    <span>Total Content</span>
                    <span className="m-icon">📄</span>
                  </div>
                  <div className="metric-val">156</div>
                  <div className="metric-meta">
                    <span className="meta-trend positive">↑ 12%</span> vs last week
                  </div>
                  <div className="metric-details-row">
                    <span>Posts: 98</span>
                    <span>Pages: 58</span>
                  </div>
                </div>

                <div className="metric-card glass">
                  <div className="metric-card-header">
                    <span>Published Pages</span>
                    <span className="m-icon">✅</span>
                  </div>
                  <div className="metric-val">42</div>
                  <div className="metric-meta">
                    <span className="meta-trend neutral">0%</span> vs last week
                  </div>
                  <div className="metric-details-row">
                    <span>Drafts: 8</span>
                    <span>Scheduled: 8</span>
                  </div>
                </div>

                <div className="metric-card glass">
                  <div className="metric-card-header">
                    <span>Media Files</span>
                    <span className="m-icon"><Files className="lucide-icon" size={18} /></span>
                  </div>
                  <div className="metric-val">1,248</div>
                  <div className="metric-meta">
                    <span className="meta-trend positive">↑ 4.2%</span> storage increase
                  </div>
                  <div className="metric-details-row">
                    <span>Images: 1,102</span>
                    <span>Others: 146</span>
                  </div>
                </div>

                <div className="metric-card glass">
                  <div className="metric-card-header">
                    <span>Active Plugins</span>
                    <span className="m-icon"><Plug className="lucide-icon" size={18} /></span>
                  </div>
                  <div className="metric-val">18</div>
                  <div className="metric-meta">
                    <span className="meta-info">2 pending updates</span>
                  </div>
                  <div className="metric-details-row">
                    <span>Active: 18</span>
                    <span>Disabled: 2</span>
                  </div>
                </div>
              </div>

              {/* Widgets Grid */}
              <div className="widgets-grid">
                
                {/* System Status Widget */}
                <div className="widget-card glass">
                  <div className="widget-header">
                    <h3>System Health Parameters</h3>
                    <button onClick={fetchMetrics} className="btn-widget-action" disabled={loadingMetrics}>
                      {loadingMetrics ? 'Running...' : '🔄 Run Check'}
                    </button>
                  </div>
                  
                  {metricError && <div className="widget-error">{metricError}</div>}
                  
                  <div className="system-status-list">
                    <div className="status-item">
                      <span className="status-label">Fastify API Connection</span>
                      <span className="status-value-pill healthy">Healthy (Port 4000)</span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">MySQL Database Status</span>
                      <span className={`status-value-pill ${dbHealthy ? 'healthy' : 'error'}`}>
                        {dbHealthy ? 'Connected (Port 3306)' : 'Database Offline'}
                      </span>
                    </div>
                    {systemInfo && (
                      <>
                        <div className="status-item">
                          <span className="status-label">Node.js Version</span>
                          <span className="status-value-text">{systemInfo.nodeVersion}</span>
                        </div>
                        <div className="status-item">
                          <span className="status-label">Engine Platform</span>
                          <span className="status-value-text capitalize">{systemInfo.platform}</span>
                        </div>
                        <div className="status-item">
                          <span className="status-label">Heap Memory Usage</span>
                          <span className="status-value-text">
                            {formatBytes(systemInfo.memoryUsage.heapUsed)} / {formatBytes(systemInfo.memoryUsage.heapTotal)} ({getMemoryPercentage()}%)
                          </span>
                        </div>
                        <div className="status-item">
                          <span className="status-label">CMS Active Uptime</span>
                          <span className="status-value-text">{formatUptime(systemInfo.uptime)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="widget-card glass">
                  <div className="widget-header">
                    <h3>Quick Management Tasks</h3>
                  </div>
                  <div className="quick-actions-grid">
                    <button className="q-btn" onClick={() => setCurrentRoute('posts')}>
                      <span className="q-icon">📝</span>
                      <span>New Post</span>
                      <span className="q-badge">Blog</span>
                    </button>
                    <button className="q-btn" onClick={() => setCurrentRoute('pages')}>
                      <span className="q-icon">📄</span>
                      <span>New Page</span>
                      <span className="q-badge">Static</span>
                    </button>
                    <button className="q-btn" onClick={() => setCurrentRoute('media')}>
                      <span className="q-icon"><Files className="lucide-icon" size={18} /></span>
                      <span>Upload Media</span>
                      <span className="q-badge">Files</span>
                    </button>
                    <button className="q-btn" onClick={() => setCurrentRoute('users')}>
                      <span className="q-icon"><Users className="lucide-icon" size={18} /></span>
                      <span>Add User</span>
                      <span className="q-badge">Roles</span>
                    </button>
                    <button className="q-btn" onClick={() => setCurrentRoute('plugins')}>
                      <span className="q-icon"><Plug className="lucide-icon" size={18} /></span>
                      <span>Install Plugin</span>
                      <span className="q-badge-soon">Coming Soon</span>
                    </button>
                    <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="q-btn-link">
                      <span className="q-icon">🌐</span>
                      <span>View Site</span>
                      <span className="q-badge">Public</span>
                    </a>
                  </div>
                </div>

                {/* Recent Content Table Widget */}
                <div className="widget-card glass span-2">
                  <div className="widget-header">
                    <h3>Recent Site Content</h3>
                    <button className="btn-widget-action" onClick={() => setCurrentRoute('posts')}>Manage All</button>
                  </div>
                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Author</th>
                          <th>Last Updated</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><span className="title-bold">Welcome to Modern CMS</span></td>
                          <td><span className="badge-type">Post</span></td>
                          <td><span className="status-badge published">Published</span></td>
                          <td>{user.username}</td>
                          <td>2 hours ago</td>
                          <td className="table-actions">
                            <button className="t-action-btn">Edit</button>
                            <button className="t-action-btn">View</button>
                          </td>
                        </tr>
                        <tr>
                          <td><span className="title-bold">About Our Company</span></td>
                          <td><span className="badge-type">Page</span></td>
                          <td><span className="status-badge published">Published</span></td>
                          <td>{user.username}</td>
                          <td>1 day ago</td>
                          <td className="table-actions">
                            <button className="t-action-btn">Edit</button>
                            <button className="t-action-btn">View</button>
                          </td>
                        </tr>
                        <tr>
                          <td><span className="title-bold">Services & Custom Layouts</span></td>
                          <td><span className="badge-type">Page</span></td>
                          <td><span className="status-badge draft">Draft</span></td>
                          <td>{user.username}</td>
                          <td>3 days ago</td>
                          <td className="table-actions">
                            <button className="t-action-btn">Edit</button>
                            <button className="t-action-btn">Preview</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PAGES VIEW */}
          {currentRoute === 'pages' && (
            <div className="route-view pages-view">
              <div className="view-header-with-action">
                <div className="header-text">
                  <h2>Pages</h2>
                  <p>Manage static pages like Home, About, Contact, and Privacy Policy.</p>
                </div>
                <button className="btn-primary-action">➕ New Page</button>
              </div>

              <div className="table-filter-bar glass">
                <div className="filter-left">
                  <input type="text" placeholder="Search pages..." className="search-filter-input" />
                  <select className="filter-select">
                    <option value="all">All Statuses</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="trash">Trash</option>
                  </select>
                </div>
              </div>

              <div className="card glass no-padding">
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Slug</th>
                        <th>Status</th>
                        <th>Author</th>
                        <th>Updated At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><span className="title-bold">Homepage</span></td>
                        <td><code>/</code></td>
                        <td><span className="status-badge published">Published</span></td>
                        <td>{user.username}</td>
                        <td>May 28, 2026</td>
                        <td className="table-actions">
                          <button className="t-action-btn">Edit</button>
                          <button className="t-action-btn">View</button>
                          <button className="t-action-btn danger">Delete</button>
                        </td>
                      </tr>
                      <tr>
                        <td><span className="title-bold">About Us</span></td>
                        <td><code>/about</code></td>
                        <td><span className="status-badge published">Published</span></td>
                        <td>John Editor</td>
                        <td>May 27, 2026</td>
                        <td className="table-actions">
                          <button className="t-action-btn">Edit</button>
                          <button className="t-action-btn">View</button>
                          <button className="t-action-btn danger">Delete</button>
                        </td>
                      </tr>
                      <tr>
                        <td><span className="title-bold">Contact Page</span></td>
                        <td><code>/contact</code></td>
                        <td><span className="status-badge published">Published</span></td>
                        <td>{user.username}</td>
                        <td>May 25, 2026</td>
                        <td className="table-actions">
                          <button className="t-action-btn">Edit</button>
                          <button className="t-action-btn">View</button>
                          <button className="t-action-btn danger">Delete</button>
                        </td>
                      </tr>
                      <tr>
                        <td><span className="title-bold">Privacy Policy</span></td>
                        <td><code>/privacy-policy</code></td>
                        <td><span className="status-badge draft">Draft</span></td>
                        <td>{user.username}</td>
                        <td>May 20, 2026</td>
                        <td className="table-actions">
                          <button className="t-action-btn">Edit</button>
                          <button className="t-action-btn">Preview</button>
                          <button className="t-action-btn danger">Delete</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. POSTS VIEW */}
          {currentRoute === 'posts' && (
              <ArticleManager 
                user={user} 
                apiFetch={apiFetch} 
                pluginsList={pluginsList}
                postsSubView={postsSubView} 
                setPostsSubView={setPostsSubView} 
                setCurrentRoute={setCurrentRoute}
                editingPostRouteId={editingPostRouteId}
                setEditingPostRouteId={setEditingPostRouteId}
              />
          )}

          {/* CATEGORIES VIEW */}
          {currentRoute === 'categories' && (
            <div className="route-view taxonomy-view">
              <div className="view-header">
                <h2>Categories</h2>
                <p>Manage content categories. Categories can be hierarchical and have slugs.</p>
              </div>

              {taxonomyError && (
                <div className="tax-message error" style={{ marginBottom: '1.5rem' }}>
                  <AlertCircle size={16} />
                  <span>{taxonomyError}</span>
                </div>
              )}

              {taxonomySuccess && (
                <div className="tax-message success" style={{ marginBottom: '1.5rem' }}>
                  <CheckCircle size={16} />
                  <span>{taxonomySuccess}</span>
                </div>
              )}

              <div className="taxonomy-grid-layout">
                {/* Left Column: Form */}
                <div className="tax-form-col card glass">
                  <h3>{isEditingTaxonomyId ? 'Edit Category' : 'Add New Category'}</h3>
                  <form onSubmit={handleSaveCategory} className="tax-form" style={{ marginTop: '1rem' }}>
                    <div className="tax-input-group">
                      <label htmlFor="cat-name">Name</label>
                      <input
                        id="cat-name"
                        type="text"
                        placeholder="e.g. Tutorials"
                        value={taxName}
                        onChange={(e) => {
                          setTaxName(e.target.value);
                          if (!taxSlugManuallyEdited && !isEditingTaxonomyId) {
                            setTaxSlug(slugify(e.target.value));
                          }
                        }}
                        required
                      />
                      <p className="desc">The name is how it appears on your site.</p>
                    </div>

                    <div className="tax-input-group">
                      <label htmlFor="cat-slug">Slug</label>
                      <input
                        id="cat-slug"
                        type="text"
                        placeholder="e.g. tutorials"
                        value={taxSlug}
                        onChange={(e) => {
                          setTaxSlug(slugify(e.target.value));
                          setTaxSlugManuallyEdited(true);
                        }}
                        required
                      />
                      <p className="desc">The "slug" is the URL-friendly version of the name. It is usually all lowercase and contains only letters, numbers, and hyphens.</p>
                    </div>

                    <div className="tax-input-group">
                      <label htmlFor="cat-parent">Parent Category</label>
                      <select
                        id="cat-parent"
                        value={taxParentId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTaxParentId(val ? parseInt(val, 10) : null);
                        }}
                      >
                        <option value="">None</option>
                        {allCategories
                          // Filter out the category itself when editing to avoid cyclic inheritance
                          .filter((c) => !isEditingTaxonomyId || c.id !== isEditingTaxonomyId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                      <p className="desc">Assign a parent category to create a hierarchy.</p>
                    </div>

                    <div className="tax-input-group">
                      <label htmlFor="cat-desc">Description</label>
                      <textarea
                        id="cat-desc"
                        placeholder="Describe this category..."
                        value={taxDescription}
                        onChange={(e) => setTaxDescription(e.target.value)}
                      />
                      <p className="desc">The description is not prominent by default; however, some themes may show it.</p>
                    </div>

                    <div className="tax-actions-row">
                      <button type="submit" className="btn-tax-submit" disabled={taxonomySubmitLoading}>
                        {taxonomySubmitLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                        {isEditingTaxonomyId ? 'Update Category' : 'Add New Category'}
                      </button>
                      {isEditingTaxonomyId && (
                        <button type="button" className="btn-tax-cancel" onClick={cancelEditTaxonomy}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Right Column: List Table */}
                <div className="tax-list-col">
                  <div className="tax-search-bar">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={taxonomySearchQuery}
                      onChange={(e) => setTaxonomySearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="card glass no-padding">
                    <div className="table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Slug</th>
                            <th style={{ textAlign: 'right' }}>Count</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingTaxonomy ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                                Loading categories...
                              </td>
                            </tr>
                          ) : allCategories.filter((c) => c.name.toLowerCase().includes(taxonomySearchQuery.toLowerCase())).length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                No categories found.
                              </td>
                            </tr>
                          ) : (
                            allCategories
                              .filter((c) => c.name.toLowerCase().includes(taxonomySearchQuery.toLowerCase()))
                              .map((cat) => {
                                // Find parent category name
                                const parent = allCategories.find((c) => c.id === cat.parentId);
                                const isChild = !!cat.parentId;
                                return (
                                  <tr key={cat.id}>
                                    <td>
                                      <span className="title-bold">
                                        {isChild ? <span className="indent-marker">— </span> : null}
                                        {cat.name}
                                      </span>
                                      {parent && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                          Parent: {parent.name}
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {cat.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                                    </td>
                                    <td>
                                      <code>{cat.slug}</code>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <span className="post-count-badge">{cat.postCount || 0}</span>
                                    </td>
                                    <td className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                      <button className="t-action-btn" onClick={() => startEditCategory(cat)}>
                                        Edit
                                      </button>
                                      <button className="t-action-btn danger" onClick={() => handleDeleteCategory(cat.id)}>
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAGS VIEW */}
          {currentRoute === 'tags' && (
            <div className="route-view taxonomy-view">
              <div className="view-header">
                <h2>Tags</h2>
                <p>Manage article tags. Tags are non-hierarchical keywords used to label posts.</p>
              </div>

              {taxonomyError && (
                <div className="tax-message error" style={{ marginBottom: '1.5rem' }}>
                  <AlertCircle size={16} />
                  <span>{taxonomyError}</span>
                </div>
              )}

              {taxonomySuccess && (
                <div className="tax-message success" style={{ marginBottom: '1.5rem' }}>
                  <CheckCircle size={16} />
                  <span>{taxonomySuccess}</span>
                </div>
              )}

              <div className="taxonomy-grid-layout">
                {/* Left Column: Form */}
                <div className="tax-form-col card glass">
                  <h3>{isEditingTaxonomyId ? 'Edit Tag' : 'Add New Tag'}</h3>
                  <form onSubmit={handleSaveTag} className="tax-form" style={{ marginTop: '1rem' }}>
                    <div className="tax-input-group">
                      <label htmlFor="tag-name">Name</label>
                      <input
                        id="tag-name"
                        type="text"
                        placeholder="e.g. JavaScript"
                        value={taxName}
                        onChange={(e) => {
                          setTaxName(e.target.value);
                          if (!taxSlugManuallyEdited && !isEditingTaxonomyId) {
                            setTaxSlug(slugify(e.target.value));
                          }
                        }}
                        required
                      />
                      <p className="desc">The name is how it appears on your site.</p>
                    </div>

                    <div className="tax-input-group">
                      <label htmlFor="tag-slug">Slug</label>
                      <input
                        id="tag-slug"
                        type="text"
                        placeholder="e.g. javascript"
                        value={taxSlug}
                        onChange={(e) => {
                          setTaxSlug(slugify(e.target.value));
                          setTaxSlugManuallyEdited(true);
                        }}
                        required
                      />
                      <p className="desc">The "slug" is the URL-friendly version of the name. It is usually all lowercase and contains only letters, numbers, and hyphens.</p>
                    </div>

                    <div className="tax-input-group">
                      <label htmlFor="tag-desc">Description</label>
                      <textarea
                        id="tag-desc"
                        placeholder="Describe this tag..."
                        value={taxDescription}
                        onChange={(e) => setTaxDescription(e.target.value)}
                      />
                      <p className="desc">The description is not prominent by default; however, some themes may show it.</p>
                    </div>

                    <div className="tax-actions-row">
                      <button type="submit" className="btn-tax-submit" disabled={taxonomySubmitLoading}>
                        {taxonomySubmitLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                        {isEditingTaxonomyId ? 'Update Tag' : 'Add New Tag'}
                      </button>
                      {isEditingTaxonomyId && (
                        <button type="button" className="btn-tax-cancel" onClick={cancelEditTaxonomy}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Right Column: List Table */}
                <div className="tax-list-col">
                  <div className="tax-search-bar">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search tags..."
                      value={taxonomySearchQuery}
                      onChange={(e) => setTaxonomySearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="card glass no-padding">
                    <div className="table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Slug</th>
                            <th style={{ textAlign: 'right' }}>Count</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingTaxonomy ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                                Loading tags...
                              </td>
                            </tr>
                          ) : allTags.filter((t) => t.name.toLowerCase().includes(taxonomySearchQuery.toLowerCase())).length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                No tags found.
                              </td>
                            </tr>
                          ) : (
                            allTags
                              .filter((t) => t.name.toLowerCase().includes(taxonomySearchQuery.toLowerCase()))
                              .map((tag) => (
                                <tr key={tag.id}>
                                  <td>
                                    <span className="title-bold">{tag.name}</span>
                                  </td>
                                  <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {tag.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                                  </td>
                                  <td>
                                    <code>{tag.slug}</code>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <span className="post-count-badge">{tag.postCount || 0}</span>
                                  </td>
                                  <td className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                    <button className="t-action-btn" onClick={() => startEditTag(tag)}>
                                      Edit
                                    </button>
                                    <button className="t-action-btn danger" onClick={() => handleDeleteTag(tag.id)}>
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(() => {
            const pluginRoute =
              pluginManager.resolveRoute(
                currentRoute,
                pluginsList
              );

            if (!pluginRoute) return null;

            const Component = pluginRoute.component;

            return (
              <div className="route-view plugin-view">
                <Component apiFetch={apiFetch} />
              </div>
            );
          })()}

          {/* 5. THEMES VIEW */}
          {currentRoute === 'themes' && (
            <div className="route-view themes-view">
              <div className="view-header">
                <h2>Themes</h2>
                <p>Select and customize the active presentation template for your public site.</p>
              </div>

              <div className="themes-layout-split">
                <div className="active-theme-section">
                  <h3>Active Theme</h3>
                  <div className="theme-banner-card glass">
                    <div className="theme-preview-mock"><Brush className="lucide-icon" size={28} /></div>
                    <div className="theme-meta-details">
                      <h4>Default Minimalist Theme <span className="theme-badge-active">ACTIVE</span></h4>
                      <p className="theme-desc">A clean, modern, and high-performance minimalist theme for blogs and pages.</p>
                      <div className="theme-metadata-row">
                        <span>Version 1.0.0</span>
                        <span>By Modern CMS Team</span>
                      </div>
                      <div className="theme-actions">
                        <button className="btn-primary-action">Customize Theme</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="available-themes-section">
                  <h3>Available Templates</h3>
                  <div className="available-themes-grid">
                    <div className="theme-card glass">
                      <div className="theme-card-preview">📰</div>
                      <div className="theme-card-body">
                        <h5>Grid Blog Theme</h5>
                        <p>A multi-column grid layout best suited for content publishers.</p>
                        <div className="theme-card-actions">
                          <button className="t-btn-act">Activate</button>
                          <button className="t-btn-act sec">Preview</button>
                        </div>
                      </div>
                    </div>

                    <div className="theme-card glass">
                      <div className="theme-card-preview">📚</div>
                      <div className="theme-card-body">
                        <h5>Documentation Portal</h5>
                        <p>Structured sidebar layout suitable for developer docs.</p>
                        <div className="theme-card-actions">
                          <button className="t-btn-act">Activate</button>
                          <button className="t-btn-act sec">Preview</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. PLUGINS VIEW */}
          {currentRoute === 'plugins' && (
            <div className="route-view plugins-view">
              <div className="view-header-with-action">
                <div className="header-text">
                  <h2>Plugins</h2>
                  <p>Extend site features and functionality using modular plugins.</p>
                </div>
                <button className="btn-primary-action"><Plug className="lucide-icon" size={18} /> Install Plugin</button>
              </div>

              <div className="card glass no-padding">
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Plugin Name</th>
                        <th>Description</th>
                        <th>Version</th>
                        <th>Author</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingPlugins ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                            <Loader2 className="animate-spin" size={20} /> Loading plugins...
                          </td>
                        </tr>
                      ) : pluginsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No plugins found.
                          </td>
                        </tr>
                      ) : (
                        pluginsList.map((p) => {
                          const isBtnActive = p.status === 'ACTIVE';
                          const statusClass = p.status === 'ACTIVE' ? 'published' : ['DISCOVERED', 'INSTALLED', 'INACTIVE'].includes(p.status) ? 'draft' : 'archived';
                          const isActionDisabled = ['INSTALLING', 'BROKEN', 'UNINSTALLED'].includes(p.status);
                          
                          return (
                            <tr key={p.key}>
                              <td><span className="title-bold">{p.name}</span></td>
                              <td>{p.description || '-'}</td>
                              <td>{p.version}</td>
                              <td>{p.manifest?.author || 'Modern CMS Team'}</td>
                              <td>
                                <span className={`status-badge ${statusClass}`}>
                                  {p.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="table-actions">
                                <button 
                                  className={`t-action-btn ${isBtnActive ? 'danger' : ''}`}
                                  onClick={() => handleTogglePlugin(p.key)}
                                  disabled={isActionDisabled}
                                >
                                  {isBtnActive ? 'Deactivate' : p.status === 'DISCOVERED' ? 'Install & Activate' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 7. USERS VIEW */}
          {currentRoute === 'users' && (
            <div className="route-view users-view">
              <div className="view-header-with-action">
                <div className="header-text">
                  <h2>Users</h2>
                  <p>Create and edit access roles for dashboard administrators.</p>
                </div>
                <button className="btn-primary-action"><UserPlus className="lucide-icon" size={18} /> Add New User</button>
              </div>

              <div className="card glass no-padding">
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Created At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><span className="title-bold">{user.username}</span></td>
                        <td>{user.email}</td>
                        <td><span className="user-role-badge admin">Admin</span></td>
                        <td><span className="status-badge published">Active</span></td>
                        <td>May 28, 2026</td>
                        <td className="table-actions">
                          <button className="t-action-btn">Edit</button>
                          <button className="t-action-btn" disabled>Suspended</button>
                        </td>
                      </tr>
                      <tr>
                        <td><span className="title-bold">john_editor</span></td>
                        <td>john.editor@moderncms.local</td>
                        <td><span className="user-role-badge editor">Editor</span></td>
                        <td><span className="status-badge published">Active</span></td>
                        <td>May 27, 2026</td>
                        <td className="table-actions">
                          <button className="t-action-btn">Edit</button>
                          <button className="t-action-btn danger">Suspend</button>
                        </td>
                      </tr>
                      <tr>
                        <td><span className="title-bold">jane_author</span></td>
                        <td>jane.author@moderncms.local</td>
                        <td><span className="user-role-badge author">Author</span></td>
                        <td><span className="status-badge draft">Pending</span></td>
                        <td>May 26, 2026</td>
                        <td className="table-actions">
                          <button className="t-action-btn">Approve</button>
                          <button className="t-action-btn danger">Delete</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 8. SETTINGS VIEW */}
          {currentRoute === 'settings' && (
            <div className="route-view settings-view">
              <div className="view-header">
                <h2>Settings</h2>
                <p>Configure general parameters, reading visibility, and platform security rules.</p>
              </div>

              <div className="settings-container">
                {/* Tabs Selector */}
                <div className="settings-tabs">
                  <button 
                    className={`tab-btn ${settingsTab === 'general' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('general')}
                  >
                    General
                  </button>
                  <button 
                    className={`tab-btn ${settingsTab === 'writing' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('writing')}
                  >
                    Writing
                  </button>
                  <button 
                    className={`tab-btn ${settingsTab === 'reading' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('reading')}
                  >
                    Reading
                  </button>
                  <button 
                    className={`tab-btn ${settingsTab === 'security' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('security')}
                  >
                    Security
                  </button>
                  <button 
                    className={`tab-btn ${settingsTab === 'advanced' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('advanced')}
                  >
                    Advanced
                  </button>
                </div>

                {/* Tab content panels */}
                <div className="settings-tab-panel glass">
                  {settingsTab === 'general' && (
                    <div className="tab-pane">
                      <h3>General Configuration</h3>
                      <p className="pane-desc">Basic settings of your website directory.</p>
                      
                      <div className="settings-form">
                        <div className="s-group">
                          <label>Site Name</label>
                          <input type="text" defaultValue={getSettingValue('site_name', 'Modern CMS')} />
                        </div>
                        <div className="s-group">
                          <label>Site Description</label>
                          <input type="text" defaultValue={getSettingValue('site_description', 'A modern dynamic CMS built on Fastify & React')} />
                        </div>
                        <div className="s-group">
                          <label>Site URL</label>
                          <input type="text" defaultValue={getSettingValue('site_url', 'http://localhost:5173')} />
                        </div>
                        <div className="s-group">
                          <label>Admin Contact Email</label>
                          <input type="email" defaultValue={user.email} />
                        </div>
                        <button className="btn-save-settings">Save General Changes</button>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'writing' && (
                    <div className="tab-pane">
                      <h3>Writing Settings</h3>
                      <p className="pane-desc">Formatting rules for posts, pages, and categories.</p>
                      <div className="settings-form">
                        <div className="s-group">
                          <label>Default Content Status</label>
                          <select>
                            <option>Draft</option>
                            <option>Published</option>
                          </select>
                        </div>
                        <div className="s-group">
                          <label>Default Category</label>
                          <select>
                            <option>General</option>
                            <option>Tutorials</option>
                            <option>News</option>
                          </select>
                        </div>
                        <button className="btn-save-settings">Save Writing Changes</button>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'reading' && (
                    <div className="tab-pane">
                      <h3>Reading & Visibility Settings</h3>
                      <p className="pane-desc">Control how content is rendered on the public website.</p>
                      <div className="settings-form">
                        <div className="s-group">
                          <label>Homepage displays</label>
                          <select>
                            <option>Static Landing Page</option>
                            <option>Latest Blog Posts</option>
                          </select>
                        </div>
                        <div className="s-group">
                          <label>Posts per page limit</label>
                          <input type="number" defaultValue={10} />
                        </div>
                        <button className="btn-save-settings">Save Reading Changes</button>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'security' && (
                    <div className="tab-pane">
                      <h3>Security & Sessions Configuration</h3>
                      <p className="pane-desc">System authentication rules and security policies.</p>
                      <div className="settings-form">
                        <div className="s-group">
                          <label>Session TTL (Days)</label>
                          <input type="number" defaultValue={7} />
                        </div>
                        <div className="s-group">
                          <label>Login Protection (Max Retries)</label>
                          <input type="number" defaultValue={5} />
                        </div>
                        <button className="btn-save-settings">Save Security Changes</button>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'advanced' && (
                    <div className="tab-pane">
                      <h3>Advanced System Parameters</h3>
                      <p className="pane-desc">Clean cache, configure maintenance, and check environment settings.</p>
                      <div className="settings-form">
                        <div className="s-group toggle-group">
                          <label>Enable Maintenance Mode</label>
                          <input type="checkbox" className="switch-input" />
                        </div>
                        <div className="actions-row-settings">
                          <button className="btn-settings-action"><Trash2 className="lucide-icon" size={18} /> Clear Site Cache</button>
                          <button className="btn-settings-action warning"><RotateCw className="lucide-icon" size={18} /> Restart Core Engine</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 9. ANALYTICS VIEW */}
          {currentRoute === 'analytics' && (
            <div className="route-view analytics-view">
              <div className="view-header">
                <h2>Analytics</h2>
                <p>Website performance, page views, and visitor statistics.</p>
              </div>

              <div className="placeholder-container glass">
                <span className="p-icon"><ChartLine className="lucide-icon" size={28} /></span>
                <h3>No Analytics Data Available</h3>
                <p>Analytics module is a placeholder for this phase. Data collection will begin after Content Render Module integration.</p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
