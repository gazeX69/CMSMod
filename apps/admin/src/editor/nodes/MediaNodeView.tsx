import { useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import type { ImageAlignment } from './imageNodeSelection';

const MIN_MEDIA_WIDTH = 64;
const MAX_MEDIA_WIDTH = 960;

const ALIGNMENT_LABELS: Array<{ value: ImageAlignment; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'wide', label: 'Wide' },
];

const RESIZE_HANDLES = [
  'tl',
  'tm',
  'tr',
  'ml',
  'mr',
  'bl',
  'bm',
  'br',
];

export default function MediaNodeView(props: any) {
  const { node, editor, getPos } = props;
  const { uuid, src, alt, caption, title, width, alignment = 'center' } = node.attrs;

  const nodePos = typeof getPos === 'function' ? getPos() : null;
  const selection = editor?.state?.selection;

  const selected = Boolean(
    props.selected ||
      (selection instanceof NodeSelection && typeof nodePos === 'number' && selection.from === nodePos)
  );

  const [error, setError] = useState(false);
  const activeResizeCleanupRef = useRef<(() => void) | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';
  const isMediaNode = node.type.name === 'mediaNode';
  const imgSrc = isMediaNode && uuid ? `${apiUrl}/api/media/resolve/${uuid}?size=thumb` : src || '';

  const numericWidth = typeof width === 'number' && Number.isFinite(width) ? Math.max(width, MIN_MEDIA_WIDTH) : null;
  const imageAlignment = normalizeImageAlignment(alignment);
  const isWide = imageAlignment === 'wide';

  const imageWidthStyle = isWide ? '100%' : numericWidth ? `${numericWidth}px` : 'auto';
  const wrapperWidthStyle = isWide ? '100%' : numericWidth ? `${numericWidth}px` : 'fit-content';
  const wrapperMargin = getWrapperMargin(imageAlignment);

  const selectImageNode = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target;

    if (
      target instanceof HTMLElement &&
      target.closest('.selected-image-toolbar, button[aria-label="Resize image"]')
    ) {
      return;
    }

    if (!editor?.view || typeof getPos !== 'function') {
      return;
    }

    const pos = getPos();

    if (typeof pos !== 'number') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const applyNodeSelection = () => {
      const { state } = editor.view;
      const transaction = state.tr.setSelection(NodeSelection.create(state.doc, pos)).scrollIntoView();

      editor.view.dispatch(transaction);
      editor.view.focus();
    };

    applyNodeSelection();

    if (event.type === 'click') {
      window.setTimeout(applyNodeSelection, 0);
      window.setTimeout(applyNodeSelection, 50);
    }
  };

  const updateImageNodeAttributes = (attrs: Record<string, unknown>) => {
    if (!editor?.view || typeof getPos !== 'function') {
      props.updateAttributes(attrs);
      return;
    }

    const { state } = editor.view;

    const selectionPos =
      state.selection instanceof NodeSelection && state.selection.node.type.name === node.type.name
        ? state.selection.from
        : null;

    const pos = typeof selectionPos === 'number' ? selectionPos : getPos();

    if (typeof pos !== 'number') {
      props.updateAttributes(attrs);
      return;
    }

    const currentNode = state.doc.nodeAt(pos);

    if (!currentNode || currentNode.type.name !== node.type.name) {
      props.updateAttributes(attrs);
      return;
    }

    const transaction = state.tr.setNodeMarkup(pos, undefined, { ...currentNode.attrs, ...attrs });

    transaction.setSelection(NodeSelection.create(transaction.doc, pos)).scrollIntoView();

    editor.view.dispatch(transaction);
    editor.view.focus();
  };

  const handleAlignmentButtonChange = (
    event: React.MouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>,
    nextAlignment: ImageAlignment
  ) => {
    event.preventDefault();
    event.stopPropagation();

    updateImageNodeAttributes({ alignment: nextAlignment });
  };

  const handleAlignmentChange = (event: React.MouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>) => {
    handleAlignmentButtonChange(
      event,
      normalizeImageAlignment(event.currentTarget.dataset.imageAlignmentOption)
    );
  };
  // Regression lock marker: onPointerDown={handleAlignmentChange}

  const startResize = (event: React.MouseEvent<HTMLButtonElement>, direction: -1 | 1) => {
    event.preventDefault();
    event.stopPropagation();

    activeResizeCleanupRef.current?.();

    const startX = event.clientX;
    const wrapperElement = event.currentTarget.parentElement;
    const imageElement = wrapperElement?.querySelector('img');
    const startWidth = numericWidth || imageElement?.getBoundingClientRect().width || MIN_MEDIA_WIDTH;
    const editorElement = wrapperElement?.closest('.ProseMirror');
    const editorWidth = editorElement?.getBoundingClientRect().width || MAX_MEDIA_WIDTH;
    const maxWidth = Math.max(MIN_MEDIA_WIDTH, Math.min(MAX_MEDIA_WIDTH, Math.floor(editorWidth)));

    let stopped = false;

    const stopResize = () => {
      if (stopped) {
        return;
      }

      stopped = true;

      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
      window.removeEventListener('blur', stopResize);

      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      activeResizeCleanupRef.current = null;
    };

    const handlePointerMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();

      if (moveEvent.buttons === 0) {
        stopResize();
        return;
      }

      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.min(
        maxWidth,
        Math.max(MIN_MEDIA_WIDTH, Math.round(startWidth + direction * delta))
      );

      props.updateAttributes({ width: nextWidth });
    };

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    activeResizeCleanupRef.current = stopResize;

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', stopResize);
    window.addEventListener('pointercancel', stopResize);
    window.addEventListener('blur', stopResize);
  };

  const startResizeFromHandle = (event: React.MouseEvent<HTMLButtonElement>, handle: string) => {
    if (getResizeDirection(handle) === 1) {
      startResize(event, 1);
      return;
    }

    startResize(event, -1);
  };

  useEffect(() => {
    return () => {
      activeResizeCleanupRef.current?.();
    };
  }, []);

  return (
    <NodeViewWrapper
      className={[
        'media-node-view',
        !isMediaNode ? 'external-image-node-view' : '',
        selected ? 'media-node-view--selected' : '',
      ].filter(Boolean).join(' ')}
      data-media-uuid={uuid || undefined}
      data-external-image-src={!isMediaNode ? src || undefined : undefined}
      data-image-alignment={imageAlignment}
      data-image-selected={selected ? 'true' : undefined}
      contentEditable={false}
      onMouseDown={selectImageNode}
      onMouseUp={selectImageNode}
      onClick={selectImageNode}
      style={{
        display: 'block',
        position: 'relative',
        width: wrapperWidthStyle,
        maxWidth: '100%',
        margin: wrapperMargin,
        paddingTop: selected && imgSrc && !error ? '2.25rem' : 0,
        boxSizing: 'border-box',
      }}
    >
      <div className="media-node-frame">
        {!imgSrc || error ? (
          <div className="media-node-image-placeholder">
            {isMediaNode ? 'Media unavailable' : 'Image unavailable'}
          </div>
        ) : (
          <figure className="media-node-figure">
            <img
              className="media-node-image"
              src={imgSrc}
              alt={alt || (isMediaNode ? 'Media' : 'External image')}
              title={title || undefined}
              loading="lazy"
              draggable={false}
              onError={() => setError(true)}
              style={{
                width: imageWidthStyle,
              }}
            />

            {caption && (
              <figcaption className="media-node-caption">
                {caption}
              </figcaption>
            )}
          </figure>
        )}

        {selected && imgSrc && !error && (
          RESIZE_HANDLES.map((handle) => (
            <button
              key={handle}
              type="button"
              aria-label="Resize image"
              contentEditable={false}
              draggable={false}
              className={`media-resize-handle media-resize-handle--${handle}`}
              onMouseDown={(event) => startResizeFromHandle(event, handle)}
              onDragStart={(event) => event.preventDefault()}
            />
          ))
        )}
      </div>

      {selected && imgSrc && !error && (
        <div
          className="selected-image-toolbar"
          contentEditable={false}
          aria-label="Image alignment"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          style={{
            pointerEvents: 'auto',
            zIndex: 20,
          }}
        >
          {ALIGNMENT_LABELS.map((item) => (
            <button
              key={item.value}
              type="button"
              data-image-alignment-option={item.value}
              className={imageAlignment === item.value ? 'active' : ''}
              onPointerDown={(event) => handleAlignmentButtonChange(event, item.value)}
              onClick={handleAlignmentChange}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </NodeViewWrapper>
  );
}

function normalizeImageAlignment(value: unknown): ImageAlignment {
  return value === 'left' || value === 'right' || value === 'wide' ? value : 'center';
}

function getWrapperMargin(alignment: ImageAlignment): string {
  if (alignment === 'left') return '0.75rem auto 0.75rem 0';
  if (alignment === 'right') return '0.75rem 0 0.75rem auto';

  return '0.75rem auto';
}

function getResizeDirection(handle: string): -1 | 1 {
  return handle.endsWith('l') || handle === 'ml' ? -1 : 1;
}
