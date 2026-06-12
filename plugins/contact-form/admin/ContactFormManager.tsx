import React, { useState, useEffect } from 'react';
import { Plus, Trash, ArrowUp, ArrowDown, Clipboard, Check, ChevronLeft } from 'lucide-react';

interface FieldDefinition {
  name: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
}

interface FormItem {
  uuid: string;
  title: string;
  fieldsSchemaJson: string;
  emailNotifications: string | null;
  successMessage: string | null;
  submitButtonText: string;
  createdAt: string;
}

interface ContactFormManagerProps {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

export default function ContactFormManager({ apiFetch }: ContactFormManagerProps) {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingForm, setEditingForm] = useState<FormItem | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  
  // Editor state
  const [title, setTitle] = useState<string>('');
  const [emailNotifications, setEmailNotifications] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [submitButtonText, setSubmitButtonText] = useState<string>('Submit');
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  
  // Message states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedUuid, setCopiedUuid] = useState<string | null>(null);

  const loadForms = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/contact-form/admin/forms');
      if (res.ok) {
        const data = await res.json();
        setForms(data.items || []);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to load contact forms.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Connection error loading contact forms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const handleStartCreate = () => {
    setTitle('');
    setEmailNotifications('');
    setSuccessMessage('');
    setSubmitButtonText('Submit');
    setFields([
      { name: 'name', type: 'text', label: 'Nama Lengkap', required: true, placeholder: 'Masukkan nama lengkap Anda' },
      { name: 'email', type: 'email', label: 'Alamat Email', required: true, placeholder: 'name@example.com' },
      { name: 'message', type: 'textarea', label: 'Pesan', required: true, placeholder: 'Tulis pesan Anda di sini...' }
    ]);
    setIsCreating(true);
    setEditingForm(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleStartEdit = (form: FormItem) => {
    setTitle(form.title);
    setEmailNotifications(form.emailNotifications || '');
    setSuccessMessage(form.successMessage || '');
    setSubmitButtonText(form.submitButtonText || 'Submit');
    
    try {
      const parsed = JSON.parse(form.fieldsSchemaJson);
      setFields(parsed.fields || []);
    } catch {
      setFields([]);
    }

    setEditingForm(form);
    setIsCreating(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleAddField = () => {
    const id = Date.now();
    const newField: FieldDefinition = {
      name: `field_${id}`,
      type: 'text',
      label: `Field Baru ${fields.length + 1}`,
      required: false,
      placeholder: ''
    };
    setFields([...fields, newField]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof FieldDefinition, value: any) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: value };
    setFields(updated);
  };

  const handleFieldOptionsChange = (index: number, optionsText: string) => {
    const updated = [...fields];
    const options = optionsText
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.split('|');
        return {
          label: parts[0]?.trim() || '',
          value: (parts[1] || parts[0])?.trim() || ''
        };
      });
    updated[index] = { ...updated[index], options };
    setFields(updated);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setFields(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!title.trim()) {
      setErrorMsg('Form Title is required.');
      return;
    }

    if (fields.length === 0) {
      setErrorMsg('At least one field is required.');
      return;
    }

    // Validate field names are alphanumeric-ish and unique
    const names = new Set<string>();
    for (const f of fields) {
      const trimmedName = f.name.trim().toLowerCase();
      if (!trimmedName) {
        setErrorMsg(`Field label "${f.label}" must have a valid field name.`);
        return;
      }
      if (!/^[a-z0-9_]+$/.test(trimmedName)) {
        setErrorMsg(`Field name "${f.name}" must be alphanumeric only (lowercase, numbers, underscore).`);
        return;
      }
      if (names.has(trimmedName)) {
        setErrorMsg(`Duplicate field name detected: "${trimmedName}". Field names must be unique.`);
        return;
      }
      names.add(trimmedName);
    }

    const payload = {
      title,
      fieldsSchemaJson: JSON.stringify({ version: 1, fields }),
      emailNotifications: emailNotifications.trim() || null,
      successMessage: successMessage.trim() || null,
      submitButtonText: submitButtonText.trim() || 'Submit'
    };

    try {
      const url = editingForm
        ? `/api/contact-form/admin/forms/${editingForm.uuid}`
        : `/api/contact-form/admin/forms`;
      const method = editingForm ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg(editingForm ? 'Form updated successfully!' : 'Form created successfully!');
        setIsCreating(false);
        setEditingForm(null);
        await loadForms();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to save form.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error saving form.');
    }
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Are you sure you want to delete this form? Submissions will remain but form rendering will be disabled.')) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch(`/api/contact-form/admin/forms/${uuid}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('Form deleted successfully.');
        await loadForms();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to delete form.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Connection error deleting form.');
    }
  };

  const copyShortcode = (uuid: string) => {
    const tag = `<cms-block type="contact-form" id="${uuid}"></cms-block>`;
    navigator.clipboard.writeText(tag).then(() => {
      setCopiedUuid(uuid);
      setTimeout(() => setCopiedUuid(null), 2000);
    });
  };

  if (isCreating || editingForm) {
    return (
      <div className="form-builder-view">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => { setIsCreating(false); setEditingForm(null); }} 
            className="btn-settings-action"
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem' }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
            {editingForm ? `Edit Form: ${editingForm.title}` : 'Create New Contact Form'}
          </h3>
        </div>

        {errorMsg && (
          <div className="login-error-box" style={{ marginBottom: '1rem' }}>
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* General settings */}
          <div className="form-section glass" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>General Settings</h4>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Form Title *</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. Formulir Kontak Hubungi Kami" 
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                required 
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Email Notification Target</label>
              <input 
                type="text" 
                value={emailNotifications} 
                onChange={(e) => setEmailNotifications(e.target.value)} 
                placeholder="e.g. admin@mysite.com, contact@mysite.com (leave blank for none)" 
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flexGrow: 1, minWidth: '250px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Success Message</label>
                <input 
                  type="text" 
                  value={successMessage} 
                  onChange={(e) => setSuccessMessage(e.target.value)} 
                  placeholder="Defaults to setting message if empty" 
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                />
              </div>

              <div className="form-group" style={{ width: '150px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Submit Button Text</label>
                <input 
                  type="text" 
                  value={submitButtonText} 
                  onChange={(e) => setSubmitButtonText(e.target.value)} 
                  placeholder="Submit" 
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                />
              </div>
            </div>
          </div>

          {/* Form Fields Builder */}
          <div className="form-section glass" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem' }}>Form Fields</h4>
              <button 
                type="button" 
                onClick={handleAddField} 
                className="btn-primary-action"
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              >
                <Plus size={14} /> Add Field
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {fields.map((field, index) => {
                const optionsString = (field.options || [])
                  .map((opt) => `${opt.label}|${opt.value}`)
                  .join('\n');

                return (
                  <div 
                    key={index} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.75rem', 
                      padding: '1rem', 
                      borderRadius: '6px', 
                      border: '1px solid var(--border)', 
                      background: 'rgba(0, 0, 0, 0.1)' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>Field #{index + 1}</span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button type="button" onClick={() => moveField(index, 'up')} className="t-action-btn" disabled={index === 0} title="Move Up">
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" onClick={() => moveField(index, 'down')} className="t-action-btn" disabled={index === fields.length - 1} title="Move Down">
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" onClick={() => handleRemoveField(index)} className="t-action-btn danger" title="Remove Field">
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Field Label *</label>
                        <input 
                          type="text" 
                          value={field.label} 
                          onChange={(e) => handleFieldChange(index, 'label', e.target.value)} 
                          placeholder="e.g. Nama Anda"
                          style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '0.85rem' }}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Field Name (Key) *</label>
                        <input 
                          type="text" 
                          value={field.name} 
                          onChange={(e) => handleFieldChange(index, 'name', e.target.value)} 
                          placeholder="e.g. nama_lengkap"
                          style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '0.85rem' }}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Field Type</label>
                        <select 
                          value={field.type} 
                          onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                          style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '0.85rem' }}
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="tel">Telephone</option>
                          <option value="textarea">Textarea (Multiline)</option>
                          <option value="select">Select dropdown</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input 
                            type="checkbox" 
                            checked={field.required} 
                            onChange={(e) => handleFieldChange(index, 'required', e.target.checked)} 
                          />
                          Required (Wajib diisi)
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Placeholder</label>
                        <input 
                          type="text" 
                          value={field.placeholder || ''} 
                          onChange={(e) => handleFieldChange(index, 'placeholder', e.target.value)} 
                          placeholder="e.g. Masukkan nama lengkap Anda..."
                          style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '0.85rem' }}
                        />
                      </div>

                      {field.type === 'select' && (
                        <div className="form-group">
                          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Dropdown Options (satu baris per pilihan: `Label|Value` atau hanya `Label` saja)</label>
                          <textarea 
                            value={optionsString} 
                            onChange={(e) => handleFieldOptionsChange(index, e.target.value)} 
                            placeholder="Pilihan A|value_a&#10;Pilihan B|value_b"
                            rows={3}
                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '0.85rem', resize: 'vertical' }}
                            required
                          ></textarea>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button 
              type="button" 
              onClick={() => { setIsCreating(false); setEditingForm(null); }} 
              className="btn-settings-action"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary-action"
            >
              Save Form
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="form-list-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Active Contact Forms</h3>
        <button onClick={handleStartCreate} className="btn-primary-action" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Plus size={16} /> New Form
        </button>
      </div>

      {successMsg && (
        <div className="login-error-box" style={{ background: 'var(--accent-success-bg)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#a7f3d0', marginBottom: '1rem' }}>
          <span>✔️</span> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="login-error-box" style={{ marginBottom: '1rem' }}>
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <span>Loading forms...</span>
        </div>
      ) : forms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>Belum ada formulir kontak yang dibuat.</p>
          <button onClick={handleStartCreate} className="btn-primary-action">Create First Form</button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="wp-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Embed Shortcode / Tag</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => {
                const tag = `<cms-block type="contact-form" id="${form.uuid}"></cms-block>`;
                return (
                  <tr key={form.uuid}>
                    <td style={{ fontWeight: 600 }}>{form.title}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{tag}</code>
                        <button 
                          onClick={() => copyShortcode(form.uuid)} 
                          className="t-action-btn"
                          title="Copy tag"
                          style={{ padding: '0.25rem' }}
                        >
                          {copiedUuid === form.uuid ? <Check size={12} style={{ color: '#10b981' }} /> : <Clipboard size={12} />}
                        </button>
                      </div>
                    </td>
                    <td>{new Date(form.createdAt).toLocaleDateString('id-ID')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleStartEdit(form)} className="t-action-btn">Edit</button>
                        <button onClick={() => handleDelete(form.uuid)} className="t-action-btn danger">Delete</button>
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
  );
}
