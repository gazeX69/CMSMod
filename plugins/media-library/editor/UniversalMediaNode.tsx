import React from 'react';
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Download, FileText, Music, Video } from 'lucide-react';

export const UNIVERSAL_MEDIA_NODE = 'mediaLibraryMedia';

export function getMediaKind(mimeType = '') {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'document';
}

export const UniversalMediaNode = Node.create({
  name: UNIVERSAL_MEDIA_NODE,
  priority: 1000,
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      uuid: { default: null },
      mimeType: { default: 'application/octet-stream' },
      filename: { default: '' },
      originalName: { default: '' },
      size: { default: 0 },
      title: { default: '' },
      caption: { default: '' },
      display: { default: 'embed' },
    };
  },
  parseHTML() {
    return [{
      tag: 'cms-media[data-media-uuid]',
      getAttrs: (element) => {
        const node = element as HTMLElement;
        return {
          uuid: node.getAttribute('data-media-uuid'),
          mimeType: node.getAttribute('data-mime-type') || 'application/octet-stream',
          filename: node.getAttribute('data-filename') || '',
          originalName: node.getAttribute('data-original-name') || '',
          size: Number(node.getAttribute('data-size')) || 0,
          title: node.getAttribute('data-title') || '',
          caption: node.getAttribute('data-caption') || '',
          display: node.getAttribute('data-display') || 'embed',
        };
      },
    }];
  },
  renderHTML({ HTMLAttributes }) {
    const attrs = {
      'data-plugin-block': 'media-library',
      'data-media-uuid': HTMLAttributes.uuid,
      'data-mime-type': HTMLAttributes.mimeType,
      'data-filename': HTMLAttributes.filename,
      'data-original-name': HTMLAttributes.originalName,
      'data-size': HTMLAttributes.size,
      'data-title': HTMLAttributes.title,
      'data-caption': HTMLAttributes.caption,
      'data-display': HTMLAttributes.display,
    };
    return ['cms-media', attrs];
  },
  addNodeView() {
    return ReactNodeViewRenderer(UniversalMediaNodeView);
  },
});

function UniversalMediaNodeView({ node, selected, editor, getPos }: any) {
  const { uuid, mimeType, filename, originalName, title, caption, size, display } = node.attrs;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';
  const src = `${apiUrl}/api/media/resolve/${uuid}`;
  const downloadUrl = `${src}?download=1`;
  const kind = getMediaKind(mimeType);
  const label = title || originalName || filename || 'Media file';

  const selectNode = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('a,video,audio,iframe,button,input,select,textarea')) return;
    const pos = typeof getPos === 'function' ? getPos() : null;
    if (typeof pos === 'number') editor.commands.setNodeSelection(pos);
  };

  const selectNodeFromButton = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const pos = typeof getPos === 'function' ? getPos() : null;
    if (typeof pos === 'number') editor.commands.setNodeSelection(pos);
  };

  return (
    <NodeViewWrapper
      className={`universal-media-node universal-media-node--${kind} ${selected ? 'is-selected' : ''}`}
      data-media-kind={kind}
      contentEditable={false}
      draggable
      onClick={selectNode}
    >
      <button type="button" className="universal-media-select" aria-label="Select media block" onClick={selectNodeFromButton}>Edit media</button>
      {kind === 'image' && <img src={src} alt={title || label} />}
      {kind === 'video' && (
        <video controls preload="metadata" poster={`${src}?size=thumb`}>
          <source src={src} type={mimeType} />
        </video>
      )}
      {kind === 'audio' && (
        <div className="universal-media-audio">
          <Music size={24} />
          <strong>{label}</strong>
          <audio controls preload="metadata"><source src={src} type={mimeType} /></audio>
        </div>
      )}
      {kind === 'pdf' && display === 'embed' && (
        <iframe src={src} title={label} loading="lazy" />
      )}
      {(kind === 'document' || (kind === 'pdf' && display !== 'embed')) && (
        <div className="universal-media-file-card">
          {kind === 'pdf' ? <FileText size={28} /> : <Video size={28} />}
          <div><strong>{label}</strong><span>{mimeType} · {formatBytes(size)}</span></div>
          <a href={downloadUrl} download><Download size={16} /> Download</a>
        </div>
      )}
      {caption && <p className="universal-media-caption">{caption}</p>}
    </NodeViewWrapper>
  );
}

function formatBytes(value: number) {
  const bytes = Number(value) || 0;
  if (!bytes) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export function UniversalMediaPropertyPanel({ node, updateAttributes }: any) {
  const kind = getMediaKind(node.attrs.mimeType);
  return (
    <div className="universal-media-property-panel">
      <h4>{kind === 'pdf' ? 'PDF' : kind[0].toUpperCase() + kind.slice(1)}</h4>
      <label><span>Title</span><input value={node.attrs.title || ''} onChange={(event) => updateAttributes({ title: event.target.value })} /></label>
      <label><span>Caption</span><textarea value={node.attrs.caption || ''} onChange={(event) => updateAttributes({ caption: event.target.value })} /></label>
      {(kind === 'pdf' || kind === 'document') && (
        <label><span>Display</span><select value={node.attrs.display || 'embed'} onChange={(event) => updateAttributes({ display: event.target.value })}>
          {kind === 'pdf' && <option value="embed">Embedded preview</option>}
          <option value="card">File card</option>
          <option value="download">Download link</option>
        </select></label>
      )}
      <dl><div><dt>File</dt><dd>{node.attrs.originalName || node.attrs.filename}</dd></div><div><dt>Type</dt><dd>{node.attrs.mimeType}</dd></div><div><dt>Size</dt><dd>{formatBytes(node.attrs.size)}</dd></div></dl>
    </div>
  );
}
