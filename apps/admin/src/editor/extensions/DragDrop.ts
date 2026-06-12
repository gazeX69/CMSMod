import { Extension } from '@tiptap/react';
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state';
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view';

interface DragDropState {
  indicatorPos: number | null;
  draggedBlockStartPos: number | null;
  draggedBlockEndPos: number | null;
  isDragging: boolean;
}

type DragPoint = { x: number; y: number };

const dragDropKey = new PluginKey<DragDropState>('blockDragDrop');
const DRAG_THRESHOLD = 7;
const AUTO_SCROLL_EDGE = 92;
const AUTO_SCROLL_MAX_SPEED = 18;

function readBlockPosition(grip: HTMLElement, attribute: string): number | null {
  const value = Number(grip.getAttribute(attribute));
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function getEventElement(event: Event): HTMLElement | null {
  return event.target instanceof HTMLElement ? event.target : null;
}

function getTopLevelBlock(view: EditorView, clientX: number, clientY: number): HTMLElement | null {
  let block = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
  if (!block || !view.dom.contains(block)) return null;

  while (block && block.parentElement !== view.dom) {
    block = block.parentElement;
  }

  return block && block !== view.dom ? block : null;
}

function getTopLevelBlockPos(view: EditorView, block: HTMLElement): number | null {
  try {
    const domPos = view.posAtDOM(block, 0);
    const $domPos = view.state.doc.resolve(domPos);
    return $domPos.depth > 0 ? $domPos.before(1) : domPos;
  } catch {
    return null;
  }
}

function getDropPosition(view: EditorView, clientX: number, clientY: number): number | null {
  const block = getTopLevelBlock(view, clientX, clientY);

  if (block) {
    const startPos = getTopLevelBlockPos(view, block);
    const node = startPos === null ? null : view.state.doc.nodeAt(startPos);
    if (startPos !== null && node) {
      const rect = block.getBoundingClientRect();
      const relativeY = Math.max(0, Math.min(rect.height, clientY - rect.top));
      return relativeY >= rect.height / 2 ? startPos + node.nodeSize : startPos;
    }
  }

  const editorRect = view.dom.getBoundingClientRect();
  if (clientY <= editorRect.top) return 0;
  if (clientY >= editorRect.bottom) return view.state.doc.content.size;
  return null;
}

function updateDropIndicator(view: EditorView, dropPos: number | null): void {
  const pluginState = dragDropKey.getState(view.state);
  if (!pluginState || pluginState.draggedBlockStartPos === null || pluginState.draggedBlockEndPos === null) return;

  const insideDraggedBlock = dropPos !== null
    && dropPos >= pluginState.draggedBlockStartPos
    && dropPos <= pluginState.draggedBlockEndPos;
  const nextIndicator = insideDraggedBlock ? null : dropPos;

  if (pluginState.indicatorPos !== nextIndicator) {
    view.dispatch(view.state.tr.setMeta('dragDropIndicator', nextIndicator));
  }
}

function finishBlockMove(view: EditorView): { handled: boolean; movedPos: number | null } {
  const pluginState = dragDropKey.getState(view.state);
  if (!pluginState || pluginState.draggedBlockStartPos === null || pluginState.draggedBlockEndPos === null) {
    return { handled: false, movedPos: null };
  }

  const { draggedBlockStartPos: start, draggedBlockEndPos: end, indicatorPos } = pluginState;
  if (indicatorPos === null || indicatorPos === start || indicatorPos === end) {
    view.dispatch(view.state.tr.setMeta('dragDropEnd', true));
    return { handled: true, movedPos: null };
  }

  const node = view.state.doc.nodeAt(start);
  if (!node || start + node.nodeSize !== end) {
    view.dispatch(view.state.tr.setMeta('dragDropEnd', true));
    return { handled: true, movedPos: null };
  }

  const tr = view.state.tr.delete(start, end);
  const mappedDropPos = tr.mapping.map(indicatorPos);
  tr.insert(mappedDropPos, node);
  tr.setSelection(Selection.near(tr.doc.resolve(mappedDropPos)));
  tr.setMeta('dragDropEnd', true);
  view.dispatch(tr.scrollIntoView());
  return { handled: true, movedPos: mappedDropPos };
}

class DragHandleView {
  private view: EditorView;
  private activePointerId: number | null = null;
  private origin: DragPoint | null = null;
  private latestPoint: DragPoint | null = null;
  private dragging = false;
  private sourceBlock: HTMLElement | null = null;
  private sourceLabel = 'Block';
  private preview: HTMLElement | null = null;
  private liveRegion: HTMLElement | null = null;
  private scrollFrame: number | null = null;
  private scrollContainer: HTMLElement | null = null;

  private onMouseDown: (event: MouseEvent) => void;
  private onMouseMove: (event: MouseEvent) => void;
  private onMouseUp: () => void;
  private onPointerDown: (event: PointerEvent) => void;
  private onPointerMove: (event: PointerEvent) => void;
  private onPointerUp: (event: PointerEvent) => void;
  private onKeyDown: (event: KeyboardEvent) => void;

  constructor(view: EditorView) {
    this.view = view;
    this.createLiveRegion();

    this.onMouseDown = (event) => {
      if (event.button !== 0) return;
      this.prepareDrag(event, { x: event.clientX, y: event.clientY });
    };

    this.onMouseMove = (event) => {
      if (!this.origin) return;
      this.updateDrag({ x: event.clientX, y: event.clientY }, event);
    };

    this.onMouseUp = () => this.completeDrag();

    this.onPointerDown = (event) => {
      if (event.pointerType === 'mouse' || event.button !== 0) return;
      if (this.prepareDrag(event, { x: event.clientX, y: event.clientY })) {
        this.activePointerId = event.pointerId;
      }
    };

    this.onPointerMove = (event) => {
      if (event.pointerId !== this.activePointerId || !this.origin) return;
      this.updateDrag({ x: event.clientX, y: event.clientY }, event);
    };

    this.onPointerUp = (event) => {
      if (event.pointerId !== this.activePointerId) return;
      this.completeDrag();
      this.activePointerId = null;
    };

    this.onKeyDown = (event) => {
      if (event.key !== 'Escape' || !this.origin) return;
      event.preventDefault();
      this.cancelDrag('Move cancelled');
    };

    document.addEventListener('mousedown', this.onMouseDown, true);
    window.addEventListener('mousemove', this.onMouseMove, { passive: false });
    window.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('pointerdown', this.onPointerDown, true);
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp, { passive: false });
    window.addEventListener('pointercancel', this.onPointerUp, { passive: false });
    window.addEventListener('keydown', this.onKeyDown, true);
  }

  private prepareDrag(event: Event, point: DragPoint): boolean {
    const grip = getEventElement(event)?.closest('.editor-block-handle-grip') as HTMLElement | null;
    const wrapper = grip?.closest('.tiptap-editor-wrapper');
    if (!grip || !wrapper?.contains(this.view.dom)) return false;

    const start = readBlockPosition(grip, 'data-block-pos');
    const end = readBlockPosition(grip, 'data-block-end-pos');
    const node = start === null ? null : this.view.state.doc.nodeAt(start);
    if (start === null || end === null || end <= start || !node || start + node.nodeSize !== end) return false;

    event.preventDefault();
    this.origin = point;
    this.latestPoint = point;
    this.dragging = false;
    this.sourceBlock = this.view.nodeDOM(start) as HTMLElement | null;
    this.sourceLabel = grip.getAttribute('data-block-label') || 'Block';
    this.view.dispatch(this.view.state.tr.setMeta('dragDropStart', { start, end }));
    return true;
  }

  private updateDrag(point: DragPoint, event: Event): void {
    if (!this.origin) return;
    this.latestPoint = point;

    if (!this.dragging) {
      const distance = Math.hypot(point.x - this.origin.x, point.y - this.origin.y);
      if (distance < DRAG_THRESHOLD) return;
      this.startVisualDrag(point);
    }

    event.preventDefault();
    this.positionPreview(point);
    updateDropIndicator(this.view, getDropPosition(this.view, point.x, point.y));
  }

  private startVisualDrag(point: DragPoint): void {
    this.dragging = true;
    this.scrollContainer = this.view.dom.closest('.admin-content-viewport');
    this.view.dispatch(this.view.state.tr.setMeta('dragDropActivate', true));
    this.view.dom.classList.add('prosemirror-dragging');
    this.preview = this.createPreview();
    document.body.appendChild(this.preview);
    this.positionPreview(point);
    this.announce(`Moving ${this.sourceLabel}. Release to place, or press Escape to cancel.`);
    this.startAutoScroll();
  }

  private createPreview(): HTMLElement {
    const preview = document.createElement('div');
    const sourceRect = this.sourceBlock?.getBoundingClientRect();
    const sourceText = this.sourceBlock?.innerText.trim().replace(/\s+/g, ' ') || this.sourceLabel;
    preview.className = 'block-drag-preview';
    preview.style.width = `${Math.min(sourceRect?.width || 360, 440)}px`;
    preview.innerHTML = `<span class="block-drag-preview-label">${this.sourceLabel}</span><span class="block-drag-preview-text"></span>`;
    const text = preview.querySelector('.block-drag-preview-text');
    if (text) text.textContent = sourceText.slice(0, 120) || 'Empty block';
    return preview;
  }

  private positionPreview(point: DragPoint): void {
    if (!this.preview) return;
    const margin = 12;
    const maxLeft = Math.max(margin, window.innerWidth - this.preview.offsetWidth - margin);
    const left = Math.max(margin, Math.min(point.x + 18, maxLeft));
    const top = Math.max(margin, Math.min(point.y + 14, window.innerHeight - this.preview.offsetHeight - margin));
    this.preview.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }

  private startAutoScroll(): void {
    if (this.scrollFrame !== null) return;

    const tick = () => {
      this.scrollFrame = window.requestAnimationFrame(tick);
      if (!this.dragging || !this.latestPoint) return;

      const container = this.scrollContainer;
      const rect = container?.getBoundingClientRect() || { top: 0, bottom: window.innerHeight };
      let speed = 0;
      if (this.latestPoint.y < rect.top + AUTO_SCROLL_EDGE) {
        speed = -AUTO_SCROLL_MAX_SPEED * (1 - Math.max(0, this.latestPoint.y - rect.top) / AUTO_SCROLL_EDGE);
      } else if (this.latestPoint.y > rect.bottom - AUTO_SCROLL_EDGE) {
        speed = AUTO_SCROLL_MAX_SPEED * (1 - Math.max(0, rect.bottom - this.latestPoint.y) / AUTO_SCROLL_EDGE);
      }

      if (Math.abs(speed) < 0.5) return;
      if (container) container.scrollTop += speed;
      else window.scrollBy(0, speed);
      updateDropIndicator(this.view, getDropPosition(this.view, this.latestPoint.x, this.latestPoint.y));
    };

    this.scrollFrame = window.requestAnimationFrame(tick);
  }

  private completeDrag(): void {
    if (!this.origin) return;

    if (this.dragging) {
      const result = finishBlockMove(this.view);
      if (result.movedPos !== null) {
        this.animateDroppedBlock(result.movedPos);
        this.announce(`${this.sourceLabel} moved`);
      } else {
        this.announce(`${this.sourceLabel} kept in its original position`);
      }
    } else {
      this.view.dispatch(this.view.state.tr.setMeta('dragDropEnd', true));
    }

    this.resetVisualState();
  }

  private cancelDrag(message = ''): void {
    this.view.dispatch(this.view.state.tr.setMeta('dragDropEnd', true));
    if (message) this.announce(message);
    this.resetVisualState();
  }

  private resetVisualState(): void {
    this.view.dom.classList.remove('prosemirror-dragging');
    this.preview?.remove();
    if (this.scrollFrame !== null) window.cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = null;
    this.preview = null;
    this.sourceBlock = null;
    this.origin = null;
    this.latestPoint = null;
    this.dragging = false;
    this.activePointerId = null;
  }

  private animateDroppedBlock(pos: number): void {
    window.requestAnimationFrame(() => {
      const block = this.view.nodeDOM(pos) as HTMLElement | null;
      if (!block) return;
      block.classList.add('block-drop-complete');
      window.setTimeout(() => block.classList.remove('block-drop-complete'), 420);
    });
  }

  private createLiveRegion(): void {
    this.liveRegion = document.createElement('div');
    this.liveRegion.className = 'block-drag-live-region';
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.liveRegion);
  }

  private announce(message: string): void {
    if (!this.liveRegion) return;
    this.liveRegion.textContent = '';
    window.setTimeout(() => {
      if (this.liveRegion) this.liveRegion.textContent = message;
    }, 20);
  }

  public destroy() {
    this.cancelDrag();
    this.liveRegion?.remove();
    document.removeEventListener('mousedown', this.onMouseDown, true);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('pointerdown', this.onPointerDown, true);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown, true);
  }
}

