import { useState } from 'react';
import MediaExplorer, { MediaFile } from './MediaExplorer';
import { EditorInsertResult } from '../../../apps/admin/src/editor/contracts';

interface MediaPickerProps {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  onSelect?: (result: EditorInsertResult | null) => void;
  onCancel?: () => void;
}

export default function MediaPicker({ apiFetch, onSelect, onCancel }: MediaPickerProps) {
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  const handleInsert = () => {
    if (selectedFile) {
      onSelect?.({
        uuid: selectedFile.uuid || undefined,
        alt: selectedFile.altText || undefined,
        caption: selectedFile.caption || undefined
      });
    }
  };

  return (
    <div className="media-picker-container">
      <div className="ml-explorer" style={{ border: 'none', background: 'transparent', padding: 0 }}>
        <MediaExplorer
          apiFetch={apiFetch}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
          showFilters={false}
          showTrash={false}
          showSort={false}
          showViewMode={false}
          forcedViewMode="grid"
        />
      </div>
      
      <div className="media-picker-footer">
        <button 
          className="btn-settings-action"
          type="button"
          onClick={onCancel}
          style={{ margin: 0 }}
        >
          Cancel
        </button>
        <button 
          className="btn-primary-action"
          type="button"
          disabled={!selectedFile}
          onClick={handleInsert}
          style={{ background: 'var(--accent-success)', margin: 0 }}
        >
          Insert
        </button>
      </div>
    </div>
  );
}
