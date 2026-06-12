import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Check, X, ShieldAlert, Trash2, Settings, Loader2, AlertCircle, Info
} from 'lucide-react';

interface CommentItem {
  id: number;
  uuid: string;
  targetType: string;
  targetUuid: string;
  parentCommentUuid: string | null;
  authorId: number | null;
  guestName: string | null;
  guestEmail: string | null;
  body: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  createdAt: string;
  updatedAt: string;
  authorName?: string; // If resolved
  targetTitle?: string;
  targetUrl?: string | null;
}

interface CommentsPageProps {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

export default function CommentsPage({ apiFetch }: CommentsPageProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);  // Settings
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [commentsEnabled, setCommentsEnabled] = useState<boolean>(true);
  const [allowGuest, setAllowGuest] = useState<boolean>(true);
  const [requireApproval, setRequireApproval] = useState<boolean>(false);
  const [maxDepth, setMaxDepth] = useState<number>(3);
  const [defaultEnabledPage, setDefaultEnabledPage] = useState<boolean>(false);
  const [defaultEnabledArticle, setDefaultEnabledArticle] = useState<boolean>(true);
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);

  const loadComments = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/comments/admin');
      if (res.ok) {
        const data = await res.json();
        setComments(data.items || []);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Gagal memuat daftar komentar');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Koneksi bermasalah saat memuat komentar');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await apiFetch('/api/admin/settings/scope/comments');
      if (res.ok) {
        const data = await res.json();
        // data is an array of { key, value }
        const settingsMap: Record<string, string> = {};
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            settingsMap[item.key] = item.value;
          });
        }
        
        if (settingsMap['comments.enabled'] !== undefined) {
          setCommentsEnabled(settingsMap['comments.enabled'] === 'true');
        }
        if (settingsMap['comments.allow_guest'] !== undefined) {
          setAllowGuest(settingsMap['comments.allow_guest'] === 'true');
        }
        if (settingsMap['comments.require_approval'] !== undefined) {
          setRequireApproval(settingsMap['comments.require_approval'] === 'true');
        }
        if (settingsMap['comments.max_depth'] !== undefined) {
          setMaxDepth(parseInt(settingsMap['comments.max_depth'], 10) || 3);
        }
        if (settingsMap['comments.default_enabled_page'] !== undefined) {
          setDefaultEnabledPage(settingsMap['comments.default_enabled_page'] === 'true');
        }
        if (settingsMap['comments.default_enabled_article'] !== undefined) {
          setDefaultEnabledArticle(settingsMap['comments.default_enabled_article'] === 'true');
        }
      }
    } catch (err) {
      console.error('Failed to load comments settings', err);
    }
  };
  useEffect(() => {
    loadComments();
    loadSettings();
  }, []);

  const handleUpdateStatus = async (uuid: string, status: 'approved' | 'rejected' | 'spam') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch(`/api/comments/${uuid}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        setSuccessMsg(`Komentar berhasil ditandai sebagai ${status}`);
        // update local list
        setComments(prev => prev.map(c => c.uuid === uuid ? { ...c, status } : c));
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Gagal merubah status komentar');
      }
    } catch (err) {
      setErrorMsg('Gagal merubah status komentar');
    }
  };

  const handleDeleteComment = async (uuid: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus komentar ini secara permanen beserta balasannya?')) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch(`/api/comments/${uuid}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setSuccessMsg('Komentar berhasil dihapus permanen');
        // reload since replies are recursively deleted on server
        loadComments();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Gagal menghapus komentar');
      }
    } catch (err) {
      setErrorMsg('Gagal menghapus komentar');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Save settings individually
      const settingsToSave = [
        { key: 'comments.enabled', value: commentsEnabled ? 'true' : 'false', type: 'boolean', isPublic: true },
        { key: 'comments.allow_guest', value: allowGuest ? 'true' : 'false', type: 'boolean', isPublic: true },
        { key: 'comments.require_approval', value: requireApproval ? 'true' : 'false', type: 'boolean', isPublic: true },
        { key: 'comments.max_depth', value: String(maxDepth), type: 'number', isPublic: true },
        { key: 'comments.default_enabled_page', value: defaultEnabledPage ? 'true' : 'false', type: 'boolean', isPublic: true },
        { key: 'comments.default_enabled_article', value: defaultEnabledArticle ? 'true' : 'false', type: 'boolean', isPublic: true }
      ];

      for (const item of settingsToSave) {
        await apiFetch(`/api/admin/settings/${item.key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: item.value,
            group: 'comments',
            type: item.type,
            isPublic: item.isPublic,
            description: `Setting comments for ${item.key}`
          })
        });
      }

      setSuccessMsg('Pengaturan modul komentar berhasil disimpan.');
      setShowSettings(false);
    } catch (err) {
      setErrorMsg('Gagal menyimpan pengaturan');
    } finally {
      setSettingsSaving(false);
    }
  };

  const filteredComments = comments.filter(c => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'white', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Moderasi Komentar</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Kelola diskusi dan komentar yang diajukan oleh pengguna di platform ModernCMS.
          </p>
        </div>
        <div>
          <button 
            onClick={() => setShowSettings(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '0.5rem 1rem', 
              color: 'white', 
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.9rem',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          >
            <Settings size={16} /> Pengaturan
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="login-error-box" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--accent-danger-bg, rgba(239, 68, 68, 0.1))', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#fca5a5' }}>
          <AlertCircle size={18} style={{ color: '#ef4444' }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="login-error-box" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#a7f3d0' }}>
          <Check size={18} style={{ color: '#10b981' }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {['all', 'pending', 'approved', 'rejected', 'spam'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={{
              background: filterStatus === status ? 'var(--accent-purple, #8b5cf6)' : 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '0.35rem 0.85rem',
              fontSize: '0.8rem',
              color: filterStatus === status ? 'white' : 'var(--text-secondary, #9ca3af)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textTransform: 'capitalize'
            }}
          >
            {status === 'all' ? 'Semua' : status}
          </button>
        ))}
      </div>

      {/* Main List Table */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.02)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '12px', 
        padding: '1.25rem',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexGrow: 1 }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-purple, #8b5cf6)', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Memuat komentar...</p>
          </div>
        ) : filteredComments.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', color: 'var(--text-muted)', gap: '1rem', textAlign: 'center', flexGrow: 1 }}>
            <MessageSquare size={48} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ color: 'var(--text-secondary)', margin: 0 }}>Tidak ada komentar</h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              {filterStatus === 'all' 
                ? 'Belum ada diskusi atau komentar yang masuk di CMS.' 
                : `Tidak ada komentar dengan status "${filterStatus}".`}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Pengirim</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Isi Komentar</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Target Entitas</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Tanggal</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredComments.map((comment) => {
                  let statusBg = 'rgba(245, 158, 11, 0.15)'; // pending - amber
                  let statusColor = '#f59e0b';
                  if (comment.status === 'approved') {
                    statusBg = 'rgba(16, 185, 129, 0.15)';
                    statusColor = '#10b981';
                  } else if (comment.status === 'rejected') {
                    statusBg = 'rgba(239, 68, 68, 0.15)';
                    statusColor = '#ef4444';
                  } else if (comment.status === 'spam') {
                    statusBg = 'rgba(107, 114, 128, 0.2)';
                    statusColor = '#9ca3af';
                  }

                  return (
                    <tr 
                      key={comment.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-color)', 
                        background: comment.status === 'pending' ? 'rgba(245, 158, 11, 0.02)' : ''
                      }}
                    >
                      <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600 }}>{comment.authorName || (comment.authorId ? `User ID: ${comment.authorId}` : comment.guestName)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {comment.authorId ? 'Anggota Terdaftar' : comment.guestEmail}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', verticalAlign: 'top', maxWidth: '300px' }}>
                        <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{comment.body}</div>
                        {comment.parentCommentUuid && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent-purple)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Info size={10} /> Balasan untuk komentar ID: {comment.parentCommentUuid.slice(0, 8)}...
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', verticalAlign: 'top', maxWidth: '220px' }}>
                        <span style={{ display: 'inline-block', padding: '0.15rem 0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '0.35rem' }}>
                          {comment.targetType}
                        </span>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {comment.targetUrl ? (
                            <a 
                              href={`http://localhost:5174${comment.targetUrl}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ color: 'var(--accent-purple, #8b5cf6)', textDecoration: 'none', transition: 'opacity 0.2s' }}
                              onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                              onMouseOut={e => e.currentTarget.style.opacity = '1'}
                            >
                              {comment.targetTitle || 'Lihat Halaman'}
                            </a>
                          ) : (
                            <span>{comment.targetTitle || comment.targetUuid}</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'monospace' }} title={comment.targetUuid}>
                          {comment.targetUuid.slice(0, 8)}...
                        </div>
                      </td>
                      <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                        <span style={{ 
                          display: 'inline-block', 
                          padding: '0.25rem 0.5rem', 
                          background: statusBg, 
                          color: statusColor, 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          textTransform: 'uppercase' 
                        }}>
                          {comment.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', verticalAlign: 'top', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(comment.createdAt).toLocaleDateString()}
                        <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', verticalAlign: 'top', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          {comment.status !== 'approved' && (
                            <button
                              onClick={() => handleUpdateStatus(comment.uuid, 'approved')}
                              title="Setujui Komentar"
                              style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.35rem', borderRadius: '4px', cursor: 'pointer', color: '#10b981' }}
                            >
                              <Check size={14} />
                            </button>
                          )}
                          {comment.status !== 'rejected' && (
                            <button
                              onClick={() => handleUpdateStatus(comment.uuid, 'rejected')}
                              title="Tolak Komentar"
                              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.35rem', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}
                            >
                              <X size={14} />
                            </button>
                          )}
                          {comment.status !== 'spam' && (
                            <button
                              onClick={() => handleUpdateStatus(comment.uuid, 'spam')}
                              title="Tandai Spam"
                              style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.35rem', borderRadius: '4px', cursor: 'pointer', color: '#f59e0b' }}
                            >
                              <ShieldAlert size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteComment(comment.uuid)}
                            title="Hapus Permanen"
                            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', padding: '0.35rem', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <form 
            onSubmit={handleSaveSettings}
            style={{ background: '#111', border: '1px solid var(--border-color)', borderRadius: '12px', width: '440px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Pengaturan Modul Komentar</h3>
              <button 
                type="button" 
                onClick={() => setShowSettings(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Toggle Enabled */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox"
                  id="comments-enabled"
                  checked={commentsEnabled}
                  onChange={(e) => setCommentsEnabled(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="comments-enabled" style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, userSelect: 'none' }}>
                  Aktifkan Komentar Secara Global
                </label>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Jika dinonaktifkan, kolom komentar tidak akan dirender di halaman publik.
              </span>
            </div>

             {/* Default for Pages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox"
                  id="default-enabled-page"
                  checked={defaultEnabledPage}
                  onChange={(e) => setDefaultEnabledPage(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                  disabled={!commentsEnabled}
                />
                <label htmlFor="default-enabled-page" style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, userSelect: 'none', color: commentsEnabled ? 'white' : 'var(--text-muted)' }}>
                  Aktifkan Komentar pada Halaman (Page) secara Default
                </label>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Menentukan apakah halaman (page) baru memiliki komentar aktif secara default.
              </span>
            </div>

            {/* Default for Articles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox"
                  id="default-enabled-article"
                  checked={defaultEnabledArticle}
                  onChange={(e) => setDefaultEnabledArticle(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                  disabled={!commentsEnabled}
                />
                <label htmlFor="default-enabled-article" style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, userSelect: 'none', color: commentsEnabled ? 'white' : 'var(--text-muted)' }}>
                  Aktifkan Komentar pada Artikel secara Default
                </label>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Menentukan apakah artikel baru memiliki komentar aktif secara default.
              </span>
            </div>

            {/* Allow Guest */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox"
                  id="allow-guest"
                  checked={allowGuest}
                  onChange={(e) => setAllowGuest(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                  disabled={!commentsEnabled}
                />
                <label htmlFor="allow-guest" style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, userSelect: 'none', color: commentsEnabled ? 'white' : 'var(--text-muted)' }}>
                  Izinkan Tamu Menulis Komentar
                </label>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Tamu tidak terdaftar wajib mengisi Nama dan Email saat berkomentar.
              </span>
            </div>

            {/* Require Approval */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox"
                  id="require-approval"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                  disabled={!commentsEnabled}
                />
                <label htmlFor="require-approval" style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, userSelect: 'none', color: commentsEnabled ? 'white' : 'var(--text-muted)' }}>
                  Wajibkan Moderasi Sebelum Terbit
                </label>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Komentar baru akan berstatus 'pending' dan membutuhkan persetujuan Admin agar terlihat publik.
              </span>
            </div>

            {/* Max Depth */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: commentsEnabled ? 'white' : 'var(--text-muted)' }}>
                Maksimal Kedalaman Thread Balasan
              </label>
              <input 
                type="number"
                min="1"
                max="10"
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value, 10) || 3)}
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white', width: '80px' }}
                disabled={!commentsEnabled}
                required
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Tingkat kedalaman balasan bersarang (1-10). Contoh: 3 tingkat balasan.
              </span>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => setShowSettings(false)}
                style={{ 
                  background: 'none', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '6px', 
                  padding: '0.4rem 1rem', 
                  color: 'white', 
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Batal
              </button>
              <button 
                type="submit" 
                disabled={settingsSaving}
                style={{ 
                  background: 'var(--accent-purple, #8b5cf6)', 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '0.4rem 1.25rem', 
                  color: 'white', 
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                {settingsSaving ? <Loader2 size={14} className="animate-spin" /> : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