export const DragDropExtension = Extension.create({
  name: 'dragDrop',

  addProseMirrorPlugins() {
    return [
      new Plugin<DragDropState>({
        key: dragDropKey,
        state: {
          init: () => ({
            indicatorPos: null,
            draggedBlockStartPos: null,
            draggedBlockEndPos: null,
            isDragging: false,
          }),
          apply(tr, value): DragDropState {
            const nextValue = { ...value };
            const indicator = tr.getMeta('dragDropIndicator');
            const dragStart = tr.getMeta('dragDropStart');

            if (indicator !== undefined) {
              nextValue.indicatorPos = indicator;
            } else if (nextValue.indicatorPos !== null && tr.docChanged) {
              nextValue.indicatorPos = tr.mapping.map(nextValue.indicatorPos);
            }

            if (dragStart !== undefined) {
              nextValue.draggedBlockStartPos = dragStart.start;
              nextValue.draggedBlockEndPos = dragStart.end;
            }

            if (tr.getMeta('dragDropActivate') !== undefined) {
              nextValue.isDragging = true;
            }

            if (tr.getMeta('dragDropEnd') !== undefined) {
              return { indicatorPos: null, draggedBlockStartPos: null, draggedBlockEndPos: null, isDragging: false };
            }

            return nextValue;
          },
        },
        props: {
          decorations(state) {
            const pluginState = dragDropKey.getState(state);
            if (!pluginState) return null;

            const decorations: Decoration[] = [];
            if (pluginState.isDragging && pluginState.draggedBlockStartPos !== null && pluginState.draggedBlockEndPos !== null) {
              decorations.push(Decoration.node(
                pluginState.draggedBlockStartPos,
                pluginState.draggedBlockEndPos,
                { class: 'block-drag-source' }
              ));
            }

            if (pluginState.indicatorPos !== null) {
              decorations.push(Decoration.widget(pluginState.indicatorPos, () => {
                const indicator = document.createElement('div');
                indicator.className = 'drag-insertion-indicator';
                indicator.dataset.position = String(pluginState.indicatorPos);
                indicator.innerHTML = '<span>Drop block here</span>';
                return indicator;
              }, { side: -1 }));
            }

            return decorations.length > 0 ? DecorationSet.create(state.doc, decorations) : null;
          },
          handleDOMEvents: {
            dragover(view, event) {
              const pluginState = dragDropKey.getState(view.state);
              if (!pluginState || pluginState.draggedBlockStartPos === null) return false;
              event.preventDefault();
              updateDropIndicator(view, getDropPosition(view, event.clientX, event.clientY));
              return true;
            },
            drop(view, event) {
              event.preventDefault();
              return finishBlockMove(view).handled;
            },
          },
        },
        view: (view) => new DragHandleView(view),
      }),
    ];
  },
});
