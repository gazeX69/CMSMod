import React, { useState, useEffect } from 'react';
import { Trash, Eye, X, Check, MailOpen, ShieldAlert, Archive } from 'lucide-react';

interface SubmissionItem {
  id: number;
  uuid: string;
  formUuid: string;
  submittedDataJson: string;
  metadataJson: string | null;
  status: 'new' | 'read' | 'replied' | 'archived' | 'spam';
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  formTitle?: string; // Resolved from forms list
}

interface FormItem {
  uuid: string;
  title: string;
}

interface SubmissionsViewerProps {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

export default function SubmissionsViewer({ apiFetch }: SubmissionsViewerProps) {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [forms, setForms] = useState<FormItem[]>([]);
  const [selectedFormUuid, setSelectedFormUuid] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Modal state
  const [viewingSub, setViewingSub] = useState<SubmissionItem | null>(null);

  const loadSubmissions = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const url = selectedFormUuid 
        ? `/api/contact-form/admin/submissions?formUuid=${selectedFormUuid}` 
        : `/api/contact-form/admin/submissions`;
      
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.items || []);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to load submissions.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Connection error loading submissions.');
    } finally {
      setLoading(false);
    }
  };

  const loadForms = async () => {
    try {
      const res = await apiFetch('/api/contact-form/admin/forms');
      if (res.ok) {
        const data = await res.json();
        setForms(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load forms list in submissions viewer', err);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [selectedFormUuid]);

  const handleUpdateStatus = async (id: number, status: 'new' | 'read' | 'replied' | 'archived' | 'spam') => {
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/contact-form/admin/submissions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setSubmissions(submissions.map(sub => sub.id === id ? { ...sub, status } : sub));
        if (viewingSub && viewingSub.id === id) {
          setViewingSub({ ...viewingSub, status });
        }
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to update submission status.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error updating status.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this submission? This will soft delete it.')) return;
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/contact-form/admin/submissions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSubmissions(submissions.filter(sub => sub.id !== id));
        if (viewingSub && viewingSub.id === id) {
          setViewingSub(null);
        }
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to delete submission.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Connection error deleting submission.');
    }
  };

  const parseData = (jsonStr: string) => {
    try {
      return JSON.parse(jsonStr) as Record<string, any>;
    } catch {
      return {};
    }
  };

  const getFormTitle = (formUuid: string) => {
    const form = forms.find(f => f.uuid === formUuid);
    return form ? form.title : `Form (${formUuid.slice(0, 8)})`;
  };

  // Helper to summarize data in list table
  const renderDataSummary = (dataObj: Record<string, any>) => {
    const keys = Object.keys(dataObj);
    if (keys.length === 0) return <em>No Data</em>;
    
    // Prioritize name/email/message if they exist
    const keysToDisplay = keys.slice(0, 3);
    return (
      <div style={{ fontSize: '0.85rem' }}>
        {keysToDisplay.map((key) => {
          const val = String(dataObj[key]);
          const shortVal = val.length > 40 ? val.slice(0, 40) + '...' : val;
          return (
            <div key={key}>
              <strong>{key}:</strong> {shortVal}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="submissions-viewer-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Contact Form Submissions</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Filter by Form:</label>
          <select 
            value={selectedFormUuid} 
            onChange={(e) => setSelectedFormUuid(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '0.85rem' }}
          >
            <option value="">-- All Forms --</option>
            {forms.map(form => (
              <option key={form.uuid} value={form.uuid}>{form.title}</option>
            ))}
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="login-error-box" style={{ marginBottom: '1rem' }}>
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <span>Loading submissions...</span>
        </div>
      ) : submissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Belum ada pesan masuk.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="wp-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Form</th>
                <th>Submitted Message Data</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => {
                const dataObj = parseData(sub.submittedDataJson);
                const isNew = sub.status === 'new';

                return (
                  <tr key={sub.id} style={{ background: isNew ? 'rgba(99, 102, 241, 0.05)' : 'none' }}>
                    <td style={{ fontWeight: 600 }}>{getFormTitle(sub.formUuid)}</td>
                    <td>{renderDataSummary(dataObj)}</td>
                    <td>{new Date(sub.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>
                      <span className={`status-badge ${sub.status}`} style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        display: 'inline-block',
                        textTransform: 'uppercase',
                        background: sub.status === 'new' ? 'var(--accent-primary-bg, #4338ca)' :
                                    sub.status === 'read' ? 'rgba(0,0,0,0.1)' :
                                    sub.status === 'replied' ? 'rgba(16, 185, 129, 0.2)' :
                                    sub.status === 'archived' ? 'rgba(107, 114, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: sub.status === 'new' ? 'white' : 'var(--text-color)'
                      }}>
                        {sub.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button 
                          onClick={() => {
                            setViewingSub(sub);
                            if (sub.status === 'new') handleUpdateStatus(sub.id, 'read');
                          }} 
                          className="t-action-btn"
                          title="View Details"
                          style={{ padding: '0.3rem' }}
                        >
                          <Eye size={14} />
                        </button>
                        {sub.status !== 'archived' && (
                          <button 
                            onClick={() => handleUpdateStatus(sub.id, 'archived')} 
                            className="t-action-btn"
                            title="Archive"
                            style={{ padding: '0.3rem' }}
                          >
                            <Archive size={14} />
                          </button>
                        )}
                        {sub.status !== 'spam' && (
                          <button 
                            onClick={() => handleUpdateStatus(sub.id, 'spam')} 
                            className="t-action-btn warning"
                            title="Spam"
                            style={{ padding: '0.3rem' }}
                          >
                            <ShieldAlert size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(sub.id)} 
                          className="t-action-btn danger"
                          title="Delete"
                          style={{ padding: '0.3rem' }}
                        >
                          <Trash size={14} />
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

      {/* View Details Modal */}
      {viewingSub && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass" style={{
            background: 'var(--modal-bg, var(--card-bg, #1e293b))',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '600px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Submission Details</h4>
              <button onClick={() => setViewingSub(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1.5rem' }}>
              <div>
                <strong>Form Name:</strong> {getFormTitle(viewingSub.formUuid)}
              </div>
              <div>
                <strong>Date:</strong> {new Date(viewingSub.createdAt).toLocaleString('id-ID')}
              </div>
              
              <div style={{ border: '1px solid var(--border)', borderRadius: '6px', background: 'rgba(0,0,0,0.1)', padding: '1rem' }}>
                <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--primary)' }}>Form Fields Data:</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.entries(parseData(viewingSub.submittedDataJson)).map(([key, val]) => (
                    <div key={key}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', textTransform: 'capitalize' }}>{key}:</span>
                      <span style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div><strong>IP Address:</strong> {viewingSub.ipAddress || 'Unknown'}</div>
                <div><strong>User Agent:</strong> {viewingSub.userAgent || 'Unknown'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Workflow:</span>
                <select 
                  value={viewingSub.status} 
                  onChange={(e) => handleUpdateStatus(viewingSub.id, e.target.value as any)}
                  style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '0.8rem' }}
                >
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="archived">Archived</option>
                  <option value="spam">Spam</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleDelete(viewingSub.id)} className="btn-settings-action warning" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Trash size={14} /> Delete
                </button>
                <button onClick={() => setViewingSub(null)} className="btn-primary-action" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
