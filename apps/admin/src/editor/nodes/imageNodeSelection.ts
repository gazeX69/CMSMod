import { NodeSelection, Plugin, TextSelection } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export type ImageAlignment = 'left' | 'center' | 'right' | 'wide';

const IMAGE_ALIGNMENTS = new Set<ImageAlignment>(['left', 'center', 'right', 'wide']);

export function parseImageWidthAttribute(element: HTMLElement): number | null {
  const widthValue =
    element.getAttribute('width') ||
    element.getAttribute('data-width') ||
    element.style.width;
  const parsedWidth = Number.parseInt(widthValue || '', 10);

  return Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : null;
}

export function renderImageWidthAttribute(width: unknown): Record<string, number> {
  if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) {
    return {};
  }

  return { width };
}

export function parseImageAlignmentAttribute(element: HTMLElement): ImageAlignment {
  const value =
    element.getAttribute('data-align') ||
    element.getAttribute('data-alignment') ||
    element.getAttribute('data-image-alignment') ||
    '';

  return IMAGE_ALIGNMENTS.has(value as ImageAlignment) ? (value as ImageAlignment) : 'center';
}

export function renderImageAlignmentAttribute(alignment: unknown): Record<string, string> {
  if (!IMAGE_ALIGNMENTS.has(alignment as ImageAlignment)) {
    return { 'data-align': 'center' };
  }

  return { 'data-align': alignment as ImageAlignment };
}

function isSelectedImageNode(selection: EditorState['selection'], nodeNames: Set<string>) {
  return selection instanceof NodeSelection && nodeNames.has(selection.node.type.name);
}

function createCaretMoveTransaction(
  state: EditorState,
  nodeNames: Set<string>,
  direction: -1 | 1
): Transaction | null {
  const { selection, schema } = state;

  if (!isSelectedImageNode(selection, nodeNames)) {
    return null;
  }

  const paragraph = schema.nodes.paragraph;
  if (!paragraph) {
    return null;
  }

  let transaction = state.tr;

  if (direction > 0) {
    const insertAt = selection.to;
    const nodeAfter = transaction.doc.resolve(insertAt).nodeAfter;

    if (!nodeAfter || !nodeAfter.isTextblock) {
      transaction = transaction.insert(insertAt, paragraph.create());
      return transaction.setSelection(TextSelection.create(transaction.doc, insertAt + 1));
    }

    return transaction.setSelection(TextSelection.near(transaction.doc.resolve(insertAt), 1));
  }

  const insertAt = selection.from;
  const nodeBefore = transaction.doc.resolve(insertAt).nodeBefore;

  if (!nodeBefore || !nodeBefore.isTextblock) {
    transaction = transaction.insert(insertAt, paragraph.create());
    return transaction.setSelection(TextSelection.create(transaction.doc, insertAt + 1));
  }

  return transaction.setSelection(TextSelection.near(transaction.doc.resolve(insertAt), -1));
}

function moveCaretFromSelectedImage(view: EditorView, nodeNames: Set<string>, direction: -1 | 1): boolean {
  const transaction = createCaretMoveTransaction(view.state, nodeNames, direction);

  if (!transaction) {
    return false;
  }

  view.dispatch(transaction.scrollIntoView());
  return true;
}

function selectClickedImageNode(view: EditorView, nodeNames: Set<string>, event: Event): boolean {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.closest('button[aria-label="Resize image"]')) {
    return false;
  }

  const alignmentButton = target.closest('button[data-image-alignment-option]');
  const wrapper = target.closest('[data-node-view-wrapper]');

  if (!(wrapper instanceof HTMLElement)) {
    return false;
  }

  const nodeViewElement = wrapper.parentElement || wrapper;

  try {
    const pos = view.posAtDOM(nodeViewElement, 0);
    const node = view.state.doc.nodeAt(pos);

    if (!node || !nodeNames.has(node.type.name)) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();

    const nextAlignment = alignmentButton instanceof HTMLElement
      ? alignmentButton.dataset.imageAlignmentOption
      : null;
    const transaction = nextAlignment && IMAGE_ALIGNMENTS.has(nextAlignment as ImageAlignment)
      ? view.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          alignment: nextAlignment,
        })
      : view.state.tr;

    transaction.setSelection(NodeSelection.create(transaction.doc, pos)).scrollIntoView();
    view.dispatch(transaction);
    view.focus();
    return true;
  } catch {
    return false;
  }
}

export function createImageNodeSelectionPlugin(nodeNames: string[]) {
  const selectableNodeNames = new Set(nodeNames);

  return new Plugin({
    props: {
      handleDOMEvents: {
        mousedown(view, event) {
          return selectClickedImageNode(view, selectableNodeNames, event);
        },
        mouseup(view, event) {
          return selectClickedImageNode(view, selectableNodeNames, event);
        },
      },

      handleClickOn(view, nodePos, node, _nodePos, event, direct) {
        const target = event.target;

        if (
          target instanceof HTMLElement &&
          target.closest('.selected-image-toolbar, button[aria-label="Resize image"]')
        ) {
          return false;
        }

        if (!direct || !selectableNodeNames.has(node.type.name)) {
          return false;
        }

        const transaction = view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)).scrollIntoView();
        view.dispatch(transaction);
        view.focus();
        return true;
      },

      handleTextInput(view, _from, _to, text) {
        const transaction = createCaretMoveTransaction(view.state, selectableNodeNames, 1);

        if (!transaction) {
          return false;
        }

        transaction.insertText(text);
        view.dispatch(transaction.scrollIntoView());
        return true;
      },

      handleKeyDown(view, event) {
        if (!isSelectedImageNode(view.state.selection, selectableNodeNames)) {
          return false;
        }

        if (event.key === 'Enter' || event.key === 'ArrowDown') {
          event.preventDefault();
          return moveCaretFromSelectedImage(view, selectableNodeNames, 1);
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          return moveCaretFromSelectedImage(view, selectableNodeNames, -1);
        }

        return false;
      },
    },
  });
}
