import React, { useState, useEffect, useMemo } from 'react';
import { Editor, Node, Mark } from '@tiptap/react';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { EditorContext, EditorContextState } from '../core/EditorContext';
import { EditorRegistryProvider, useEditorRegistry } from './EditorRegistryProvider';
import { EditorRuntime } from '../core/EditorRuntime';
import { MediaNode } from '../nodes/MediaNode';
import { ExternalImageNode, isAllowedExternalImageUrl } from '../nodes/ExternalImageNode';
import { OpaquePluginBlock } from '../nodes/OpaquePluginBlock';
import { ActiveBlockExtension } from '../extensions/ActiveBlock';
import { DragDropExtension } from '../extensions/DragDrop';
import { UrlInsertForm } from '../modals';
import { editorRegistry } from '../registry/editorRegistry';
import { ExternalImagePropertyPanel, MediaImagePropertyPanel } from '../property-panels';

// Define a minimal demo node to verify registry-to-tiptap path
const PlatformDemoNode = Node.create({
  name: 'platformDemoNode',
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'div[data-platform-demo]' }];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['div', { 'data-platform-demo': '', ...HTMLAttributes }, 0];
  }
});

// Define a minimal demo mark to verify registry-to-tiptap path
const PlatformDemoMark = Mark.create({
  name: 'platformDemoMark',
  parseHTML() {
    return [{ tag: 'span[data-platform-demo-mark]' }];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['span', { 'data-platform-demo-mark': '', ...HTMLAttributes }, 0];
  }
});

const clearStoredMarks = (editor: Editor) => {
  const { state, view } = editor;
  const tr = state.tr;

  Object.values(state.schema.marks).forEach((markType) => {
    tr.removeStoredMark(markType);
  });

  if (tr.storedMarksSet) {
    view.dispatch(tr);
  }
};

const toggleInlineMark = (
  editor: Editor,
  markName: 'bold' | 'italic' | 'strike',
  command: () => boolean
) => {
  const isEmptyDocument = !editor.state.doc.textContent.trim();

  if (!editor.state.selection.empty && !isEmptyDocument) {
    return command();
  }

  editor.commands.focus();

  const { state: nextState, view } = editor;
  const markType = nextState.schema.marks[markName];

  if (!markType) {
    return command();
  }

  const activeMarks = isEmptyDocument
    ? (nextState.storedMarks || [])
    : (nextState.storedMarks || nextState.selection.$from.marks());
  const isActive = activeMarks.some((mark) => mark.type === markType);
  const nextMarks = isActive
    ? activeMarks.filter((mark) => mark.type !== markType)
    : [...activeMarks.filter((mark) => mark.type !== markType), markType.create()];

  const tr = nextState.tr;

  if (isEmptyDocument && !nextState.selection.empty) {
    const cursorPos = Math.min(1, nextState.doc.content.size);
    tr.setSelection(TextSelection.create(nextState.doc, cursorPos));
  }

  view.dispatch(tr.setStoredMarks(nextMarks));
  return true;
};

const runBlockCommand = (editor: Editor, command: () => boolean) => {
  const result = command();
  clearStoredMarks(editor);
  return result;
};

// Core static registrations at module load time
editorRegistry.commands.register({
  name: 'toggleBold',
  action: (editor) => {
    return toggleInlineMark(editor, 'bold', () => editor.chain().focus().toggleBold().run());
  }
});

editorRegistry.commands.register({
  name: 'setTextStyle',
  action: (editor, value: string) => {
    if (value === 'p') {
      return runBlockCommand(editor, () => editor.chain().focus().setParagraph().run());
    }

    return runBlockCommand(editor, () =>
      editor.chain().focus().setHeading({ level: parseInt(value, 10) as 1 | 2 | 3 }).run()
    );
  }
});

editorRegistry.commands.register({
  name: 'toggleItalic',
  action: (editor) => toggleInlineMark(editor, 'italic', () => editor.chain().focus().toggleItalic().run())
});

editorRegistry.commands.register({
  name: 'toggleStrike',
  action: (editor) => toggleInlineMark(editor, 'strike', () => editor.chain().focus().toggleStrike().run())
});

editorRegistry.commands.register({
  name: 'toggleBulletList',
  action: (editor) => runBlockCommand(editor, () => editor.chain().focus().toggleBulletList().run())
});

