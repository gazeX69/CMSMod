import { useEffect, useRef, useState } from 'react';
import { SystemInfo } from '@modern-cms/shared';
import Login from './Login.tsx';
import { 
  Plus, Search, Loader2, 
  CheckCircle, 
  FileText, AlertCircle, Folder, Tag, ChevronDown, ChevronRight, ChevronLeft,
  Plug, LayoutDashboard, Files, Palette, Users, Settings,
  ChartLine, Globe, Circle, Bell, HelpCircle, LogOut, ExternalLink,
  UserPlus, Trash2, RotateCw, Menu, Puzzle
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
import { syncAdminPluginRuntime } from '../plugins/registry';
import { PluginErrorBoundary } from '../plugins/PluginErrorBoundary';
import { AdminMediaPickerHost } from '../plugins/AdminMediaPickerHost';
import ContentManager from '../pages/ContentManager.tsx';
import ThemeSettingsPage from '../pages/ThemeSettingsPage.tsx';
import WidgetsPage from '../pages/WidgetsPage.tsx';


export default function App() {
  const [user, setUser] = useState<{
    id: number;
    username: string;
    email: string;
    roles?: string[];
    permissions?: string[];
  } | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Dashboard status variables
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null);
  const [publicSettings, setPublicSettings] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(false);
  const [metricError, setMetricError] = useState<string | null>(null);

  // Reading settings states
  const [homepageMode, setHomepageMode] = useState<string>('single');
  const [homepageTarget, setHomepageTarget] = useState<string>('');
  const [postsPageTarget, setPostsPageTarget] = useState<string>('');
  const [postsPerPage, setPostsPerPage] = useState<number>(10);
  const [permalinkStructure, setPermalinkStructure] = useState<string>('/posts/%postname%/');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Navigation state
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard');
  const [settingsTab, setSettingsTab] = useState<string>('general');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [pagesSubView, setPagesSubView] = useState<'list' | 'create' | 'edit'>('list');
  // TAMBAHKAN KEMBALI BARIS INI:
  const [postsSubView, setPostsSubView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingPostRouteId, setEditingPostRouteId] = useState<number | null>(null);
  const [editingPageRouteId, setEditingPageRouteId] = useState<number | null>(null);

  // Sidebar collapsible state
  const [articlesExpanded, setArticlesExpanded] = useState(false);
  const [pagesExpanded, setPagesExpanded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavigation, setMobileNavigation] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const syncNavigationMode = () => {
      setMobileNavigation(mediaQuery.matches);
      if (mediaQuery.matches) setSidebarCollapsed(true);
    };

    syncNavigationMode();
    mediaQuery.addEventListener('change', syncNavigationMode);
    return () => mediaQuery.removeEventListener('change', syncNavigationMode);
  }, []);

  useEffect(() => {
    if (mobileNavigation) setSidebarCollapsed(true);
  }, [currentRoute, mobileNavigation]);

  // User Management state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersSuccess, setUsersSuccess] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form fields
  const [userFormUsername, setUserFormUsername] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormRoleId, setUserFormRoleId] = useState<number | ''>('');
  const [userFormStatus, setUserFormStatus] = useState('active');
  const [userFormSubmitting, setUserFormSubmitting] = useState(false);

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
  const [installingPackage, setInstallingPackage] = useState(false);
  const packageUploadRef = useRef<HTMLInputElement | null>(null);
  const [, setPluginRuntimeVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void syncAdminPluginRuntime(pluginsList).then(() => {
      if (!cancelled) setPluginRuntimeVersion((version) => version + 1);
    });
    return () => { cancelled = true; };
  }, [pluginsList]);

  // Theme management state
  const [themesList, setThemesList] = useState<any[]>([]);
  const [loadingThemes, setLoadingThemes] = useState<boolean>(false);
  const [themesError, setThemesError] = useState<string | null>(null);
  const [themesSuccess, setThemesSuccess] = useState<string | null>(null);
  const [activatingTheme, setActivatingTheme] = useState<string | null>(null);
  const [themeSettingsId, setThemeSettingsId] = useState<string | null>(null);


  // Menu Management State
  const [navLocation, setNavLocation] = useState<string>('primary');
  const [navLocationsList, setNavLocationsList] = useState<string[]>(['primary', 'footer']);
  const [navItems, setNavItems] = useState<any[]>([]);
  const [loadingNav, setLoadingNav] = useState<boolean>(false);
  const [navError, setNavError] = useState<string | null>(null);
  const [navSuccess, setNavSuccess] = useState<string | null>(null);
  const [savingNav, setSavingNav] = useState<boolean>(false);
  const [newCustomLabel, setNewCustomLabel] = useState<string>('');
  const [newCustomUrl, setNewCustomUrl] = useState<string>('');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [showCustomLocationModal, setShowCustomLocationModal] = useState<boolean>(false);
  const [customLocationName, setCustomLocationName] = useState<string>('');
  const [navPages, setNavPages] = useState<any[]>([]);
  const [navPosts, setNavPosts] = useState<any[]>([]);
  const [navCategories, setNavCategories] = useState<any[]>([]);
  const [navTags, setNavTags] = useState<any[]>([]);
  const [accordionState, setAccordionState] = useState<Record<string, boolean>>({
    pages: true,
    posts: false,
    categories: false,
    tags: false,
    custom: false,
  });

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

  const handleLocalPackageUpload = async (file: File | null) => {
    if (!file) return;
    setInstallingPackage(true);
    try {
      const form = new FormData();
      form.append('package', file);
      const response = await apiFetch('/api/admin/packages/upload?allowUnsigned=true&activate=true', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Package installation failed');
      await loadPlugins();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Package installation failed');
    } finally {
      setInstallingPackage(false);
      if (packageUploadRef.current) packageUploadRef.current.value = '';
    }
  };

  const loadThemes = async () => {
    setLoadingThemes(true);
    setThemesError(null);
    try {
      const res = await apiFetch('/api/admin/themes');
      if (res.ok) {
        const data = await res.json();
        setThemesList(data.themes || []);
      } else {
        setThemesError('Failed to load themes');
      }
    } catch (err) {
      console.error('Failed to load themes:', err);
      setThemesError('Network error loading themes');
    } finally {
      setLoadingThemes(false);
    }
  };

  const handleActivateTheme = async (id: string) => {
    setActivatingTheme(id);
    setThemesError(null);
    setThemesSuccess(null);
    try {
      const res = await apiFetch(`/api/admin/themes/${id}/activate`, { method: 'POST' });
      if (res.ok) {
        setThemesSuccess(`Theme "${id}" activated successfully`);
        await loadThemes();
      } else {
        const errData = await res.json();
        setThemesError(errData.error || 'Failed to activate theme');
      }
    } catch (err) {
      console.error(err);
      setThemesError('Network error activating theme');
    } finally {
      setActivatingTheme(null);
    }
  };


  const handleScanThemes = async () => {
    setThemesError(null);
    setThemesSuccess(null);
    try {
      const res = await apiFetch('/api/admin/themes/scan', { method: 'POST' });
      if (res.ok) {
        setThemesSuccess('Theme scan completed');
        await loadThemes();
      } else {
        setThemesError('Failed to scan themes');
      }
    } catch (err) {
      setThemesError('Network error scanning themes');
    }
  };

  // Menu Management Handlers
  const loadMenuResources = async () => {
    try {
      const [pagesRes, postsRes, catsRes, tagsRes] = await Promise.all([
        apiFetch('/api/pages'),
        apiFetch('/api/posts'),
        apiFetch('/api/categories'),
        apiFetch('/api/tags')
      ]);
      
      if (pagesRes.ok) setNavPages(await pagesRes.json());
      if (postsRes.ok) setNavPosts(await postsRes.json());
      if (catsRes.ok) setNavCategories(await catsRes.json());
      if (tagsRes.ok) setNavTags(await tagsRes.json());
    } catch (err) {
      console.error('Failed to load menu resources:', err);
    }
  };

  const loadNavigationLocations = async () => {
    try {
      const res = await apiFetch('/api/admin/navigation/locations');
      if (res.ok) {
        const data = await res.json();
        setNavLocationsList(data);
      }
    } catch (err) {
      console.error('Failed to load navigation locations:', err);
    }
  };

  const loadNavigation = async (location: string) => {
    setLoadingNav(true);
    setNavError(null);
    try {
      const res = await apiFetch(`/api/admin/navigation/${location}`);
      if (res.ok) {
        const data = await res.json();
        const mappedData = data.map((item: any) => ({
          ...item,
          tempId: item.id,
          parentTempId: item.parentId,
        }));
        setNavItems(mappedData);
      } else {
        setNavError('Failed to load navigation items');
      }
    } catch (err) {
      console.error(err);
      setNavError('Network error loading navigation items');
    } finally {
      setLoadingNav(false);
    }
  };

  const saveNavigation = async () => {
    setSavingNav(true);
    setNavError(null);
    setNavSuccess(null);
    try {
      const res = await apiFetch(`/api/admin/navigation/${navLocation}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(navItems),
      });
      if (res.ok) {
        setNavSuccess('Menu saved successfully!');
        await loadNavigation(navLocation);
        await loadNavigationLocations();
      } else {
        const data = await res.json();
        setNavError(data.error || 'Failed to save menu');
      }
    } catch (err) {
      console.error(err);
      setNavError('Network error saving menu');
    } finally {
      setSavingNav(false);
    }
  };

  const handleAddCustomLink = () => {
    if (!newCustomLabel || !newCustomUrl) return;
    const newItem = {
      tempId: Date.now() + Math.random(),
      label: newCustomLabel,
      url: newCustomUrl,
      target: '_self',
      parentTempId: null,
      sortOrder: navItems.length,
      isActive: true,
    };
    setNavItems([...navItems, newItem]);
    setNewCustomLabel('');
    setNewCustomUrl('');
  };

  const handleAddPages = () => {
    const newItems = selectedPages.map(pageId => {
      const page = navPages.find(p => p.id === pageId);
      if (!page) return null;
      return {
        tempId: Date.now() + Math.random(),
        label: page.title,
        url: `/${page.slug === 'home' ? '' : page.slug}`,
        target: '_self',
        parentTempId: null,
        sortOrder: navItems.length,
        isActive: true,
      };
    }).filter(Boolean);
    setNavItems([...navItems, ...newItems]);
    setSelectedPages([]);
  };

  const handleAddPosts = () => {
    const newItems = selectedPosts.map(postId => {
      const post = navPosts.find(p => p.id === postId);
      if (!post) return null;
      return {
        tempId: Date.now() + Math.random(),
        label: post.title,
        url: `/posts/${post.slug}`,
        target: '_self',
        parentTempId: null,
        sortOrder: navItems.length,
        isActive: true,
      };
    }).filter(Boolean);
    setNavItems([...navItems, ...newItems]);
    setSelectedPosts([]);
  };

  const handleAddCategories = () => {
    const newItems = selectedCategories.map(catId => {
      const cat = navCategories.find(c => c.id === catId);
      if (!cat) return null;
      return {
        tempId: Date.now() + Math.random(),
        label: cat.name,
        url: `/category/${cat.slug}`,
        target: '_self',
        parentTempId: null,
        sortOrder: navItems.length,
        isActive: true,
      };
    }).filter(Boolean);
    setNavItems([...navItems, ...newItems]);
    setSelectedCategories([]);
  };

  const handleAddTags = () => {
    const newItems = selectedTags.map(tagId => {
      const tag = navTags.find(t => t.id === tagId);
      if (!tag) return null;
      return {
        tempId: Date.now() + Math.random(),
        label: tag.name,
        url: `/tag/${tag.slug}`,
        target: '_self',
        parentTempId: null,
        sortOrder: navItems.length,
        isActive: true,
      };
    }).filter(Boolean);
    setNavItems([...navItems, ...newItems]);
    setSelectedTags([]);
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...navItems];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    newItems.forEach((item, idx) => {
      item.sortOrder = idx;
    });
    setNavItems(newItems);
  };

  const moveItemDown = (index: number) => {
    if (index === navItems.length - 1) return;
    const newItems = [...navItems];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    newItems.forEach((item, idx) => {
      item.sortOrder = idx;
    });
    setNavItems(newItems);
  };

  const indentItem = (index: number) => {
    if (index === 0) return;
    const newItems = [...navItems];
    const prevItem = newItems[index - 1];
    newItems[index].parentTempId = prevItem.tempId;
    setNavItems(newItems);
  };

  const outdentItem = (index: number) => {
    const newItems = [...navItems];
    const currentItem = newItems[index];
    if (!currentItem.parentTempId) return;
    const parentItem = newItems.find(item => item.tempId === currentItem.parentTempId);
    currentItem.parentTempId = parentItem ? parentItem.parentTempId : null;
    setNavItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...navItems];
    const itemToRemove = newItems[index];
    newItems.splice(index, 1);
    newItems.forEach(item => {
      if (item.parentTempId === itemToRemove.tempId) {
        item.parentTempId = itemToRemove.parentTempId;
      }
    });
    newItems.forEach((item, idx) => {
      item.sortOrder = idx;
    });
    setNavItems(newItems);
  };

  const getItemDepth = (item: any, items: any[]): number => {
    let depth = 0;
    let current = item;
    const seen = new Set();
    while (current.parentTempId) {
      if (seen.has(current.tempId)) break;
      seen.add(current.tempId);
      const parent = items.find(i => i.tempId === current.parentTempId);
      if (!parent) break;
      depth++;
      current = parent;
    }
    return depth;
  };

  const toggleAccordion = (key: string) => {
    setAccordionState(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
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
    if (cleanPath === 'pages/new') return { route: 'pages', subView: 'create' };
    const pageEditMatch = cleanPath.match(/^pages\/([^/]+)\/edit$/);
    if (pageEditMatch) {
      const pageId = Number.parseInt(pageEditMatch[1], 10);
      return { route: 'pages', subView: 'edit', pageId: Number.isFinite(pageId) ? pageId : null };
    }
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

  useEffect(() => {
    if (currentRoute === 'themes' && user) {
      loadThemes();
    }
  }, [currentRoute]);

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
          } else if (parsed.route === 'pages') {
            setPagesSubView(parsed.subView as any);
            setEditingPageRouteId(parsed.subView === 'edit' ? (parsed as any).pageId ?? null : null);
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

  const hasPermission = (permissionKey: string): boolean => {
    if (!user) return false;
    if (user.roles?.includes('Admin')) return true;
    if (!user.permissions) return false;
    if (user.permissions.includes(permissionKey)) return true;
    return user.permissions.some(userPerm => {
      if (userPerm === '*') return true;
      if (userPerm.endsWith('.*')) {
        const prefix = userPerm.slice(0, -2);
        return permissionKey.startsWith(prefix + '.');
      }
      return false;
    });
  };

  const loadUsersAndRoles = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiFetch('/api/users'),
        apiFetch('/api/roles'),
      ]);
      if (usersRes.ok && rolesRes.ok) {
        const usersData = await usersRes.json();
        const rolesData = await rolesRes.json();
        setUsersList(usersData);
        setRolesList(rolesData);
      } else {
        setUsersError('Failed to fetch users or roles from API.');
      }
    } catch (err) {
      console.error(err);
      setUsersError('Network error loading users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (user && currentRoute === 'users') {
      loadUsersAndRoles();
    }
  }, [user, currentRoute]);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormUsername || !userFormEmail || (!editingUser && !userFormPassword) || !userFormRoleId) {
      setUsersError('Please fill in all required fields.');
      return;
    }
    
    setUserFormSubmitting(true);
    setUsersError(null);
    setUsersSuccess(null);
    
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const body: any = {
        username: userFormUsername,
        email: userFormEmail,
        roleId: Number(userFormRoleId),
        status: userFormStatus,
      };
      if (userFormPassword) {
        body.password = userFormPassword;
      }
      
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        setUsersSuccess(editingUser ? 'User updated successfully!' : 'User created successfully!');
        setUserModalOpen(false);
        setUserFormUsername('');
        setUserFormEmail('');
        setUserFormPassword('');
        setUserFormRoleId('');
        setUserFormStatus('active');
        setEditingUser(null);
        await loadUsersAndRoles();
      } else {
        const errorData = await response.json();
        setUsersError(errorData.error || 'Failed to save user.');
      }
    } catch (err) {
      console.error(err);
      setUsersError('Network error saving user.');
    } finally {
      setUserFormSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setUsersError(null);
    setUsersSuccess(null);
    try {
      const response = await apiFetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setUsersSuccess('User deleted successfully!');
        await loadUsersAndRoles();
      } else {
        const errorData = await response.json();
        setUsersError(errorData.error || 'Failed to delete user.');
      }
    } catch (err) {
      console.error(err);
      setUsersError('Network error deleting user.');
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

  // Hydrate settings states when publicSettings is fetched/updated
  useEffect(() => {
    if (publicSettings.length > 0) {
      setHomepageMode(getSettingValue('site.homepage_mode', 'single'));
      setHomepageTarget(getSettingValue('site.homepage_target', ''));
      setPostsPageTarget(getSettingValue('site.posts_page_target', ''));
      setPostsPerPage(parseInt(getSettingValue('site.posts_per_page', '10'), 10) || 10);
      setPermalinkStructure(getSettingValue('site.permalink_structure', '/posts/%postname%/'));
    }
  }, [publicSettings]);

  // Load menu resources (pages list) when settings view is entered
  useEffect(() => {
    if (user) {
      if (currentRoute === 'settings') {
        loadMenuResources();
      }
    }
  }, [user, currentRoute]);

  const handleSaveReadingSettings = async () => {
    setSavingSettings(true);
    setSettingsSuccess(null);
    setSettingsError(null);
    try {
      const payloadMode = {
        value: homepageMode,
        group: 'site',
        type: 'string',
        isPublic: true,
        description: 'Homepage rendering mode (single page or collection list)',
      };
      
      const payloadTarget = {
        value: homepageTarget,
        group: 'site',
        type: 'string',
        isPublic: true,
        description: 'Active homepage content UUID',
      };
      
      const payloadPostsTarget = {
        value: postsPageTarget,
        group: 'site',
        type: 'string',
        isPublic: true,
        description: 'Active posts page content UUID when homepage displays a static page',
      };
      
      const payloadPerPage = {
        value: String(postsPerPage),
        group: 'site',
        type: 'string',
        isPublic: true,
        description: 'Number of posts to display per page on collection list',
      };

      const payloadPermalink = {
        value: permalinkStructure,
        group: 'site',
        type: 'string',
        isPublic: true,
        description: 'Permalink structure for articles/posts',
      };

      const [resMode, resTarget, resPostsTarget, resPerPage, resPermalink] = await Promise.all([
        apiFetch('/api/admin/settings/site.homepage_mode', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadMode),
        }),
        apiFetch('/api/admin/settings/site.homepage_target', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadTarget),
        }),
        apiFetch('/api/admin/settings/site.posts_page_target', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadPostsTarget),
        }),
        apiFetch('/api/admin/settings/site.posts_per_page', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadPerPage),
        }),
        apiFetch('/api/admin/settings/site.permalink_structure', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadPermalink),
        }),
      ]);

      if (resMode.ok && resTarget.ok && resPostsTarget.ok && resPerPage.ok && resPermalink.ok) {
        setSettingsSuccess('Reading settings saved successfully!');
        await fetchMetrics();
      } else {
        setSettingsError('Failed to save some settings.');
      }
    } catch (err) {
      console.error(err);
      setSettingsError('Network error saving settings.');
    } finally {
      setSavingSettings(false);
    }
  };

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

  if (currentRoute === 'pages' && pagesSubView === 'create') {
    path = '/pages/new';
  }

  if (currentRoute === 'pages' && pagesSubView === 'edit' && editingPageRouteId) {
    path = `/pages/${editingPageRouteId}/edit`;
  }

  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path);
  }
}, [currentRoute, postsSubView, editingPostRouteId, pagesSubView, editingPageRouteId, user, authChecking]);

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
          } else if (parsed.route === 'pages') {
            setPagesSubView(parsed.subView as any);
            setEditingPageRouteId(parsed.subView === 'edit' ? (parsed as any).pageId ?? null : null);
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

  // Load menu resources and items when entering navigation route
  useEffect(() => {
    if (currentRoute === 'navigation' && user) {
      loadNavigation(navLocation);
      loadNavigationLocations();
      loadMenuResources();
    }
  }, [currentRoute, navLocation, user]);

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
      <AdminMediaPickerHost />
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

        <nav
          className="sidebar-nav"
          onClick={(event) => {
            if (mobileNavigation && (event.target as HTMLElement).closest('button.nav-item')) {
              setSidebarCollapsed(true);
            }
          }}
        >
          <div className="nav-section-label">Main</div>
          <button 
            className={`nav-item ${currentRoute === 'dashboard' ? 'active' : ''}`}
            aria-label="Dashboard"
            title="Dashboard"
            onClick={() => setCurrentRoute('dashboard')}
          >
            <span className="nav-icon"><LayoutDashboard className="lucide-icon" size={18} /></span> Dashboard
          </button>

          {hasPermission('content.read') && (
            <>
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
                  {hasPermission('content.create') && (
                    <button 
                      className={`nav-item nav-sub-item ${currentRoute === 'posts' && postsSubView === 'create' ? 'active' : ''}`}
                      aria-label="New Article"
                      title="New Article"
                      onClick={() => {
                        setCurrentRoute('posts');
                        setPostsSubView('create');
                        setEditingPostRouteId(null);
                      }}
                    >
                      <span className="nav-icon"><Plus className="lucide-icon" size={14} /></span> New Article
                    </button>
                  )}
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
                  {hasPermission('content.create') && (
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
                  )}
                </>
              )}
            </>
          )}

          {pluginManager.getMenus(pluginsList).filter(menu => {
            const manifest = pluginsList.find(p => p.manifest?.admin?.route === menu.route)?.manifest;
            const reqPermission = manifest?.admin?.permission || `${manifest?.id}.read`;
            return hasPermission(reqPermission);
          }).length > 0 && (
            <div className="nav-section-label">Plugins</div>
          )}
          {pluginManager.getMenus(pluginsList).filter(menu => {
            const manifest = pluginsList.find(p => p.manifest?.admin?.route === menu.route)?.manifest;
            const reqPermission = manifest?.admin?.permission || `${manifest?.id}.read`;
            return hasPermission(reqPermission);
          }).map(menu => {
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

          {(hasPermission('themes.manage') || hasPermission('settings.manage') || hasPermission('plugins.manage')) && (
            <div className="nav-section-label">Platform</div>
          )}
          {hasPermission('themes.manage') && (
            <button 
              className={`nav-item ${currentRoute === 'themes' ? 'active' : ''}`}
              aria-label="Themes"
              title="Themes"
              onClick={() => setCurrentRoute('themes')}
            >
              <span className="nav-icon"><Palette className="lucide-icon" size={18} /></span> Themes
            </button>
          )}
          {hasPermission('themes.manage') && (
            <button 
              className={`nav-item ${currentRoute === 'widgets' ? 'active' : ''}`}
              aria-label="Widgets"
              title="Widgets"
              onClick={() => setCurrentRoute('widgets')}
            >
              <span className="nav-icon"><Puzzle className="lucide-icon" size={18} /></span> Widgets
            </button>
          )}
          {hasPermission('settings.manage') && (
            <button 
              className={`nav-item ${currentRoute === 'navigation' ? 'active' : ''}`}
              aria-label="Menus"
              title="Menus"
              onClick={() => setCurrentRoute('navigation')}
            >
              <span className="nav-icon"><Menu className="lucide-icon" size={18} /></span> Menus
            </button>
          )}
          {hasPermission('plugins.manage') && (
            <button 
              className={`nav-item ${currentRoute === 'plugins' ? 'active' : ''}`}
              aria-label="Plugins"
              title="Plugins"
              onClick={() => setCurrentRoute('plugins')}
            >
              <span className="nav-icon"><Plug className="lucide-icon" size={18} /></span> Plugins
            </button>
          )}

          {hasPermission('users.manage') && (
            <>
              <div className="nav-section-label">Access</div>
              <button 
                className={`nav-item ${currentRoute === 'users' ? 'active' : ''}`}
                aria-label="Users"
                title="Users"
                onClick={() => setCurrentRoute('users')}
              >
                <span className="nav-icon"><Users className="lucide-icon" size={18} /></span> Users
              </button>
            </>
          )}

          {hasPermission('settings.manage') && (
            <>
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
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="site-status-pill" title="Production Mode" aria-label="Production Mode">
            <Circle className="status-icon healthy" size={8} fill="currentColor" />
            <span>Production Mode</span>
          </div>
          <a href={getSettingValue('system.site_url', 'http://localhost:5174')} target="_blank" rel="noreferrer" className="btn-view-site" title="View Site" aria-label="View Site">
            <Globe className="lucide-icon" size={16} />
            <span>View Site</span>
            <ExternalLink className="lucide-icon external-link-icon" size={14} />
          </a>
        </div>
      </aside>

      {mobileNavigation && !sidebarCollapsed && (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Main Panel Wrapper */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Open navigation"
            aria-expanded={!sidebarCollapsed}
            onClick={() => setSidebarCollapsed(false)}
          >
            <Menu className="lucide-icon" size={20} />
          </button>
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
          {(() => {
            const routePermissionsMap: Record<string, string> = {
              posts: 'content.read',
              categories: 'content.read',
              tags: 'content.read',
              pages: 'content.read',
              themes: 'themes.manage',
              widgets: 'themes.manage',
              navigation: 'settings.manage',
              plugins: 'plugins.manage',
              users: 'users.manage',
              settings: 'settings.manage',
              analytics: 'settings.manage',
              media: 'media.read',
            };

            if (currentRoute !== 'dashboard' && currentRoute !== 'login' && routePermissionsMap[currentRoute] && !hasPermission(routePermissionsMap[currentRoute])) {
              return (
                <div className="route-view forbidden-view" style={{ display: 'flex', flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                  <div className="card glass placeholder-container" style={{ textAlign: 'center', maxWidth: '400px', padding: '3rem' }}>
                    <span className="p-icon" style={{ fontSize: '3rem', display: 'block', marginBottom: '1.5rem' }}>🚫</span>
                    <h3 style={{ marginBottom: '0.75rem', fontSize: '1.5rem', fontWeight: 600 }}>Akses Ditolak</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
                      Anda tidak memiliki izin yang diperlukan untuk mengakses fitur atau halaman ini.
                    </p>
                    <button className="btn-primary" onClick={() => setCurrentRoute('dashboard')}>
                      Kembali ke Dashboard
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <>
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
                    <a href={getSettingValue('system.site_url', 'http://localhost:5174')} target="_blank" rel="noreferrer" className="q-btn-link">
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
            <ContentManager 
              user={user} 
              apiFetch={apiFetch} 
              pluginsList={pluginsList}
              postsSubView={pagesSubView} 
              setPostsSubView={setPagesSubView} 
              setCurrentRoute={setCurrentRoute}
              editingPostRouteId={editingPageRouteId}
              setEditingPostRouteId={setEditingPageRouteId}
              contentType="page"
            />
          )}

          {/* 3. POSTS VIEW */}
          {currentRoute === 'posts' && (
              <ContentManager 
                user={user} 
                apiFetch={apiFetch} 
                pluginsList={pluginsList}
                postsSubView={postsSubView} 
                setPostsSubView={setPostsSubView} 
                setCurrentRoute={setCurrentRoute}
                editingPostRouteId={editingPostRouteId}
                setEditingPostRouteId={setEditingPostRouteId}
                contentType="article"
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
                <PluginErrorBoundary pluginId={pluginRoute.id}>
                  <Component apiFetch={apiFetch} />
                </PluginErrorBoundary>
              </div>
            );
          })()}

          {/* 5. THEMES VIEW */}
          {currentRoute === 'themes' && (
            <div className="route-view themes-view">
              <div className="view-header-with-action">
                <div className="header-text">
                  <h2>Themes</h2>
                  <p>Manage the visual presentation of your public website.</p>
                </div>
                <button className="btn-primary-action" onClick={handleScanThemes}>
                  <Palette className="lucide-icon" size={18} /> Scan Themes
                </button>
              </div>

              {themesError && (
                <div className="tax-message error" style={{ marginBottom: '1.5rem' }}>
                  <AlertCircle size={16} />
                  <span>{themesError}</span>
                </div>
              )}

              {themesSuccess && (
                <div className="tax-message success" style={{ marginBottom: '1.5rem' }}>
                  <CheckCircle size={16} />
                  <span>{themesSuccess}</span>
                </div>
              )}

              {loadingThemes ? (
                <div className="placeholder-container glass">
                  <Loader2 className="animate-spin" size={28} />
                  <p>Loading themes...</p>
                </div>
              ) : themesList.length === 0 ? (
                <div className="placeholder-container glass">
                  <Palette className="lucide-icon" size={28} />
                  <h3>No Themes Found</h3>
                  <p>Place theme directories in the <code>themes/</code> folder with a valid <code>theme.json</code> manifest.</p>
                </div>
              ) : (
                <>
                  {/* Active Theme Section */}
                  {(() => {
                    const activeTheme = themesList.find(t => t.status === 'active');
                    if (!activeTheme) return (
                      <div className="card glass" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>No Active Theme</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Activate a theme below to control the public website presentation.</p>
                      </div>
                    );
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';
                    return (
                      <div className="active-theme-section" style={{ marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Active Theme</h3>
                        <div className="theme-banner-card glass">
                          <div className="theme-preview-mock" style={{ overflow: 'hidden', background: 'var(--bg-elevated)' }}>
                            <img
                              src={`${apiUrl}/api/admin/themes/${activeTheme.id}/screenshot`}
                              alt={activeTheme.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;height:100%"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/></svg></span>';
                              }}
                            />
                          </div>
                          <div className="theme-meta-details">
                            <h4>{activeTheme.name} <span className="theme-badge-active">ACTIVE</span></h4>
                            <p className="theme-desc">{activeTheme.manifest?.description || 'No description available.'}</p>
                            <div className="theme-metadata-row">
                              <span>Version {activeTheme.version}</span>
                              {activeTheme.manifest?.author && <span>By {activeTheme.manifest.author}</span>}
                            </div>
                            <div className="theme-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                              <button
                                className="btn-primary-action"
                                onClick={() => {
                                  setCurrentRoute('theme-settings');
                                  setThemeSettingsId(activeTheme.id);
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                              >
                                <Palette size={14} /> Customize
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Available (Inactive) Themes */}
                  {(() => {
                    const inactiveThemes = themesList.filter(t => t.status === 'inactive');
                    if (inactiveThemes.length === 0) return null;
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';
                    return (
                      <div className="available-themes-section" style={{ marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Available Themes</h3>
                        <div className="available-themes-grid">
                          {inactiveThemes.map(theme => (
                            <div key={theme.id} className="theme-card glass">
                              <div className="theme-card-preview" style={{ overflow: 'hidden', background: 'var(--bg-elevated)' }}>
                                <img
                                  src={`${apiUrl}/api/admin/themes/${theme.id}/screenshot`}
                                  alt={theme.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted)"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/></svg></span>';
                                  }}
                                />
                              </div>
                              <div className="theme-card-body">
                                <h5>{theme.name}</h5>
                                <p>{theme.manifest?.description || 'No description.'}</p>
                                <div className="theme-card-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                  <button
                                    className="t-btn-act"
                                    onClick={() => handleActivateTheme(theme.id)}
                                    disabled={activatingTheme === theme.id}
                                    style={{ flex: 1 }}
                                  >
                                    {activatingTheme === theme.id ? <><Loader2 size={14} className="animate-spin" /> Activating...</> : 'Activate'}
                                  </button>
                                  <button
                                    className="t-action-btn"
                                    onClick={() => {
                                      setCurrentRoute('theme-settings');
                                      setThemeSettingsId(theme.id);
                                    }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                                  >
                                    <Palette size={14} /> Customize
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Broken Themes */}
                  {(() => {
                    const brokenThemes = themesList.filter(t => t.status === 'broken');
                    if (brokenThemes.length === 0) return null;
                    return (
                      <div className="broken-themes-section">
                        <h3 style={{ marginBottom: '1rem', color: 'var(--color-danger, #e74c3c)' }}>Broken Themes</h3>
                        {brokenThemes.map(theme => (
                          <div key={theme.id} className="card glass" style={{ marginBottom: '0.75rem', padding: '1rem', borderLeft: '3px solid var(--color-danger, #e74c3c)' }}>
                            <strong>{theme.id}</strong>
                            <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>{theme.error || 'Invalid theme manifest'}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* 7. MENUS / NAVIGATION VIEW */}
          {currentRoute === 'navigation' && (
            <div className="route-view navigation-view">
              <div className="view-header-with-action">
                <div className="header-text">
                  <h2>Menu Management</h2>
                  <p>Configure and organize your website's navigation menus.</p>
                </div>
                <button 
                  className="btn-primary-action" 
                  onClick={() => {
                    setCustomLocationName('');
                    setShowCustomLocationModal(true);
                  }}
                >
                  ➕ Create New Location
                </button>
              </div>

              {/* Custom Location Modal */}
              {showCustomLocationModal && (
                <div className="modal-backdrop glass-blur" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="card glass modal-content" style={{ maxWidth: '400px', width: '90%', padding: '2rem' }}>
                    <h3>Create Menu Location</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                      Enter a location key (e.g., <code>header-top</code>, <code>sidebar</code>) to assign menus to.
                    </p>
                    <input 
                      type="text" 
                      placeholder="e.g. sidebar" 
                      className="search-filter-input"
                      style={{ width: '100%', marginBottom: '1.5rem', boxSizing: 'border-box' }}
                      value={customLocationName}
                      onChange={(e) => setCustomLocationName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    />
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                      <button className="t-action-btn" onClick={() => setShowCustomLocationModal(false)}>Cancel</button>
                      <button 
                        className="btn-primary-action"
                        onClick={() => {
                          if (customLocationName.trim()) {
                            if (!navLocationsList.includes(customLocationName)) {
                              setNavLocationsList([...navLocationsList, customLocationName]);
                            }
                            setNavLocation(customLocationName);
                            setShowCustomLocationModal(false);
                          }
                        }}
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {navError && (
                <div className="tax-message error" style={{ marginBottom: '1.5rem' }}>
                  <AlertCircle size={16} />
                  <span>{navError}</span>
                </div>
              )}

              {navSuccess && (
                <div className="tax-message success" style={{ marginBottom: '1.5rem' }}>
                  <CheckCircle size={16} />
                  <span>{navSuccess}</span>
                </div>
              )}

              <div className="themes-layout-split" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem' }}>
                
                {/* LEFT COLUMN: ADD ITEMS */}
                <div className="navigation-add-items" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>Add Menu Items</h3>

                  {/* 1. PAGES ACCORDION */}
                  <div className="card glass" style={{ padding: '1rem' }}>
                    <div 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={() => toggleAccordion('pages')}
                    >
                      <span>Pages</span>
                      {accordionState.pages ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    {accordionState.pages && (
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
                          {navPages.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No pages found.</p>
                          ) : (
                            navPages.map(page => (
                              <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedPages.includes(page.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPages([...selectedPages, page.id]);
                                    } else {
                                      setSelectedPages(selectedPages.filter(id => id !== page.id));
                                    }
                                  }}
                                />
                                <span>{page.title}</span>
                              </label>
                            ))
                          )}
                        </div>
                        <button 
                          className="t-btn-act" 
                          style={{ width: '100%', marginTop: '0.5rem' }}
                          disabled={selectedPages.length === 0}
                          onClick={handleAddPages}
                        >
                          Add to Menu
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. ARTICLES ACCORDION */}
                  <div className="card glass" style={{ padding: '1rem' }}>
                    <div 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={() => toggleAccordion('posts')}
                    >
                      <span>Articles</span>
                      {accordionState.posts ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    {accordionState.posts && (
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
                          {navPosts.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No articles found.</p>
                          ) : (
                            navPosts.map(post => (
                              <label key={post.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedPosts.includes(post.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPosts([...selectedPosts, post.id]);
                                    } else {
                                      setSelectedPosts(selectedPosts.filter(id => id !== post.id));
                                    }
                                  }}
                                />
                                <span>{post.title}</span>
                              </label>
                            ))
                          )}
                        </div>
                        <button 
                          className="t-btn-act" 
                          style={{ width: '100%', marginTop: '0.5rem' }}
                          disabled={selectedPosts.length === 0}
                          onClick={handleAddPosts}
                        >
                          Add to Menu
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3. CATEGORIES ACCORDION */}
                  <div className="card glass" style={{ padding: '1rem' }}>
                    <div 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={() => toggleAccordion('categories')}
                    >
                      <span>Categories</span>
                      {accordionState.categories ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    {accordionState.categories && (
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
                          {navCategories.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No categories found.</p>
                          ) : (
                            navCategories.map(cat => (
                              <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedCategories.includes(cat.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCategories([...selectedCategories, cat.id]);
                                    } else {
                                      setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                                    }
                                  }}
                                />
                                <span>{cat.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                        <button 
                          className="t-btn-act" 
                          style={{ width: '100%', marginTop: '0.5rem' }}
                          disabled={selectedCategories.length === 0}
                          onClick={handleAddCategories}
                        >
                          Add to Menu
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 4. TAGS ACCORDION */}
                  <div className="card glass" style={{ padding: '1rem' }}>
                    <div 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={() => toggleAccordion('tags')}
                    >
                      <span>Tags</span>
                      {accordionState.tags ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    {accordionState.tags && (
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
                          {navTags.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tags found.</p>
                          ) : (
                            navTags.map(tag => (
                              <label key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedTags.includes(tag.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTags([...selectedTags, tag.id]);
                                    } else {
                                      setSelectedTags(selectedTags.filter(id => id !== tag.id));
                                    }
                                  }}
                                />
                                <span>{tag.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                        <button 
                          className="t-btn-act" 
                          style={{ width: '100%', marginTop: '0.5rem' }}
                          disabled={selectedTags.length === 0}
                          onClick={handleAddTags}
                        >
                          Add to Menu
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 5. CUSTOM LINK ACCORDION */}
                  <div className="card glass" style={{ padding: '1rem' }}>
                    <div 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={() => toggleAccordion('custom')}
                    >
                      <span>Custom Links</span>
                      {accordionState.custom ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    {accordionState.custom && (
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>URL</label>
                          <input 
                            type="text" 
                            placeholder="https://..." 
                            className="search-filter-input"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                            value={newCustomUrl}
                            onChange={(e) => setNewCustomUrl(e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Link Text</label>
                          <input 
                            type="text" 
                            placeholder="Menu Label" 
                            className="search-filter-input"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                            value={newCustomLabel}
                            onChange={(e) => setNewCustomLabel(e.target.value)}
                          />
                        </div>
                        <button 
                          className="t-btn-act" 
                          style={{ width: '100%', marginTop: '0.5rem' }}
                          disabled={!newCustomUrl || !newCustomLabel}
                          onClick={handleAddCustomLink}
                        >
                          Add to Menu
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* RIGHT COLUMN: MENU STRUCTURE */}
                <div className="navigation-structure-edit" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="card glass" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                      <label style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Select a menu to edit:</label>
                      <select 
                        className="filter-select" 
                        style={{ minWidth: '200px' }}
                        value={navLocation}
                        onChange={(e) => setNavLocation(e.target.value)}
                      >
                        {navLocationsList.map(loc => (
                          <option key={loc} value={loc}>
                            {loc.charAt(0).toUpperCase() + loc.slice(1)} Navigation ({loc})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button 
                      className="t-action-btn"
                      onClick={() => loadNavigation(navLocation)}
                      disabled={loadingNav}
                    >
                      <RotateCw size={14} className={loadingNav ? 'animate-spin' : ''} style={{ marginRight: '0.25rem' }} /> Refresh
                    </button>
                  </div>

                  <div className="card glass" style={{ padding: '1.5rem', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>Menu Structure</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 2rem 0' }}>
                      Arrange the items below in your preferred order. Click Move Up/Down to sort, Indent/Outdent to nest items, and expand items to edit details.
                    </p>

                    {loadingNav ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem' }}>
                        <Loader2 className="animate-spin" size={32} />
                        <p>Loading menu items...</p>
                      </div>
                    ) : navItems.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, border: '2px dashed var(--border)', borderRadius: '12px', padding: '3rem 1rem' }}>
                        <Globe size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Menu is Empty</h4>
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '300px', fontSize: '0.85rem', margin: 0 }}>
                          Select pages or items on the left side and click "Add to Menu" to begin customizing.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, marginBottom: '2rem' }}>
                        {navItems.map((item, idx) => {
                          const depth = getItemDepth(item, navItems);
                          const isExpanded = item._expanded === true;
                          const toggleItemExpand = () => {
                            const updated = [...navItems];
                            updated[idx]._expanded = !isExpanded;
                            setNavItems(updated);
                          };

                          const updateItemField = (field: string, val: any) => {
                            const updated = [...navItems];
                            updated[idx][field] = val;
                            setNavItems(updated);
                          };

                          return (
                            <div key={item.tempId} style={{ paddingLeft: `${depth * 2}rem`, transition: 'all 0.2s' }}>
                              <div 
                                className="card glass" 
                                style={{ 
                                  padding: '0.75rem 1rem', 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  borderLeft: depth > 0 ? '4px solid var(--primary)' : '1px solid var(--border)',
                                  background: 'var(--bg-elevated)',
                                  boxShadow: 'none'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                    <span style={{ cursor: 'move', color: 'var(--text-muted)', userSelect: 'none' }}>☰</span>
                                    <span style={{ fontWeight: 'bold' }}>{item.label}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                      {item.url.startsWith('http') || item.url.startsWith('/') === false ? 'Custom Link' : 'Internal'}
                                    </span>
                                  </div>
                                  
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <button className="t-action-btn" title="Move Up" disabled={idx === 0} onClick={() => moveItemUp(idx)}>▲</button>
                                    <button className="t-action-btn" title="Move Down" disabled={idx === navItems.length - 1} onClick={() => moveItemDown(idx)}>▼</button>
                                    <button className="t-action-btn" title="Indent (Nest)" disabled={idx === 0} onClick={() => indentItem(idx)}>▶</button>
                                    <button className="t-action-btn" title="Outdent" disabled={!item.parentTempId} onClick={() => outdentItem(idx)}>◀</button>
                                    <button className="t-action-btn" onClick={toggleItemExpand}>{isExpanded ? 'Collapse' : 'Edit'}</button>
                                    <button className="t-action-btn danger" onClick={() => removeItem(idx)}>Remove</button>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Navigation Label</label>
                                      <input 
                                        type="text" 
                                        value={item.label} 
                                        className="search-filter-input"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        onChange={(e) => updateItemField('label', e.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>URL</label>
                                      <input 
                                        type="text" 
                                        value={item.url} 
                                        className="search-filter-input"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        onChange={(e) => updateItemField('url', e.target.value)}
                                      />
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Open link in</label>
                                      <select 
                                        className="filter-select"
                                        style={{ width: '100%' }}
                                        value={item.target}
                                        onChange={(e) => updateItemField('target', e.target.value)}
                                      >
                                        <option value="_self">Same Window / Tab (_self)</option>
                                        <option value="_blank">New Window / Tab (_blank)</option>
                                      </select>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                      <button 
                        className="btn-primary-action" 
                        onClick={saveNavigation}
                        disabled={savingNav || loadingNav}
                      >
                        {savingNav ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Menu'}
                      </button>
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
                <input
                  ref={packageUploadRef}
                  type="file"
                  accept=".zip,application/zip"
                  hidden
                  onChange={(event) => void handleLocalPackageUpload(event.target.files?.[0] || null)}
                />
                <button className="btn-primary-action" disabled={installingPackage} onClick={() => packageUploadRef.current?.click()}>
                  {installingPackage ? <Loader2 className="animate-spin" size={18} /> : <Plug className="lucide-icon" size={18} />}
                  {installingPackage ? 'Installing...' : 'Install Plugin'}
                </button>
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
                <button 
                  className="btn-primary-action"
                  onClick={() => {
                    setEditingUser(null);
                    setUserFormUsername('');
                    setUserFormEmail('');
                    setUserFormPassword('');
                    setUserFormRoleId('');
                    setUserFormStatus('active');
                    setUsersError(null);
                    setUsersSuccess(null);
                    setUserModalOpen(true);
                  }}
                >
                  <UserPlus className="lucide-icon" size={18} /> Add New User
                </button>
              </div>

              {usersError && (
                <div className="tax-message error" style={{ marginBottom: '1.5rem' }}>
                  <AlertCircle size={16} />
                  <span>{usersError}</span>
                </div>
              )}

              {usersSuccess && (
                <div className="tax-message success" style={{ marginBottom: '1.5rem' }}>
                  <CheckCircle size={16} />
                  <span>{usersSuccess}</span>
                </div>
              )}

              <div className="card glass no-padding">
                <div className="table-container">
                  {loadingUsers ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                      <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                      <p>Loading users...</p>
                    </div>
                  ) : usersList.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                      <p>No users found.</p>
                    </div>
                  ) : (
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
                        {usersList.map((u) => {
                          const isSelf = user ? u.id === user.id : false;
                          const roleLabel = u.roles && u.roles.length > 0 ? u.roles[0] : 'No Role';
                          const roleClass = roleLabel.toLowerCase();
                          
                          return (
                            <tr key={u.id}>
                              <td>
                                <span className="title-bold">{u.username}</span> {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(You)</span>}
                              </td>
                              <td>{u.email}</td>
                              <td>
                                <span className={`user-role-badge ${roleClass}`}>{roleLabel}</span>
                              </td>
                              <td>
                                <span className={`status-badge ${u.status === 'active' ? 'published' : u.status === 'pending' ? 'draft' : 'error'}`}>
                                  {u.status}
                                </span>
                              </td>
                              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                              <td className="table-actions">
                                <button 
                                  className="t-action-btn"
                                  onClick={() => {
                                    setEditingUser(u);
                                    setUserFormUsername(u.username);
                                    setUserFormEmail(u.email);
                                    setUserFormPassword('');
                                    setUserFormRoleId(u.roleIds && u.roleIds.length > 0 ? u.roleIds[0] : '');
                                    setUserFormStatus(u.status);
                                    setUsersError(null);
                                    setUsersSuccess(null);
                                    setUserModalOpen(true);
                                  }}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="t-action-btn danger" 
                                  disabled={isSelf}
                                  onClick={() => handleDeleteUser(u.id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Add/Edit User Modal */}
              {userModalOpen && (
                <div className="modal-backdrop glass-blur" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="card glass modal-content" style={{ maxWidth: '400px', width: '90%', padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
                      <button className="btn-close" style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => {
                        setUserModalOpen(false);
                        setEditingUser(null);
                      }}>×</button>
                    </div>
                    
                    <form onSubmit={handleSaveUser} className="settings-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                      <div className="s-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Username</label>
                        <input 
                          type="text" 
                          value={userFormUsername}
                          onChange={(e) => setUserFormUsername(e.target.value)}
                          required
                          disabled={userFormSubmitting}
                          placeholder="Username"
                        />
                      </div>
                      <div className="s-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Email</label>
                        <input 
                          type="email" 
                          value={userFormEmail}
                          onChange={(e) => setUserFormEmail(e.target.value)}
                          required
                          disabled={userFormSubmitting}
                          placeholder="Email address"
                        />
                      </div>
                      <div className="s-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          Password {editingUser && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(Leave blank to keep current)</span>}
                        </label>
                        <input 
                          type="password" 
                          value={userFormPassword}
                          onChange={(e) => setUserFormPassword(e.target.value)}
                          required={!editingUser}
                          disabled={userFormSubmitting}
                          placeholder="Password"
                        />
                      </div>
                      <div className="s-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Role</label>
                        <select 
                          value={userFormRoleId}
                          onChange={(e) => setUserFormRoleId(e.target.value === '' ? '' : Number(e.target.value))}
                          required
                          disabled={userFormSubmitting}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        >
                          <option value="">Select a Role</option>
                          {rolesList.map((role) => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="s-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Status</label>
                        <select 
                          value={userFormStatus}
                          onChange={(e) => setUserFormStatus(e.target.value)}
                          required
                          disabled={userFormSubmitting}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                        <button 
                          type="button" 
                          className="btn-secondary" 
                          onClick={() => {
                            setUserModalOpen(false);
                            setEditingUser(null);
                          }}
                          disabled={userFormSubmitting}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="btn-primary"
                          disabled={userFormSubmitting}
                        >
                          {userFormSubmitting ? 'Saving...' : 'Save User'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentRoute === 'settings' && (
            <div className="route-view settings-view">
              <div className="view-header">
                <h2>Settings</h2>
                <p>Configure general parameters, reading visibility, and platform security rules.</p>
              </div>

              {settingsError && (
                <div className="tax-message error" style={{ marginBottom: '1.5rem' }}>
                  <AlertCircle size={16} />
                  <span>{settingsError}</span>
                </div>
              )}

              {settingsSuccess && (
                <div className="tax-message success" style={{ marginBottom: '1.5rem' }}>
                  <CheckCircle size={16} />
                  <span>{settingsSuccess}</span>
                </div>
              )}

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
                          <select
                            value={homepageMode}
                            onChange={(e) => setHomepageMode(e.target.value)}
                          >
                            <option value="posts">Your latest posts</option>
                            <option value="single">A static page (select below)</option>
                          </select>
                        </div>

                        {homepageMode === 'single' && (
                          <div style={{ paddingLeft: '1.5rem', borderLeft: '2px solid var(--border, #dde2ea)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="s-group" style={{ margin: 0 }}>
                              <label>Homepage</label>
                              <select
                                value={homepageTarget}
                                onChange={(e) => setHomepageTarget(e.target.value)}
                              >
                                <option value="">-- Select a Page --</option>
                                {navPages.map((page) => (
                                  <option key={page.uuid} value={page.uuid}>
                                    {page.title} (/{page.slug})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="s-group" style={{ margin: 0 }}>
                              <label>Posts page</label>
                              <select
                                value={postsPageTarget}
                                onChange={(e) => setPostsPageTarget(e.target.value)}
                              >
                                <option value="">-- Select a Page --</option>
                                {navPages.map((page) => (
                                  <option key={page.uuid} value={page.uuid}>
                                    {page.title} (/{page.slug})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        <div className="s-group">
                          <label>Blog pages show at most</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={postsPerPage}
                            onChange={(e) => setPostsPerPage(parseInt(e.target.value, 10) || 10)}
                          />
                        </div>
                        <div className="s-group">
                          <label>Permalink structure for posts</label>
                          <select
                            value={permalinkStructure}
                            onChange={(e) => setPermalinkStructure(e.target.value)}
                          >
                            <option value="/%postname%/">Post name (e.g. http://localhost:5174/sample-post)</option>
                            <option value="/posts/%postname%/">Posts prefix (e.g. http://localhost:5174/posts/sample-post)</option>
                            <option value="/article/%postname%/">Article prefix (e.g. http://localhost:5174/article/sample-post)</option>
                          </select>
                        </div>
                        <button
                          className="btn-save-settings"
                          disabled={savingSettings}
                          onClick={handleSaveReadingSettings}
                        >
                          {savingSettings ? 'Saving...' : 'Save Reading Changes'}
                        </button>
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

          {/* 11. WIDGETS VIEW */}
          {currentRoute === 'widgets' && (
            <WidgetsPage />
          )}

          {/* 10. THEME SETTINGS (CUSTOMIZATION) VIEW */}
          {currentRoute === 'theme-settings' && themeSettingsId && (
            <ThemeSettingsPage
              themeId={themeSettingsId}
              themeName={themesList.find(t => t.id === themeSettingsId)?.name}
              onBack={() => {
                setCurrentRoute('themes');
                setThemeSettingsId(null);
              }}
            />
          )}
        </>
      );
    })()}
  </main>
      </div>
    </div>
  );
}
