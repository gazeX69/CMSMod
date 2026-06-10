import React, { useState } from 'react';
import { EditorInsertSourceRenderProps } from '../contracts';

export const UrlInsertForm: React.FC<EditorInsertSourceRenderProps> = ({
  onSelect,
  onCancel
}) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSelect({ url: url.trim() });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input 
        type="url" 
        autoFocus
        placeholder="Enter image URL (https://...)"
        className="search-filter-input"
        style={{ width: '100%', padding: '0.6rem' }}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button type="button" className="btn-inline-action" onClick={onCancel}>Back</button>
        <button type="submit" className="btn-primary-action" disabled={!url.trim()}>Insert</button>
      </div>
    </form>
  );
};