editorRegistry.commands.register({
  name: 'toggleOrderedList',
  action: (editor) => runBlockCommand(editor, () => editor.chain().focus().toggleOrderedList().run())
});

editorRegistry.commands.register({
  name: 'setTextAlign',
  action: (editor, alignment: 'left' | 'center' | 'right' | 'justify') => {
    return editor.chain().focus().setTextAlign(alignment).run();
  }
});

editorRegistry.commands.register({
  name: 'toggleBlockquote',
  action: (editor) => runBlockCommand(editor, () => editor.chain().focus().toggleBlockquote().run())
});

editorRegistry.commands.register({
  name: 'toggleCodeBlock',
  action: (editor) => runBlockCommand(editor, () => editor.chain().focus().toggleCodeBlock().run())
});

editorRegistry.commands.register({
  name: 'setHorizontalRule',
  action: (editor) => runBlockCommand(editor, () => editor.chain().focus().setHorizontalRule().run())
});

editorRegistry.commands.register({
  name: 'unsetLink',
  action: (editor) => {
    const result = editor.chain().focus().extendMarkRange('link').unsetLink().run();
    clearStoredMarks(editor);
    return result;
  }
});

editorRegistry.commands.register({
  name: 'insertMediaNode',
  action: (editor, payload: { uuid: string; alt?: string; caption?: string; mimeType?: string; width?: number }) => {
    if (!payload.uuid) {
      return false;
    }

    return runBlockCommand(editor, () => editor.chain().focus().insertContent([
      {
        type: 'mediaNode',
        attrs: {
          uuid: payload.uuid,
          alt: payload.alt || '',
          caption: payload.caption || '',
          mimeType: payload.mimeType || '',
          width: payload.width || null
        }
      },
      {
        type: 'paragraph'
      }
    ]).run());
  }
});

editorRegistry.commands.register({
  name: 'insertExternalImageNode',
  action: (editor, payload: { src: string; alt?: string; title?: string; width?: number }) => {
    if (!isAllowedExternalImageUrl(payload.src)) {
      return false;
    }

    return runBlockCommand(editor, () => editor.chain().focus().insertContent([
      {
        type: 'externalImageNode',
        attrs: {
          src: payload.src,
          alt: payload.alt || '',
          title: payload.title || '',
          width: payload.width || null
        }
      },
      {
        type: 'paragraph'
      }
    ]).run());
  }
});

editorRegistry.nodes.register({
  name: 'platformDemoNode',
  extension: PlatformDemoNode
});

editorRegistry.marks.register({
  name: 'platformDemoMark',
  extension: PlatformDemoMark
});

editorRegistry.nodes.register({
  name: 'mediaNode',
  extension: MediaNode
});

editorRegistry.nodes.register({
  name: 'externalImageNode',
  extension: ExternalImageNode
});

editorRegistry.nodes.register({
  name: 'opaquePluginBlock',
  extension: OpaquePluginBlock
});

editorRegistry.nodes.register({
  name: 'activeBlock',
  extension: ActiveBlockExtension
});

editorRegistry.nodes.register({
  name: 'dragDrop',
  extension: DragDropExtension
});

editorRegistry.propertyPanels.register({
  nodeType: 'mediaNode',
  component: MediaImagePropertyPanel
});

editorRegistry.propertyPanels.register({
  nodeType: 'externalImageNode',
  component: ExternalImagePropertyPanel
});

editorRegistry.inspectorSections.register({
  id: 'document',
  mode: 'document',
  title: 'Document',
  description: 'Document settings placeholder.',
  order: 10
});

editorRegistry.inspectorSections.register({
  id: 'blocks',
  mode: 'document',
  title: 'Blocks',
  description: 'Block outline placeholder.',
  order: 20
});

editorRegistry.inspectorSections.register({
  id: 'history',
  mode: 'document',
  title: 'History',
  description: 'History inspector placeholder.',
  order: 30
});

editorRegistry.insertSources.register({
  id: 'url',
  label: 'URL',
  icon: 'globe',
  preferredWidth: 400,
  render: UrlInsertForm
});

