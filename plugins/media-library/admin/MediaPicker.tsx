import { useState } from 'react';
import type { MediaAsset } from '@modern-cms/plugin-sdk';
import MediaExplorer, { MediaFile } from './MediaExplorer';
import { UNIVERSAL_MEDIA_NODE } from '../editor/UniversalMediaNode';

interface MediaPickerProps {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  onSelect?: (result: MediaAsset | null) => void;
  onCancel?: () => void;
  options?: { mimeTypes?: string[]; multiple?: boolean };
}

export default function MediaPicker({ apiFetch, onSelect, onCancel, options }: MediaPickerProps) {
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  const handleInsert = () => {
    if (selectedFile) {
      const asset: MediaAsset & { alt?: string; url?: string } = {
        uuid: selectedFile.uuid || '',
        filename: selectedFile.filename,
        originalName: selectedFile.originalName,
        mimeType: selectedFile.mimeType,
        size: selectedFile.size,
        altText: selectedFile.altText,
        caption: selectedFile.caption,
        publicUrl: selectedFile.publicUrl || '',
        alt: selectedFile.altText || '',
        url: selectedFile.publicUrl || '',
        editorNode: selectedFile.mimeType.startsWith('image/') ? undefined : {
          type: UNIVERSAL_MEDIA_NODE,
          attrs: {
            uuid: selectedFile.uuid || '',
            mimeType: selectedFile.mimeType,
            filename: selectedFile.filename,
            originalName: selectedFile.originalName,
            size: selectedFile.size,
            title: selectedFile.originalName,
            caption: selectedFile.caption || '',
            display: selectedFile.mimeType === 'application/pdf' ? 'embed' : 'card',
          },
        },
      };
      onSelect?.(asset);
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
          initialMimeFilter={options?.mimeTypes?.some((type) => type.startsWith('image/')) ? 'image' : ''}
          acceptedMimeTypes={options?.mimeTypes}
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
