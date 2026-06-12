import React, { useState, useEffect } from 'react';
import { 
  Settings, Loader2, FileText, Image as ImageIcon,
  Eye, X, AlertCircle, Film, Play, Check, Trash2, Copy
} from 'lucide-react';
import MediaExplorer, { MediaFile, getMediaUrl, formatSize } from './MediaExplorer';
import './MediaLibrary.css';

interface MediaLibraryPageProps {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

export default function MediaLibraryPage({ apiFetch }: MediaLibraryPageProps) {
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Settings state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [allowedGroups, setAllowedGroups] = useState<string[]>(['images', 'documents']);
  const [customMimeTypes, setCustomMimeTypes] = useState<string>('');
  const [maxSize, setMaxSize] = useState<number>(10);
  const [organizeByDate, setOrganizeByDate] = useState<boolean>(true);
  const [allowSvg, setAllowSvg] = useState<boolean>(false);
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);

  // Detail edits state
  const [editAltText, setEditAltText] = useState<string>('');
  const [editCaption, setEditCaption] = useState<string>('');
  const [editOriginalName, setEditOriginalName] = useState<string>('');
  const [savingDetails, setSavingDetails] = useState<boolean>(false);

  // Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const mediaGroupLabels: Record<string, string> = {
    images: 'Images',
    documents: 'Documents',
    audio: 'Audio',
    video: 'Video',
    archives: 'Archives',
  };

  const loadSettings = async () => {
    try {
      const res = await apiFetch('/api/media/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setAllowedGroups(data.allowed_groups || ['images', 'documents']);
        setCustomMimeTypes(data.custom_mime_types || '');
        setMaxSize(data.max_upload_size_mb);
        setOrganizeByDate(data.organize_by_date);
        setAllowSvg(data.allow_svg_upload);
      }
    } catch (err) {
      console.error('Failed to load media settings', err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (selectedFile) {
      setEditAltText(selectedFile.altText || '');
      setEditCaption(selectedFile.caption || '');
      setEditOriginalName(selectedFile.originalName || '');
    } else {
      setEditAltText('');
      setEditCaption('');
      setEditOriginalName('');
    }
  }, [selectedFile]);

  const toggleAllowedGroup = (group: string) => {
    setAllowedGroups((prev) => {
      if (prev.includes(group)) {
        return prev.filter((item) => item !== group);
      }
      return [...prev, group];
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (allowedGroups.length === 0) {
      setErrorMsg('Minimal satu kategori file harus diaktifkan.');
      setSettingsSaving(false);
      return;
    }

    try {
      const res = await apiFetch('/api/media/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_upload_size_mb: maxSize,
          allowed_groups: allowedGroups,
          custom_mime_types: customMimeTypes,
          organize_by_date: organizeByDate,
          allow_svg_upload: allowSvg,
        })
      });

      if (res.ok) {
        setSuccessMsg('Pengaturan perpustakaan media berhasil diperbarui.');
        setShowSettings(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to save settings');
      }
    } catch (err) {
      setErrorMsg('Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setSavingDetails(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiFetch(`/api/media/admin/${selectedFile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alt_text: editAltText,
          caption: editCaption,
          originalName: editOriginalName
        })
      });

      if (res.ok) {
        setSuccessMsg('Detail media berhasil diperbarui.');
        setSelectedFile({
          ...selectedFile,
          altText: editAltText,
          caption: editCaption,
          originalName: editOriginalName
        });
        setRefreshTrigger(prev => prev + 1);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to save file details');
      }
    } catch (err) {
      setErrorMsg('Failed to save file details');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to archive/delete this file?')) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiFetch(`/api/media/admin/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setSuccessMsg('File successfully soft deleted.');
        setSelectedFile(null);
        setRefreshTrigger(prev => prev + 1);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to delete file');
      }
    } catch (err) {
      setErrorMsg('Failed to delete file');
    }
  };

  const handleRestore = async (id: number) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch(`/api/media/admin/restore/${id}`, { method: 'PUT' });
      if (res.ok) {
        setSuccessMsg('File successfully restored from trash.');
        setSelectedFile(null);
        setRefreshTrigger(prev => prev + 1);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to restore file');
      }
    } catch (err) {
      setErrorMsg('Failed to restore file');
    }
  };

  const handleForceDelete = async (id: number) => {
    if (!confirm('WARNING: This will permanently delete the file from the database and your physical storage. This cannot be undone. Are you sure?')) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch(`/api/media/admin/force/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('File PERMANENTLY deleted.');
        setSelectedFile(null);
        setRefreshTrigger(prev => prev + 1);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to permanently delete file');
      }
    } catch (err) {
      setErrorMsg('Failed to permanently delete file');
    }
  };

  const copyUrl = (file: MediaFile) => {
    const fullUrl = getMediaUrl(file);
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isTrashMode = selectedFile ? selectedFile.deletedAt !== null && selectedFile.deletedAt !== undefined : false;

  return (
    <div className="media-library-component">
      {/* Main Header */}
      <div className="ml-header">
        <div className="header-text">
          <h2>Perpustakaan Media</h2>
          <p>Kelola file gambar, dokumen, video, dan aset konten situs.</p>
        </div>
        
        <div className="ml-actions">
          <button className="btn-settings-action" type="button" onClick={() => setShowSettings(true)}>
            <Settings size={16} /> Pengaturan
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="login-error-box">
          <AlertCircle size={16} className="lucide-icon" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="login-error-box" style={{ background: 'var(--accent-success-bg)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#a7f3d0' }}>
          <Check size={16} className="lucide-icon" style={{ color: 'var(--accent-success)' }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="ml-main-layout">
        
        {/* Explorer wrapped in class */}
        <div className="ml-explorer">
          <MediaExplorer
            apiFetch={apiFetch}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            refreshTrigger={refreshTrigger}
            showFilters={true}
            showTrash={true}
            showSort={true}
            showViewMode={true}
            forcedViewMode="grid"
          />
        </div>

        {/* Sidebar Details */}
        <div className="ml-sidebar">
          {!selectedFile ? (
            <div className="ml-sidebar-empty">
              <ImageIcon size={32} />
              <span>Pilih file untuk melihat detail dan pratinjau</span>
            </div>
          ) : (
            <div className="ml-sidebar-detail">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Detail File</h3>
                <button 
                  onClick={() => setSelectedFile(null)} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="ml-sidebar-preview">
                {selectedFile.mimeType.startsWith('image/') ? (
                  <img src={getMediaUrl(selectedFile, true)} alt="" />
                ) : selectedFile.mimeType.startsWith('video/') ? (
                  <>
                    <Film size={48} className="media-icon-large" />
                    <img 
                      src={getMediaUrl(selectedFile, true)} 
                      alt="" 
                      className="video-thumb"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="video-play-overlay"><Play size={24} /></div>
                  </>
                ) : (
                  <FileText size={48} className="media-icon-large" />
                )}
              </div>

              {!isTrashMode ? (
                <form onSubmit={handleSaveDetails} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nama File Asli</label>
                    <input 
                      type="text"
                      value={editOriginalName}
                      onChange={(e) => setEditOriginalName(e.target.value)}
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white' }}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Teks Alt (Alt Text)</label>
                    <input 
                      type="text"
                      value={editAltText}
                      onChange={(e) => setEditAltText(e.target.value)}
                      placeholder="Deskripsi untuk pembaca layar..."
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Keterangan (Caption)</label>
                    <textarea 
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="Keterangan gambar..."
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white', minHeight: '60px', resize: 'vertical' }}
                    />
                  </div>

                  <div className="ml-sidebar-info-list" style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                    {selectedFile.uuid && (
                      <div className="ml-sidebar-info-item">
                        <span className="ml-sidebar-info-label">UUID:</span>
                        <span className="ml-sidebar-info-val" style={{ fontSize: '0.65rem', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{selectedFile.uuid}</span>
                      </div>
                    )}
                    <div className="ml-sidebar-info-item">
                      <span className="ml-sidebar-info-label">Ukuran:</span>
                      <span className="ml-sidebar-info-val">{formatSize(selectedFile.size)}</span>
                    </div>
                    <div className="ml-sidebar-info-item">
                      <span className="ml-sidebar-info-label">Tipe MIME:</span>
                      <span className="ml-sidebar-info-val">{selectedFile.mimeType}</span>
                    </div>
                    <div className="ml-sidebar-info-item">
                      <span className="ml-sidebar-info-label">Diunggah:</span>
                      <span className="ml-sidebar-info-val">{new Date(selectedFile.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="btn-primary-action"
                    disabled={savingDetails}
                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem', marginTop: '0.5rem' }}
                  >
                    {savingDetails ? 'Menyimpan...' : 'Simpan Detail'}
                  </button>
                </form>
              ) : (
                <div className="ml-sidebar-info-list" style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                  {selectedFile.uuid && (
                    <div className="ml-sidebar-info-item">
                      <span className="ml-sidebar-info-label">UUID:</span>
                      <span className="ml-sidebar-info-val" style={{ fontSize: '0.65rem', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{selectedFile.uuid}</span>
                    </div>
                  )}
                  <div className="ml-sidebar-info-item">
                    <span className="ml-sidebar-info-label">Dihapus Pada:</span>
                    <span className="ml-sidebar-info-val" style={{ color: 'var(--accent-danger)' }}>
                      {selectedFile.deletedAt ? new Date(selectedFile.deletedAt).toLocaleString() : '-'}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem' }}>
                {!isTrashMode ? (
                  <>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tautan File</label>
                    <div className="url-copy-box">
                      <input 
                        type="text" 
                        readOnly 
                        value={getMediaUrl(selectedFile)} 
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button 
                        className="btn-url-copy" 
                        onClick={() => copyUrl(selectedFile)}
                        title="Salin Tautan"
                      >
                        {copiedId === selectedFile.id ? <Check size={14} style={{ color: 'var(--accent-success)' }} /> : <Copy size={14} />}
                      </button>
                    </div>

                    <a 
                      href={getMediaUrl(selectedFile)} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn-settings-action"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', textDecoration: 'none', color: 'white', marginTop: '0.5rem', fontSize: '0.8rem' }}
                    >
                      <Eye size={14} /> Buka File Asli
                    </a>

                    <button 
                      className="btn-settings-action danger" 
                      onClick={() => handleDelete(selectedFile.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                    >
                      <Trash2 size={14} /> Hapus File
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="btn-primary-action" 
                      onClick={() => handleRestore(selectedFile.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', background: 'var(--accent-success)' }}
                    >
                      <Check size={14} /> Pulihkan File
                    </button>
                    <button 
                      className="btn-settings-action danger" 
                      onClick={() => handleForceDelete(selectedFile.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', marginTop: '0.5rem' }}
                    >
                      <Trash2 size={14} /> Hapus Permanen
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-overlay">
          <form className="settings-modal" onSubmit={handleSaveSettings}>
            <div className="settings-modal-header">
              <h3>Pengaturan Perpustakaan Media</h3>
              <button 
                type="button" 
                className="btn-close-modal" 
                onClick={() => setShowSettings(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="s-group">
              <label>Kategori File Diizinkan</label>

              <div className="media-category-grid">
                {Object.entries(mediaGroupLabels).map(([group, label]) => (
                  <label key={group} className="media-category-option">
                    <input
                      type="checkbox"
                      checked={allowedGroups.includes(group)}
                      onChange={() => toggleAllowedGroup(group)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <p className="settings-help-text">
                Pilih kategori file yang boleh diunggah ke Media Library.
              </p>
            </div>

            <div className="s-group">
              <label>Custom MIME Types</label>
              <textarea
                className="settings-textarea"
                value={customMimeTypes}
                onChange={(e) => setCustomMimeTypes(e.target.value)}
                placeholder="Contoh: application/json,application/xml"
              />
              <p className="settings-help-text">
                Opsional. Pisahkan MIME tambahan dengan koma.
              </p>
            </div>

            <div className="s-group">
              <label>Ukuran Maksimal Unggah (MB)</label>
              <input 
                type="number"
                value={maxSize}
                onChange={(e) => setMaxSize(parseInt(e.target.value, 10))}
                placeholder="e.g. 10 untuk 10MB"
                required
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Nilai dalam megabyte (MB).</p>
            </div>

            <div className="s-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input 
                type="checkbox"
                id="organize-by-date"
                checked={organizeByDate}
                onChange={(e) => setOrganizeByDate(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="organize-by-date" style={{ cursor: 'pointer', fontSize: '0.8rem', userSelect: 'none' }}>
                Organisasikan unggahan berdasarkan folder tanggal (Tahun/Bulan)
              </label>
            </div>

            <div className="s-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <input 
                type="checkbox"
                id="allow-svg"
                checked={allowSvg}
                onChange={(e) => setAllowSvg(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="allow-svg" style={{ cursor: 'pointer', fontSize: '0.8rem', userSelect: 'none' }}>
                Izinkan unggahan berkas gambar format vektor (.SVG)
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                className="btn-tax-cancel" 
                onClick={() => setShowSettings(false)}
              >
                Batal
              </button>
              <button 
                type="submit" 
                className="btn-primary-action"
                disabled={settingsSaving}
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