editorRegistry.toolbar.register({
  id: 'core:text-style',
  tab: 'format',
  group: 'typography',
  groupLabel: 'Typography',
  groupOrder: 10,
  order: 10,
  type: 'select',
  label: 'Text Style',
  icon: 'type',
  commandName: 'setTextStyle',
  getValue: (editor) => editor.isActive('heading', { level: 1 }) ? '1' : editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : 'p',
  options: [
    { label: 'Paragraph', value: 'p' },
    { label: 'Heading 1', value: '1' },
    { label: 'Heading 2', value: '2' },
    { label: 'Heading 3', value: '3' }
  ]
});

editorRegistry.toolbar.register({
  id: 'core:bold',
  tab: 'format',
  group: 'inline-formatting',
  groupLabel: 'Inline Formatting',
  groupOrder: 20,
  order: 10,
  label: 'Bold',
  icon: 'bold',
  commandName: 'toggleBold',
  isActive: (editor) => editor.isActive('bold')
});

editorRegistry.toolbar.register({
  id: 'core:italic',
  tab: 'format',
  group: 'inline-formatting',
  groupLabel: 'Inline Formatting',
  groupOrder: 20,
  order: 20,
  label: 'Italic',
  icon: 'italic',
  commandName: 'toggleItalic',
  isActive: (editor) => editor.isActive('italic')
});

editorRegistry.toolbar.register({
  id: 'core:strike',
  tab: 'format',
  group: 'inline-formatting',
  groupLabel: 'Inline Formatting',
  groupOrder: 20,
  order: 30,
  label: 'Strikethrough',
  icon: 'strike',
  commandName: 'toggleStrike',
  isActive: (editor) => editor.isActive('strike')
});

editorRegistry.toolbar.register({
  id: 'core:bullet-list',
  tab: 'format',
  group: 'lists',
  groupLabel: 'Lists',
  groupOrder: 30,
  order: 10,
  label: 'Bullet List',
  icon: 'list',
  commandName: 'toggleBulletList',
  isActive: (editor) => editor.isActive('bulletList')
});

editorRegistry.toolbar.register({
  id: 'core:ordered-list',
  tab: 'format',
  group: 'lists',
  groupLabel: 'Lists',
  groupOrder: 30,
  order: 20,
  label: 'Numbered List',
  icon: 'listOrdered',
  commandName: 'toggleOrderedList',
  isActive: (editor) => editor.isActive('orderedList')
});

(['left', 'center', 'right', 'justify'] as const).forEach((alignment, index) => {
  editorRegistry.toolbar.register({
    id: `core:align-${alignment}`,
    tab: 'format',
    group: 'alignment',
    groupLabel: 'Alignment',
    groupOrder: 40,
    order: (index + 1) * 10,
    label: `Align ${alignment[0].toUpperCase()}${alignment.slice(1)}`,
    icon: alignment === 'left' ? 'alignLeft' : alignment === 'center' ? 'alignCenter' : alignment === 'right' ? 'alignRight' : 'alignJustify',
    commandName: 'setTextAlign',
    commandArgs: [alignment],
    isActive: (editor) => editor.isActive({ textAlign: alignment })
  });
});

editorRegistry.toolbar.register({
  id: 'core:link',
  tab: 'insert',
  group: 'insert-inline',
  groupLabel: 'Inline Insert',
  groupOrder: 10,
  order: 10,
  label: 'Insert / Edit Link',
  icon: 'link',
  action: ({ editor, executeCommand, requestDialog }) => {
    if (editor.isActive('link')) {
      executeCommand('unsetLink');
      return;
    }
    requestDialog?.('link');
  },
  isActive: (editor) => editor.isActive('link')
});

editorRegistry.toolbar.register({
  id: 'core:blockquote',
  tab: 'insert',
  group: 'insert-block',
  groupLabel: 'Blocks',
  groupOrder: 20,
  order: 10,
  label: 'Insert Blockquote',
  icon: 'quote',
  commandName: 'toggleBlockquote',
  isActive: (editor) => editor.isActive('blockquote')
});

editorRegistry.toolbar.register({
  id: 'core:code-block',
  tab: 'insert',
  group: 'insert-block',
  groupLabel: 'Blocks',
  groupOrder: 20,
  order: 20,
  label: 'Insert Code Block',
  icon: 'code',
  commandName: 'toggleCodeBlock',
  isActive: (editor) => editor.isActive('codeBlock')
});

editorRegistry.toolbar.register({
  id: 'core:horizontal-rule',
  tab: 'insert',
  group: 'insert-block',
  groupLabel: 'Blocks',
  groupOrder: 20,
  order: 30,
  label: 'Insert Horizontal Divider',
  icon: 'minus',
  commandName: 'setHorizontalRule'
});

