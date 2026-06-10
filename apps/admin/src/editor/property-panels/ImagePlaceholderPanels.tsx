import type { Editor } from '@tiptap/react';
import type { ImageAlignment } from '../nodes/imageNodeSelection';

interface ImagePropertyPanelProps {
  editor: Editor;
  node: any;
  updateAttributes: (attrs: Record<string, any>) => void;
}

const IMAGE_ALIGNMENT_OPTIONS: Array<{ value: ImageAlignment; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'wide', label: 'Wide' },
];

function parseWidthInput(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function ImagePropertyField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  min,
}: {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'number' | 'text';
  min?: number;
}) {
  return (
    <label className="property-panel-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ImageAlignmentField({
  value,
  onChange,
}: {
  value: ImageAlignment;
  onChange: (value: ImageAlignment) => void;
}) {
  return (
    <div className="property-panel-field">
      <span>Alignment</span>
      <div className="image-alignment-control" role="group" aria-label="Image alignment">
        {IMAGE_ALIGNMENT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? 'active' : ''}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AdvancedImagePlaceholder() {
  return (
    <details className="image-advanced-section">
      <summary>Advanced</summary>
      <p>Additional image controls will appear here in a later phase.</p>
    </details>
  );
}

function getImageAlignment(value: unknown): ImageAlignment {
  return value === 'left' || value === 'right' || value === 'wide' ? value : 'center';
}

export function MediaImagePropertyPanel({ node, updateAttributes }: ImagePropertyPanelProps) {
  const width = typeof node.attrs.width === 'number' ? node.attrs.width : '';
  const alignment = getImageAlignment(node.attrs.alignment);

  return (
    <div className="image-property-panel">
      <h4>Image</h4>
      <ImagePropertyField
        id="media-image-width"
        label="Width"
        type="number"
        min={64}
        value={width}
        onChange={(value) => updateAttributes({ width: parseWidthInput(value) })}
      />
      <ImageAlignmentField
        value={alignment}
        onChange={(value) => updateAttributes({ alignment: value })}
      />
      <ImagePropertyField
        id="media-image-alt"
        label="Alt Text"
        value={node.attrs.alt || ''}
        onChange={(value) => updateAttributes({ alt: value })}
      />
      <ImagePropertyField
        id="media-image-caption"
        label="Caption"
        value={node.attrs.caption || ''}
        onChange={(value) => updateAttributes({ caption: value })}
      />
      <AdvancedImagePlaceholder />
    </div>
  );
}

export function ExternalImagePropertyPanel({ node, updateAttributes }: ImagePropertyPanelProps) {
  const width = typeof node.attrs.width === 'number' ? node.attrs.width : '';
  const alignment = getImageAlignment(node.attrs.alignment);

  return (
    <div className="image-property-panel">
      <h4>Image</h4>
      <ImagePropertyField
        id="external-image-width"
        label="Width"
        type="number"
        min={64}
        value={width}
        onChange={(value) => updateAttributes({ width: parseWidthInput(value) })}
      />
      <ImageAlignmentField
        value={alignment}
        onChange={(value) => updateAttributes({ alignment: value })}
      />
      <ImagePropertyField
        id="external-image-alt"
        label="Alt Text"
        value={node.attrs.alt || ''}
        onChange={(value) => updateAttributes({ alt: value })}
      />
      <ImagePropertyField
        id="external-image-title"
        label="Title"
        value={node.attrs.title || ''}
        onChange={(value) => updateAttributes({ title: value })}
      />
      <AdvancedImagePlaceholder />
    </div>
  );
}
