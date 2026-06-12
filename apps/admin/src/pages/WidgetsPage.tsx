import { useEffect, useState, useCallback } from 'react';
import { 
  Loader2, Plus, Trash2, Edit3, ChevronUp, ChevronDown, 
  AlertCircle, CheckCircle, LayoutTemplate, 
  Search, Code, FileText
} from 'lucide-react';

interface Widget {
  id: number;
  themeId: string;
  region: string;
  type: string;
  title: string;
  settings: Record<string, any>;
  sortOrder: number;
}

interface ThemeRegion {
  label: string;
  description?: string;
}

interface Theme {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  manifest: {
    regions?: Record<string, ThemeRegion>;
  };
}

const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:4000';

export default function WidgetsPage() {
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [modalRegion, setModalRegion] = useState('');
  const [widgetType, setWidgetType] = useState('html');
  const [widgetTitle, setWidgetTitle] = useState('');
  
  // Widget specific settings
  const [postsLimit, setPostsLimit] = useState(5);
  const [htmlContent, setHtmlContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load active theme and widgets
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get themes list to find active theme
      const themesRes = await fetch(`${apiUrl}/api/admin/themes`, { credentials: 'include' });
      const themesData = await themesRes.json();
      if (!themesRes.ok) throw new Error(themesData.error || 'Failed to load themes');

      const activeThemeId = themesData.activeThemeId;
      const foundTheme = themesData.themes.find((t: any) => t.id === activeThemeId);
      setActiveTheme(foundTheme || null);

      if (activeThemeId) {
        // 2. Get widgets for the active theme
        const widgetsRes = await fetch(`${apiUrl}/api/widgets?themeId=${activeThemeId}`, { credentials: 'include' });
        const widgetsData = await widgetsRes.json();
        if (!widgetsRes.ok) throw new Error(widgetsData.error || 'Failed to load widgets');
        setWidgets(widgetsData);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading widget configuration data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open modal to Add Widget
  const handleAddWidgetClick = (region: string) => {
    setEditingWidget(null);
    setModalRegion(region);
    setWidgetType('html');
    setWidgetTitle('');
    setPostsLimit(5);
    setHtmlContent('');
    setModalOpen(true);
  };

  // Open modal to Edit Widget
  const handleEditWidgetClick = (widget: Widget) => {
    setEditingWidget(widget);
    setModalRegion(widget.region);
    setWidgetType(widget.type);
    setWidgetTitle(widget.title);
    
    if (widget.type === 'recent_posts') {
      setPostsLimit(widget.settings?.limit || 5);
    } else if (widget.type === 'html') {
      setHtmlContent(widget.settings?.content || '');
    }
    setModalOpen(true);
  };

  // Save Widget (Create or Update)
  const handleSaveWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTheme) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const widgetSettings: Record<string, any> = {};
    if (widgetType === 'recent_posts') {
      widgetSettings.limit = Number(postsLimit);
    } else if (widgetType === 'html') {
      widgetSettings.content = htmlContent;
    }

    try {
      const isEdit = !!editingWidget;
      const url = isEdit ? `${apiUrl}/api/widgets/${editingWidget.id}` : `${apiUrl}/api/widgets`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload: any = {
        title: widgetTitle,
        region: modalRegion,
        settings: widgetSettings,
      };

      if (!isEdit) {
        payload.themeId = activeTheme.id;
        payload.type = widgetType;
        // Determine sort order (append at the end of the region)
        const regionWidgets = widgets.filter(w => w.region === modalRegion);
        payload.sortOrder = regionWidgets.length > 0 
          ? Math.max(...regionWidgets.map(w => w.sortOrder)) + 10 
          : 10;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save widget.');

      setSuccess(isEdit ? 'Widget updated successfully!' : 'Widget added successfully!');
      setModalOpen(false);
      
      // Reload widgets
      const widgetsRes = await fetch(`${apiUrl}/api/widgets?themeId=${activeTheme.id}`, { credentials: 'include' });
      const widgetsData = await widgetsRes.json();
      if (widgetsRes.ok) setWidgets(widgetsData);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving widget.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Widget
  const handleDeleteWidget = async (id: number) => {
    if (!confirm('Are you sure you want to delete this widget?')) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${apiUrl}/api/widgets/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete widget.');

      setSuccess('Widget deleted successfully.');
      setWidgets(prev => prev.filter(w => w.id !== id));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete widget.');
    }
  };

  // Move Widget Order Up/Down
  const handleMoveOrder = async (widget: Widget, direction: 'up' | 'down') => {
    const regionWidgets = widgets.filter(w => w.region === widget.region).sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = regionWidgets.findIndex(w => w.id === widget.id);
    
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === regionWidgets.length - 1) return;

    const swapTargetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetWidget = regionWidgets[swapTargetIndex];

    // Swap sortOrder
    const currentOrder = widget.sortOrder;
    const targetOrder = targetWidget.sortOrder === currentOrder 
      ? (direction === 'up' ? currentOrder - 5 : currentOrder + 5)
      : targetWidget.sortOrder;

    try {
      setLoading(true);
      
      // Update both widgets' order
      await Promise.all([
        fetch(`${apiUrl}/api/widgets/${widget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sortOrder: targetOrder }),
        }),
        fetch(`${apiUrl}/api/widgets/${targetWidget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sortOrder: currentOrder }),
        })
      ]);

      // Reload list
      if (activeTheme) {
        const widgetsRes = await fetch(`${apiUrl}/api/widgets?themeId=${activeTheme.id}`, { credentials: 'include' });
        const widgetsData = await widgetsRes.json();
        if (widgetsRes.ok) setWidgets(widgetsData);
      }
    } catch (err: any) {
      setError('Failed to update widget order.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && widgets.length === 0) {
    return (
      <div className="route-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={32} />
          <p style={{ marginTop: '1rem' }}>Loading sidebar widgets configuration...</p>
        </div>
      </div>
    );
  }

  // Active theme regions
  const declaredRegions = activeTheme?.manifest?.regions || {};

  return (
    <div className="route-view widgets-view">
      <div className="view-header" style={{ marginBottom: '1.5rem' }}>
        <h2>Widgets & Sidebar</h2>
        <p>Configure widgets (e.g. recent posts, custom HTML) in regions provided by the active theme: <strong style={{ color: 'var(--primary)' }}>{activeTheme?.name || 'Loading theme...'}</strong>.</p>
      </div>

      {error && (
        <div className="tax-message error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="tax-message success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle size={16} /> <span>{success}</span>
        </div>
      )}

      {Object.keys(declaredRegions).length === 0 ? (
        <div className="card glass placeholder-container" style={{ padding: '3rem', textAlign: 'center' }}>
          <span className="p-icon" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🚫</span>
          <h3>No Widget Regions Declared</h3>
          <p style={{ color: 'var(--text-muted)' }}>The active theme does not declare any visual widget regions in its <code>theme.json</code> manifest.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {Object.entries(declaredRegions).map(([regionKey, region]) => {
            const regionWidgets = widgets
              .filter(w => w.region === regionKey)
              .sort((a, b) => a.sortOrder - b.sortOrder);

            return (
              <div key={regionKey} data-region={regionKey} className="card glass" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'rgba(20,20,25,0.4)', minHeight: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.1rem' }}>
                      <LayoutTemplate size={16} style={{ color: 'var(--primary)' }} />
                      {region.label}
                    </h3>
                    {region.description && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>{region.description}</span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.65rem', background: 'var(--bg-elevated)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {regionKey}
                  </span>
                </div>

                {/* Widgets inside region */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, margin: '1rem 0' }}>
                  {regionWidgets.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', border: '1px dashed var(--border)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Empty region. Add a widget below to start.
                    </div>
                  ) : (
                    regionWidgets.map((w, index) => (
                      <div 
                        key={w.id} 
                        className="widget-instance-row"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '0.75rem 1rem', 
                          background: 'rgba(255,255,255,0.02)', 
                          border: '1px solid var(--border)', 
                          borderRadius: '8px',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ color: 'var(--primary)' }}>
                            {w.type === 'search' && <Search size={16} />}
                            {w.type === 'recent_posts' && <FileText size={16} />}
                            {w.type === 'html' && <Code size={16} />}
                          </span>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', display: 'block' }}>{w.title || `Untitled ${w.type}`}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Type: {w.type}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button 
                            className="t-action-btn" 
                            disabled={index === 0} 
                            onClick={() => handleMoveOrder(w, 'up')}
                            style={{ padding: '0.2rem', minWidth: 'auto', background: 'transparent' }}
                            title="Move Up"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button 
                            className="t-action-btn" 
                            disabled={index === regionWidgets.length - 1} 
                            onClick={() => handleMoveOrder(w, 'down')}
                            style={{ padding: '0.2rem', minWidth: 'auto', background: 'transparent' }}
                            title="Move Down"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button 
                            className="t-action-btn" 
                            onClick={() => handleEditWidgetClick(w)}
                            style={{ padding: '0.2rem', minWidth: 'auto', background: 'transparent' }}
                            title="Edit settings"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button 
                            className="t-action-btn danger" 
                            onClick={() => handleDeleteWidget(w.id)}
                            style={{ padding: '0.2rem', minWidth: 'auto', background: 'transparent' }}
                            title="Remove widget"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button 
                  className="btn-primary-action" 
                  onClick={() => handleAddWidgetClick(regionKey)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: '1px dashed var(--primary)' }}
                >
                  <Plus size={14} /> Add Widget
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Widget Modal */}
      {modalOpen && (
        <div className="modal-backdrop glass-blur" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card glass modal-content" style={{ maxWidth: '500px', width: '90%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{editingWidget ? 'Edit Widget settings' : `Add Widget to ${declaredRegions[modalRegion]?.label}`}</h3>
              <button 
                className="btn-close" 
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }} 
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSaveWidget} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              {!editingWidget && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Widget Type</label>
                  <select 
                    value={widgetType}
                    onChange={(e) => setWidgetType(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                  >
                    <option value="html">Custom HTML / Text</option>
                    <option value="recent_posts">Recent Posts list</option>
                    <option value="search">Search Form</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Widget Title</label>
                <input 
                  type="text" 
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  placeholder="e.g. About Me, Recent Articles"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                />
              </div>

              {widgetType === 'recent_posts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Number of posts to display</label>
                  <input 
                    type="number" 
                    value={postsLimit}
                    onChange={(e) => setPostsLimit(Math.max(1, Number(e.target.value)))}
                    min={1}
                    max={20}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {widgetType === 'html' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>HTML / Text Content</label>
                  <textarea 
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    placeholder="Enter custom HTML or plain text here..."
                    rows={6}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontFamily: 'monospace', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Widget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