editorRegistry.toolbar.register({
  id: 'core:image',
  tab: 'insert',
  group: 'insert-media',
  groupLabel: 'Media',
  groupOrder: 30,
  order: 10,
  label: 'Insert Media',
  icon: 'image',
  action: ({ requestDialog }) => requestDialog?.('image')
});

interface EditorProviderProps {
  children: React.ReactNode;
  editor: Editor | null;
  metadata?: Record<string, any>;
}

const EditorContextWrapper: React.FC<EditorProviderProps> = ({
  children,
  editor,
  metadata = {}
}) => {
  const { registry } = useEditorRegistry();
  
  // Initialize Runtime
  const runtime = useMemo(() => {
    return new EditorRuntime(registry);
  }, [registry]);


  const [isFocused, setIsFocused] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [selectedNodePos, setSelectedNodePos] = useState<number | null>(null);
  const [selectedBlockNode, setSelectedBlockNode] = useState<any | null>(null);
  const [selectedBlockPos, setSelectedBlockPos] = useState<number | null>(null);
  const [activeBlockNode, setActiveBlockNode] = useState<any | null>(null);
  const [activeBlockPos, setActiveBlockPos] = useState<number | null>(null);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { selection } = editor.state;

      if (selection instanceof NodeSelection) {
        setSelectedNode(selection.node);
        setSelectedNodePos(selection.from);
        setSelectedBlockNode(selection.node);
        setSelectedBlockPos(selection.from);
        setActiveBlockNode(selection.node);
        setActiveBlockPos(selection.from);
        return;
      }

      setSelectedNode(null);
      setSelectedNodePos(null);

      const $from = selection.$from;
      for (let depth = $from.depth; depth >= 0; depth -= 1) {
        const node = $from.node(depth);
        if (node.type.name === 'doc') {
          continue;
        }

        if (node.isBlock) {
          const blockPos = depth === 0 ? 0 : $from.before(depth);
          setSelectedBlockNode(node);
          setSelectedBlockPos(blockPos);
          setActiveBlockNode(node);
          setActiveBlockPos(blockPos);
          return;
        }
      }

      setActiveBlockNode(null);
      setActiveBlockPos(null);
    };

    const handleFocus = () => setIsFocused(true);
    const handleBlur = ({ event }: { event?: FocusEvent } = {}) => {
      setIsFocused(false);
      const nextTarget = event?.relatedTarget;
      if (nextTarget instanceof HTMLElement && nextTarget.closest('.editor-inspector-shell')) {
        return;
      }

      handleSelectionUpdate();
    };

    editor.on('focus', handleFocus);
    editor.on('blur', handleBlur);
    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('transaction', handleSelectionUpdate);
    editor.on('update', handleSelectionUpdate);
    handleSelectionUpdate();

    return () => {
      editor.off('focus', handleFocus);
      editor.off('blur', handleBlur);
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('transaction', handleSelectionUpdate);
      editor.off('update', handleSelectionUpdate);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (
        target.closest('.tiptap-editor-wrapper') ||
        target.closest('.editor-inspector-shell') ||
        target.closest('.editor-toolbar') ||
        target.closest('.editor-tabs-header') ||
        target.closest('.editor-modal-shell') ||
        target.closest('.slash-command-menu')
      ) {
        return;
      }

      const docEnd = editor.state.doc.content.size;
      editor.view.dispatch(
        editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(docEnd), -1))
      );
      editor.view.dom.blur();
      setSelectedNode(null);
      setSelectedNodePos(null);
      setSelectedBlockNode(null);
      setSelectedBlockPos(null);
      setActiveBlockNode(null);
      setActiveBlockPos(null);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [editor]);

  const contextValue: EditorContextState = {
    editor,
    registry,
    runtime,
    metadata,
    selectionState: {
      selectedNode,
      selectedNodePos,
      selectedBlockNode,
      selectedBlockPos,
      activeBlockNode,
      activeBlockPos,
      isFocused
    }
  };

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
};

export const EditorProvider: React.FC<EditorProviderProps> = (props) => {
  return (
    <EditorRegistryProvider>
      <EditorContextWrapper {...props} />
    </EditorRegistryProvider>
  );
};

export default EditorProvider;
