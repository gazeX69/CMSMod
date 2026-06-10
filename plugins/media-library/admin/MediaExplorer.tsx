import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Grid, List as ListIcon, Trash2, Loader2, Upload, FileText, Image as ImageIcon,
  Film, Play, Check, AlertCircle
} from 'lucide-react';
import './MediaLibrary.css';

export interface MediaFile {
  id: number;
  uuid?: string | null;
  filename: string;
  originalName: string;
  mimeType: string;
  extension?: string | null;
  size: number;
  path: string;
  publicUrl?: string | null;
  altText?: string | null;
  caption?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export const getMediaUrl = (file: MediaFile, isThumb = false) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';

  if (!file.uuid) return '';

  const base = `${apiUrl}/api/media/resolve/${file.uuid}`;
  return isThumb ? `${base}?size=thumb` : base;
};

export const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export interface MediaExplorerProps {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  selectedFile: MediaFile | null;
  onSelectFile: (file: MediaFile | null) => void;
  refreshTrigger?: number;
  showFilters?: boolean;
  showTrash?: boolean;
  showSort?: boolean;
  showViewMode?: boolean;
  forcedViewMode?: 'grid' | 'list';
}

export default function MediaExplorer({
  apiFetch,
  selectedFile,
  onSelectFile,
  refreshTrigger = 0,
  showFilters = true,
  showTrash = true,
  showSort = true,
  showViewMode = true,
  forcedViewMode = 'grid'
}: MediaExplorerProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [search, setSearch] = useState<string>('');
  const [mimeFilter, setMimeFilter] = useState<string>('');
  const [sort, setSort] = useState<string>('createdAt_DESC');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(forcedViewMode);
  const [isTrashMode, setIsTrashMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  // Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (isTrashMode && showTrash) {
        const res = await apiFetch(`/api/admin/media/trash`);
        if (res.ok) {
          const data = await res.json();
          setFiles(data.items || []);
          setTotal(data.items?.length || 0);
        } else {
          const errData = await res.json();
          setErrorMsg(errData.error || 'Failed to fetch trash files');
        }
      } else {
        const query = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          search,
          mimeType: mimeFilter,
          sort
        });
        const res = await apiFetch(`/api/admin/media?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setFiles(data.items || []);
          setTotal(data.pagination?.total || 0);
        } else {
          const errData = await res.json();
          setErrorMsg(errData.error || 'Failed to fetch media files');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load media library files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    onSelectFile(null); // Clear selection when filter parameters change
  }, [page, search, mimeFilter, sort, isTrashMode, refreshTrigger]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    
    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', fileList[0]);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';
      const res = await fetch(`${apiUrl}/api/admin/media/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (res.ok) {
        setSuccessMsg('File uploaded successfully!');
        const data = await res.json();
        if (data.media) {
          onSelectFile(data.media);
        }
        loadFiles();
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Upload failed');
      }
    } catch (err) {
      setErrorMsg('Network error during file upload');
    } finally {
      setUploading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const activeViewMode = showViewMode ? viewMode : forcedViewMode;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* Search and Upload Toolbar */}
      <div className="ml-toolbar" style={{ margin: 0 }}>
        <div className="ml-search-row">
          <div className="topbar-search" style={{ width: '100%' }}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Cari file media..." 
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            style={{ display: 'none' }}
          />
          <button 
            className="btn-primary-action" 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Mengunggah...
              </>
            ) : (
              <>
                <Upload size={16} /> Upload
              </>
            )}
          </button>
        </div>
      </div>

      {/* Conditional Filtering Toolbar */}
      {(showFilters || showTrash || showSort || showViewMode) && (
        <div className="ml-toolbar" style={{ margin: 0 }}>
          <div className="ml-filters-row" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {showFilters && (
                <>
                  <button 
                    className={`filter-pill-btn ${mimeFilter === '' && !isTrashMode ? 'active' : ''}`}
                    onClick={() => { setMimeFilter(''); setIsTrashMode(false); setPage(1); }}
                  >
                    Semua
                  </button>
                  <button 
                    className={`filter-pill-btn ${mimeFilter === 'image' && !isTrashMode ? 'active' : ''}`}
                    onClick={() => { setMimeFilter('image'); setIsTrashMode(false); setPage(1); }}
                  >
                    Gambar
                  </button>
                  <button 
                    className={`filter-pill-btn ${mimeFilter === 'application/pdf' && !isTrashMode ? 'active' : ''}`}
                    onClick={() => { setMimeFilter('application/pdf'); setIsTrashMode(false); setPage(1); }}
                  >
                    Dokumen
                  </button>
                </>
              )}
              
              {showTrash && (
                <>
                  {showFilters && <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 0.5rem', height: '18px' }}></div>}
                  <button 
                    className={`filter-pill-btn ${isTrashMode ? 'active' : ''}`}
                    style={{ color: isTrashMode ? 'white' : 'var(--accent-danger)' }}
                    onClick={() => { setIsTrashMode(true); setPage(1); }}
                  >
                    <Trash2 size={14} style={{ marginRight: '4px', display: 'inline' }} />
                    Tong Sampah
                  </button>
                </>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {showSort && (
                <select 
                  className="filter-select" 
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                  disabled={isTrashMode && showTrash}
                >
                  <option value="createdAt_DESC">Terbaru</option>
                  <option value="createdAt_ASC">Terlama</option>
                  <option value="filename_ASC">Nama (A-Z)</option>
                  <option value="filename_DESC">Nama (Z-A)</option>
                  <option value="size_DESC">Ukuran (Terbesar)</option>
                  <option value="size_ASC">Ukuran (Terkecil)</option>
                </select>
              )}

              {showViewMode && (
                <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                  <button 
                    onClick={() => setViewMode('grid')}
                    style={{ background: activeViewMode === 'grid' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', padding: '0.35rem', cursor: 'pointer', color: 'white' }}
                  >
                    <Grid size={14} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    style={{ background: activeViewMode === 'list' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', padding: '0.35rem', cursor: 'pointer', color: 'white' }}
                  >
                    <ListIcon size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Items Container */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexGrow: 1 }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-purple)', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Memuat file media...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="ml-empty" style={{ flexGrow: 1, minHeight: '300px' }}>
            <ImageIcon size={48} className="media-icon-large" />
            <h3>Belum ada file media</h3>
            <p>Klik tombol "Upload" di atas untuk menambahkan media pertama Anda.</p>
          </div>
        ) : activeViewMode === 'grid' ? (
          <div className="ml-grid">
            {files.map((file) => {
              const isImage = file.mimeType.startsWith('image/');
              const isVideo = file.mimeType.startsWith('video/');
              return (
                <div 
                  key={file.id} 
                  className={`media-card ${selectedFile?.id === file.id ? 'selected' : ''}`}
                  onClick={() => onSelectFile(file)}
                >
                  <div className="media-preview-container">
                    {isImage ? (
                      <img src={getMediaUrl(file, true)} alt={file.originalName} loading="lazy" />
                    ) : isVideo ? (
                      <>
                        <Film size={36} className="media-icon-large" />
                        <img 
                          src={getMediaUrl(file, true)} 
                          alt={file.originalName} 
                          loading="lazy"
                          className="video-thumb"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div className="video-play-overlay"><Play size={18} /></div>
                      </>
                    ) : (
                      <FileText size={36} className="media-icon-large" />
                    )}
                  </div>
                  <div className="media-card-title">{file.originalName}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ml-list-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Nama Asli</th>
                  <th>Tipe MIME</th>
                  <th>Ukuran</th>
                  <th>Tanggal Unggah</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => {
                  const isImage = file.mimeType.startsWith('image/');
                  const isVideo = file.mimeType.startsWith('video/');
                  return (
                    <tr 
                      key={file.id} 
                      onClick={() => onSelectFile(file)}
                      style={{ cursor: 'pointer', background: selectedFile?.id === file.id ? 'rgba(138, 92, 246, 0.05)' : '' }}
                    >
                      <td>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          {(isImage || isVideo) ? (
                            <img 
                              src={getMediaUrl(file, true)} 
                              alt="" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <FileText size={18} />
                          )}
                          {isVideo && <div className="video-play-overlay-sm"><Play size={10} /></div>}
                        </div>
                      </td>
                      <td><span className="title-bold">{file.originalName}</span></td>
                      <td><code>{file.mimeType}</code></td>
                      <td>{formatSize(file.size)}</td>
                      <td>{new Date(file.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="ml-pagination" style={{ margin: 0 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, total)} dari {total} file
          </span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button 
              className="btn-settings-action" 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              style={{ padding: '0.35rem 0.65rem' }}
            >
              Sebelumnya
            </button>
            <span style={{ alignSelf: 'center', fontSize: '0.85rem', padding: '0 0.5rem' }}>
              Halaman {page} dari {totalPages}
            </span>
            <button 
              className="btn-settings-action" 
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              style={{ padding: '0.35rem 0.65rem' }}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
