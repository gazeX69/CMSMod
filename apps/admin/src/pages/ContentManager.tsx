import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, ArrowUp, ArrowDown, Save, Send, Plus, Search, Loader2,
  CheckCircle, Link, Image as ImageIcon, Globe, 
  X, AlertCircle, Eye, FileText, Columns3, Maximize2, Minimize2, Clock
} from 'lucide-react';


// Import Tiptap Extensions
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapLink from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';

// Import Editor Engine
import { EditorProvider } from '../editor/provider/EditorProvider';
import { editorRegistry } from '../editor/registry/editorRegistry';
import { EditorRuntime } from '../editor/core/EditorRuntime';
import { InspectorHost } from '../editor/inspector';
import { EditorModalShell } from '../editor/modals';
import { EditorToolbarRibbon } from '../editor/toolbar';
import { Selection, TextSelection } from '@tiptap/pm/state';
import { notifyEditorSaved, runEditorPublishChecks, setEditorDocumentContext } from '../plugins/adminRuntimeSdk';
import { contentTypeRegistry } from '../services/ContentTypeRegistry';

interface ContentManagerProps {
    user: any;
    apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
    pluginsList?: any[];
    postsSubView: 'list' | 'create' | 'edit';
    setPostsSubView: (view: 'list' | 'create' | 'edit') => void;
    setCurrentRoute: (route: string) => void;
    editingPostRouteId: number | null;
    setEditingPostRouteId: (postId: number | null) => void;
    contentType: string;
}

type LinkModalRange = { from: number; to: number; empty: boolean };
type WorkspaceTab = 'write' | 'preview' | 'history';
type CanvasWidth = 'narrow' | 'default' | 'wide' | 'full';
type SlashCommandState = {
    open: boolean;
    query: string;
    range: { from: number; to: number } | null;
    anchor: SlashMenuAnchor | null;
    source: 'typed' | 'insert';
};
type SlashMenuAnchor = {
    left: number;
    top: number;
    placement: 'up' | 'down';
    maxHeight: number;
};
type HoveredBlockState = {
    top: number;
    left: number;
    height: number;
    blockPos: number;
    blockEndPos: number;
    insertPos: number;
    label: string;
    canMoveUp: boolean;
    canMoveDown: boolean;
};
type FeaturedImageValue = {
    url: string;
    assetUuid: string | null;
    alt: string;
    source: 'external' | 'media-library';
};

export default function ContentManager({ user, apiFetch, pluginsList = [], postsSubView, setPostsSubView, setCurrentRoute, editingPostRouteId, setEditingPostRouteId, contentType }: ContentManagerProps) {
    const definition = contentTypeRegistry.get(contentType) || {
        key: contentType,
        singular: 'Item',
        plural: 'Items',
        apiBasePath: `/api/${contentType}s`
    };
    const [posts, setPosts] = useState<any[]>([]);
    const [loadingPosts, setLoadingPosts] = useState<boolean>(false);
    const [editingPostId, setEditingPostId] = useState<number | null>(null);
    const [editingPostUuid, setEditingPostUuid] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');


    const [editorTitle, setEditorTitle] = useState('');
    const [editorSlug, setEditorSlug] = useState('');
    const [editorSlugManuallyEdited, setEditorSlugManuallyEdited] = useState(false);
    const [editorExcerpt, setEditorExcerpt] = useState('');
    const [editorBody, setEditorBody] = useState('');
    const [editorStatus, setEditorStatus] = useState<'draft' | 'published' | 'archived'>('draft');
    const [editorCategoryIds, setEditorCategoryIds] = useState<number[]>([]);
    const [editorTagIds, setEditorTagIds] = useState<number[]>([]);
    const [featuredImage, setFeaturedImage] = useState<FeaturedImageValue | null>(null);

    const [isEditorSaving, setIsEditorSaving] = useState(false);
    const [editorError, setEditorError] = useState<string | null>(null);
    const [editorSuccess, setEditorSuccess] = useState<string | null>(null);
    const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const autosaveTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const autosaveInFlightRef = useRef(false);
    const autosavePromiseRef = useRef<Promise<number | null> | null>(null);
    const publishInFlightRef = useRef(false);
    const editingPostIdRef = useRef<number | null>(null);
    const lastSavedSnapshotRef = useRef('');
    const autoDraftCreatedRef = useRef(false);
    const pendingLinkRangeRef = useRef<{ from: number; to: number } | null>(null);
    const lastEditorSelectionRangeRef = useRef<{ from: number; to: number } | null>(null);
    const linkModalRangeRef = useRef<LinkModalRange | null>(null);
    const imageModalRangeRef = useRef<{ from: number; to: number } | null>(null);
    const imageUserRangeRef = useRef<{ from: number; to: number } | null>(null);
    const frozenImageInsertRangeRef = useRef<{ from: number; to: number } | null>(null);
    const lastEditorSelectedTextRef = useRef('');
    const editorFocusLeavingRef = useRef(false);

    // State untuk Ribbon Tabs di Editor
    const [ribbonTab, setRibbonTab] = useState<string>('format');
    const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('write');
    const [canvasWidth, setCanvasWidth] = useState<CanvasWidth>('default');
    const [focusMode, setFocusMode] = useState(false);
    const [zenMode, setZenMode] = useState(false);
    const [slashCommand, setSlashCommand] = useState<SlashCommandState>({ open: false, query: '', range: null, anchor: null, source: 'typed' });
    const [slashCommandIndex, setSlashCommandIndex] = useState(0);
    const [hoveredBlock, setHoveredBlock] = useState<HoveredBlockState | null>(null);
    const [selectedBlock, setSelectedBlock] = useState<HoveredBlockState | null>(null);
    const slashCommandRef = useRef<SlashCommandState>({ open: false, query: '', range: null, anchor: null, source: 'typed' });
    const slashCommandIndexRef = useRef(0);
    const slashCommandItemsRef = useRef<Array<{ id: string; label: string; hint: string }>>([]);

    useEffect(() => {
        editingPostIdRef.current = editingPostId;
    }, [editingPostId]);

    // STATE UNTUK CUSTOM MODAL INSERT (LINK & IMAGE)
    const [insertModalConfig, setInsertModalConfig] = useState<{ type: 'link' | 'image' | 'featured-image', title: string } | null>(null);
    const [insertModalText, setInsertModalText] = useState('');
    const [insertModalValue, setInsertModalValue] = useState('');
    const [selectedInsertSourceId, setSelectedInsertSourceId] = useState<string>('');

    const [newCatName, setNewCatName] = useState('');
    const [showAddCatForm, setShowAddCatForm] = useState(false);

    // State Taxonomy
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [allTags, setAllTags] = useState<any[]>([]);
    const [loadingTaxonomy, setLoadingTaxonomy] = useState(false);
    const [searchCategoryQuery, setSearchCategoryQuery] = useState('');
    const [tagInputText, setTagInputText] = useState('');

    const runtime = React.useMemo(() => new EditorRuntime(editorRegistry), []);
    const activePluginIds = React.useMemo(
        () => new Set(pluginsList.filter((plugin) => plugin.status === 'ACTIVE').map((plugin) => plugin.key)),
        [pluginsList]
    );
    const availableInsertSources = React.useMemo(
        () => runtime.getInsertSources().filter((source) => !source.pluginId || activePluginIds.has(source.pluginId)),
        [runtime, activePluginIds]
    );
    const editorVersionLabel = editingPostId ? `v${editingPostId}` : 'vDraft';
    const wordCount = React.useMemo(() => {
        const text = editorBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return text ? text.split(' ').length : 0;
    }, [editorBody]);

    const getDocumentContext = React.useCallback(() => ({
        contentUuid: editingPostUuid,
        contentType,
        title: editorTitle,
        slug: editorSlug,
        excerpt: editorExcerpt,
        status: editorStatus,
        bodyHtml: editorBody,
        dirty: autosaveStatus === 'unsaved',
    }), [contentType, editingPostUuid, editorTitle, editorSlug, editorExcerpt, editorStatus, editorBody, autosaveStatus]);

    useEffect(() => {
        setEditorDocumentContext(getDocumentContext());
        return () => setEditorDocumentContext(null);
    }, [getDocumentContext]);

    const notifySaved = async (contentUuid: string) => {
        const failures = await notifyEditorSaved({
            ...getDocumentContext(),
            contentUuid,
            saveId: crypto.randomUUID(),
        });
        if (failures.length > 0) setEditorError(`Plugin save warnings: ${failures.join('; ')}`);
    };
    const readabilityLabel = wordCount < 300 ? 'Short' : wordCount < 900 ? 'Comfortable' : 'Long form';
    const formatLastSaved = () => {
        if (!lastSavedAt) return 'Not saved yet';
        const seconds = Math.max(1, Math.round((Date.now() - lastSavedAt.getTime()) / 1000));
        if (seconds < 60) return `Last saved ${seconds} sec ago`;
        const minutes = Math.round(seconds / 60);
        return `Last saved ${minutes} min ago`;
    };
    const slashCommandItems = React.useMemo(() => {
        const query = slashCommand.query.toLowerCase();
        const items = [
            { id: 'paragraph', label: 'Paragraph', hint: 'Start with plain text' },
            { id: 'heading-1', label: 'Heading 1', hint: 'Large section title' },
            { id: 'heading-2', label: 'Heading 2', hint: 'Section heading' },
            { id: 'heading-3', label: 'Heading 3', hint: 'Subsection heading' },
            { id: 'quote', label: 'Quote', hint: 'Highlighted citation' },
            { id: 'code', label: 'Code Block', hint: 'Preformatted code' },
            { id: 'divider', label: 'Divider', hint: 'Horizontal separator' },
            { id: 'image', label: 'Media', hint: 'Insert image, video, audio, PDF, or document' },
        ];
        return items.filter((item) => {
            if (!query) return true;
            return item.label.toLowerCase().includes(query) || item.hint.toLowerCase().includes(query);
        });
    }, [slashCommand.query]);

    // Inisialisasi Tiptap Editor
    const editor = useEditor({
        extensions: [
            StarterKit,
            TiptapLink.configure({ openOnClick: false }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            ...runtime.getTiptapExtensions(),
        ],
        editorProps: {
            handleClick: (_view, pos) => {
                editorFocusLeavingRef.current = false;
                if (slashCommandRef.current.open) {
                    closeSlashCommand();
                }
                pendingLinkRangeRef.current = { from: pos, to: pos };
                lastEditorSelectionRangeRef.current = { from: pos, to: pos };
                imageUserRangeRef.current = { from: pos, to: pos };
                return false;
            },
            handleDOMEvents: {
                keydown: (_view, event) => {
                    if (!slashCommandRef.current.open) {
                        return false;
                    }

                    const currentItems = slashCommandItemsRef.current;

                    if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setSlashCommandIndex((current) => {
                            const next = Math.min(current + 1, Math.max(0, currentItems.length - 1));
                            slashCommandIndexRef.current = next;
                            return next;
                        });
                        return true;
                    }

                    if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setSlashCommandIndex((current) => {
                            const next = Math.max(current - 1, 0);
                            slashCommandIndexRef.current = next;
                            return next;
                        });
                        return true;
                    }

                    if (event.key === 'Escape') {
                        event.preventDefault();
                        closeSlashCommand();
                        return true;
                    }

                    if (event.key === 'Enter') {
                        event.preventDefault();
                        const item = currentItems[slashCommandIndexRef.current] || currentItems[0];
                        if (item) {
                            applySlashCommand(item.id);
                        }
                        return true;
                    }

                    return false;
                },
                keyup: (view) => {
                    const domSelection = window.getSelection();

                    if (
                        domSelection &&
                        domSelection.rangeCount > 0 &&
                        domSelection.anchorNode &&
                        domSelection.focusNode
                    ) {
                        const anchorElement =
                            domSelection.anchorNode.nodeType === Node.ELEMENT_NODE
                                ? domSelection.anchorNode
                                : domSelection.anchorNode.parentElement;
                        const focusElement =
                            domSelection.focusNode.nodeType === Node.ELEMENT_NODE
                                ? domSelection.focusNode
                                : domSelection.focusNode.parentElement;

                        if (
                            anchorElement instanceof Node &&
                            focusElement instanceof Node &&
                            view.dom.contains(anchorElement) &&
                            view.dom.contains(focusElement)
                        ) {
                            const anchorPos = view.posAtDOM(domSelection.anchorNode, domSelection.anchorOffset);
                            const focusPos = view.posAtDOM(domSelection.focusNode, domSelection.focusOffset);

                            pendingLinkRangeRef.current = {
                                from: Math.min(anchorPos, focusPos),
                                to: Math.max(anchorPos, focusPos),
                            };
                            lastEditorSelectionRangeRef.current = pendingLinkRangeRef.current;
                            imageModalRangeRef.current = pendingLinkRangeRef.current;
                            imageUserRangeRef.current = pendingLinkRangeRef.current;
                            return false;
                        }
                    }

                    const { selection } = view.state;

                    pendingLinkRangeRef.current = { from: selection.from, to: selection.to };
                    lastEditorSelectionRangeRef.current = pendingLinkRangeRef.current;
                    imageModalRangeRef.current = pendingLinkRangeRef.current;
                    imageUserRangeRef.current = pendingLinkRangeRef.current;
                    return false;
                },
                mouseup: (view) => {
                    editorFocusLeavingRef.current = false;
                    const domSelection = window.getSelection();

                    if (
                        domSelection &&
                        domSelection.rangeCount > 0 &&
                        domSelection.anchorNode &&
                        domSelection.focusNode
                    ) {
                        const anchorElement =
                            domSelection.anchorNode.nodeType === Node.ELEMENT_NODE
                                ? domSelection.anchorNode
                                : domSelection.anchorNode.parentElement;
                        const focusElement =
                            domSelection.focusNode.nodeType === Node.ELEMENT_NODE
                                ? domSelection.focusNode
                                : domSelection.focusNode.parentElement;

                        if (
                            anchorElement instanceof Node &&
                            focusElement instanceof Node &&
                            view.dom.contains(anchorElement) &&
                            view.dom.contains(focusElement)
                        ) {
                            const anchorPos = view.posAtDOM(domSelection.anchorNode, domSelection.anchorOffset);
                            const focusPos = view.posAtDOM(domSelection.focusNode, domSelection.focusOffset);

                            pendingLinkRangeRef.current = {
                                from: Math.min(anchorPos, focusPos),
                                to: Math.max(anchorPos, focusPos),
                            };
                            lastEditorSelectionRangeRef.current = pendingLinkRangeRef.current;
                            imageModalRangeRef.current = pendingLinkRangeRef.current;
                            imageUserRangeRef.current = pendingLinkRangeRef.current;
                            return false;
                        }
                    }

                    const { selection } = view.state;

                    pendingLinkRangeRef.current = { from: selection.from, to: selection.to };
                    lastEditorSelectionRangeRef.current = pendingLinkRangeRef.current;
                    imageModalRangeRef.current = pendingLinkRangeRef.current;
                    imageUserRangeRef.current = pendingLinkRangeRef.current;
                    return false;
                },
            },
        },
        content: editorBody,
        onUpdate: ({ editor }) => {
            setEditorBody(editor.getHTML());
            updateSlashCommandFromEditor(editor);
        },
        onSelectionUpdate: ({ editor }) => {
            if (editorFocusLeavingRef.current) return;
            if (!editor.view.hasFocus()) return;

            const domRange = getEditorDomSelectionRange();
            const { selection } = editor.state;
            const range = domRange || { from: selection.from, to: selection.to };

            if (range) {
                pendingLinkRangeRef.current = range;
                lastEditorSelectionRangeRef.current = range;
                imageModalRangeRef.current = range;
            }
        },
    });

    useEffect(() => {
        slashCommandRef.current = slashCommand;
    }, [slashCommand]);

    useEffect(() => {
        slashCommandIndexRef.current = slashCommandIndex;
    }, [slashCommandIndex]);

    useEffect(() => {
        slashCommandItemsRef.current = slashCommandItems;
        if (slashCommandIndex >= slashCommandItems.length) {
            setSlashCommandIndex(Math.max(0, slashCommandItems.length - 1));
        }
    }, [slashCommandItems, slashCommandIndex]);

    useEffect(() => {
        if (!slashCommand.open) return undefined;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            if (target.closest('.slash-command-menu')) return;
            if (editor?.view.dom.contains(target)) return;

            closeSlashCommand();
        };

        document.addEventListener('pointerdown', handlePointerDown, true);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true);
        };
    }, [slashCommand.open, editor]);

    function closeSlashCommand() {
        setSlashCommand({ open: false, query: '', range: null, anchor: null, source: 'typed' });
        setSlashCommandIndex(0);
        slashCommandRef.current = { open: false, query: '', range: null, anchor: null, source: 'typed' };
        slashCommandIndexRef.current = 0;
    }

    function updateSlashCommandFromEditor(activeEditor: NonNullable<typeof editor>) {
        const { selection } = activeEditor.state;

        if (!selection.empty) {
            closeSlashCommand();
            return;
        }

        const { $from } = selection;
        const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
        const match = /\/([a-zA-Z0-9 -]*)$/.exec(textBefore);

        if (!match) {
            if (slashCommandRef.current.open) {
                closeSlashCommand();
            }
            return;
        }

        const query = match[1] || '';
        const from = $from.pos - query.length - 1;
        const anchor = getEditorMenuAnchor(activeEditor, $from.pos);
        const nextState = {
            open: true,
            query,
            range: { from, to: $from.pos },
            anchor,
            source: 'typed' as const,
        };

        slashCommandRef.current = nextState;
        setSlashCommand(nextState);
        setSlashCommandIndex(0);
    }

    function getEditorMenuAnchor(activeEditor: NonNullable<typeof editor>, pos: number) {
        try {
            const coords = activeEditor.view.coordsAtPos(pos);
            return createSlashMenuAnchor({
                left: coords.left,
                top: coords.top,
                bottom: coords.bottom,
            });
        } catch {
            return null;
        }
    }

    function createSlashMenuAnchor(rect: { left: number; top: number; bottom: number }): SlashMenuAnchor {
        const margin = 12;
        const gap = 8;
        const menuWidth = 340;
        const preferredHeight = 360;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom - margin - gap;
        const spaceAbove = rect.top - margin - gap;
        const placement: SlashMenuAnchor['placement'] =
            spaceBelow >= Math.min(preferredHeight, 220) || spaceBelow >= spaceAbove ? 'down' : 'up';
        const maxHeight = Math.max(
            160,
            Math.min(preferredHeight, placement === 'down' ? spaceBelow : spaceAbove)
        );
        const left = Math.min(
            Math.max(margin, rect.left),
            Math.max(margin, viewportWidth - menuWidth - margin)
        );
        const top = placement === 'down'
            ? Math.min(rect.bottom + gap, viewportHeight - maxHeight - margin)
            : Math.max(margin, rect.top - gap - maxHeight);

        return {
            left,
            top,
            placement,
            maxHeight,
        };
    }

    function getTopLevelEditorBlock(target: EventTarget | null) {
        if (!(target instanceof HTMLElement) || !editor?.view.dom.contains(target)) {
            return null;
        }

        let block: HTMLElement | null = target;
        while (block && block.parentElement !== editor.view.dom) {
            block = block.parentElement;
        }

        if (!block || block === editor.view.dom || block.classList.contains('ProseMirror')) {
            return null;
        }

        return block;
    }

    function updateHoveredBlockFromEvent(event: React.MouseEvent<HTMLDivElement>) {
        if (!editor) return;
        const target = event.target;
        if (target instanceof HTMLElement && target.closest('.editor-block-handle')) {
            return;
        }
        const blockState = getBlockStateFromTarget(target, event.currentTarget);

        if (!blockState) {
            setHoveredBlock(null);
            return;
        }

        setHoveredBlock(blockState);
    }

    function selectBlockFromEvent(event: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest('.editor-block-handle')) {
            return;
        }

        const blockState = getBlockStateFromTarget(target, event.currentTarget);
        if (blockState) {
            setSelectedBlock(blockState);
        }
    }

    function getBlockStateFromTarget(target: EventTarget | null, wrapper: HTMLElement): HoveredBlockState | null {
        if (!editor) return null;
        const block = getTopLevelEditorBlock(target);

        if (!block) {
            return null;
        }

        const wrapperRect = wrapper.getBoundingClientRect();
        const blockRect = block.getBoundingClientRect();

        try {
            const domPos = editor.view.posAtDOM(block, 0);
            const $domPos = editor.state.doc.resolve(domPos);
            const pos = $domPos.depth > 0 ? $domPos.before(1) : domPos;
            const node = editor.state.doc.nodeAt(pos);
            const insertPos = node ? pos + node.nodeSize : editor.state.doc.content.size;

            return {
                top: blockRect.top - wrapperRect.top,
                left: blockRect.left - wrapperRect.left - 64,
                height: blockRect.height,
                blockPos: pos,
                blockEndPos: insertPos,
                insertPos,
                label: getEditorBlockLabel(node?.type?.name, node?.attrs),
                canMoveUp: pos > 0,
                canMoveDown: insertPos < editor.state.doc.content.size,
            };
        } catch {
            return null;
        }
    }

    function openInsertMenuFromBlock(block: HoveredBlockState) {
        if (!editor) return;

        const docSize = editor.state.doc.content.size;
        const insertPos = Math.max(0, Math.min(block.insertPos, docSize));
        editor.commands.setTextSelection(insertPos);

        const nextState = {
            open: true,
            query: '',
            range: { from: insertPos, to: insertPos },
            anchor: getEditorMenuAnchor(editor, insertPos),
            source: 'insert' as const,
        };

        slashCommandRef.current = nextState;
        setSlashCommand(nextState);
        setSlashCommandIndex(0);
    }

    function moveBlockByDirection(block: HoveredBlockState, direction: 'up' | 'down') {
        if (!editor) return;

        const blocks: Array<{ pos: number; node: any }> = [];
        editor.state.doc.forEach((node, offset) => blocks.push({ pos: offset, node }));
        const currentIndex = blocks.findIndex(({ pos }) => pos === block.blockPos);
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (currentIndex < 0 || targetIndex < 0 || targetIndex >= blocks.length) return;

        const current = blocks[currentIndex];
        const target = blocks[targetIndex];
        const insertPos = direction === 'up' ? target.pos : target.pos + target.node.nodeSize;
        const tr = editor.state.tr.delete(current.pos, current.pos + current.node.nodeSize);
        const mappedInsertPos = tr.mapping.map(insertPos);
        tr.insert(mappedInsertPos, current.node);
        tr.setSelection(Selection.near(tr.doc.resolve(mappedInsertPos)));
        editor.view.dispatch(tr.scrollIntoView());
        editor.view.focus();
        setHoveredBlock(null);
        setSelectedBlock(null);
    }

    function getEditorBlockLabel(nodeType?: string, attrs?: Record<string, any>) {
        if (nodeType === 'heading') return `Heading ${attrs?.level || 1}`;
        if (nodeType === 'paragraph') return 'Paragraph';
        if (nodeType === 'blockquote') return 'Quote';
        if (nodeType === 'codeBlock') return 'Code';
        if (nodeType === 'mediaNode' || nodeType === 'externalImageNode') return 'Image';
        if (nodeType === 'horizontalRule') return 'Divider';
        return 'Block';
    }

    function applySlashCommand(commandId: string) {
        if (!editor) {
            return;
        }

        const slashState = slashCommandRef.current;
        const range = slashState.range;
        if (!range) {
            return;
        }

        const docSize = editor.state.doc.content.size;
        const safeFrom = Math.max(0, Math.min(range.from, docSize));
        const safeTo = Math.max(safeFrom, Math.min(range.to, docSize));
        const insertMode = slashState.source === 'insert';

        if (safeTo > safeFrom) {
            const transaction = editor.state.tr.delete(safeFrom, safeTo);
            transaction.setSelection(TextSelection.create(transaction.doc, safeFrom));
            editor.view.dispatch(transaction.scrollIntoView());
        } else {
            editor.commands.setTextSelection(safeFrom);
        }

        closeSlashCommand();

        if (insertMode) {
            insertSlashCommandBlockAtSelection(commandId);
            return;
        }

        if (commandId === 'paragraph') {
            editor.chain().focus().setParagraph().run();
            return;
        }

        if (commandId.startsWith('heading-')) {
            const level = Number(commandId.replace('heading-', '')) as 1 | 2 | 3;
            editor.chain().focus().toggleHeading({ level }).run();
            return;
        }

        if (commandId === 'quote') {
            runtime.executeCommand(editor, 'toggleBlockquote');
            return;
        }

        if (commandId === 'code') {
            runtime.executeCommand(editor, 'toggleCodeBlock');
            return;
        }

        if (commandId === 'divider') {
            runtime.executeCommand(editor, 'setHorizontalRule');
            return;
        }

        if (commandId === 'image') {
            imageModalRangeRef.current = { from: safeFrom, to: safeFrom };
            imageUserRangeRef.current = { from: safeFrom, to: safeFrom };
            frozenImageInsertRangeRef.current = { from: safeFrom, to: safeFrom };
            const sources = availableInsertSources;
            setSelectedInsertSourceId(sources.length === 1 ? sources[0].id : '');
            setInsertModalValue('');
            setInsertModalConfig({ type: 'image', title: 'Insert Media' });
        }
    }

    function insertSlashCommandBlockAtSelection(commandId: string) {
        if (!editor) return;

        const insertPos = editor.state.selection.from;

        if (commandId === 'image') {
            imageModalRangeRef.current = { from: insertPos, to: insertPos };
            imageUserRangeRef.current = { from: insertPos, to: insertPos };
            frozenImageInsertRangeRef.current = { from: insertPos, to: insertPos };
            const sources = availableInsertSources;
            setSelectedInsertSourceId(sources.length === 1 ? sources[0].id : '');
            setInsertModalValue('');
            setInsertModalConfig({ type: 'image', title: 'Insert Media' });
            return;
        }

        const blockContent =
            commandId === 'heading-1'
                ? { type: 'heading', attrs: { level: 1 } }
                : commandId === 'heading-2'
                    ? { type: 'heading', attrs: { level: 2 } }
                    : commandId === 'heading-3'
                        ? { type: 'heading', attrs: { level: 3 } }
                        : commandId === 'quote'
                            ? { type: 'blockquote', content: [{ type: 'paragraph' }] }
                            : commandId === 'code'
                                ? { type: 'codeBlock' }
                                : commandId === 'divider'
                                    ? { type: 'horizontalRule' }
                                    : { type: 'paragraph' };

        editor.chain().focus().insertContentAt(insertPos, blockContent).run();
    }

    const slugify = (text: string): string => {
        return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
    };

    useEffect(() => {
        if (postsSubView === 'create') {
            initNewPost();
        }
    }, [postsSubView]);

    useEffect(() => {
        loadPosts();
        loadTaxonomy();
    }, []);

    const loadTaxonomy = async () => {
        setLoadingTaxonomy(true);
        try {
            const catRes = await apiFetch('/api/categories');
            const tagRes = await apiFetch('/api/tags');
            if (catRes.ok && tagRes.ok) {
                setAllCategories(await catRes.json());
                setAllTags(await tagRes.json());
            }
        } catch (err) {
            console.error('Failed to load taxonomy:', err);
        } finally {
            setLoadingTaxonomy(false);
        }
    };

    const loadPosts = async () => {
        setLoadingPosts(true);
        try {
            const res = await apiFetch(definition.apiBasePath);
            if (res.ok) {
                const data = await res.json();
                setPosts(data);
            }
        } catch (err) {
            console.error(`Failed to load ${definition.plural.toLowerCase()}:`, err);
        } finally {
            setLoadingPosts(false);
        }
    };

    const buildArticlePayload = (status: 'published' | 'draft' | 'archived') => {
        return {
                title: editorTitle || 'Untitled ' + definition.singular,
                slug: editorSlug,
                excerpt: editorExcerpt,
                body: editorBody,
                status,
                type: contentType,
                categoryIds: editorCategoryIds,
                tagIds: editorTagIds,
                featuredImage,
            };
    };

    const createPayloadSnapshot = (payload: ReturnType<typeof buildArticlePayload>) => {
        return JSON.stringify(payload);
    };

    const saveDraft = async ({ silent = false }: { silent?: boolean } = {}): Promise<number | null> => {
        if (autosavePromiseRef.current) return autosavePromiseRef.current;

        if (postsSubView === 'create' && !editorTitle.trim()) {
            return editingPostIdRef.current;
        }

        const postStatus = postsSubView === 'create' ? 'draft' : editorStatus;
        const payload = buildArticlePayload(postStatus);
        const snapshot = createPayloadSnapshot(payload);

        if (snapshot === lastSavedSnapshotRef.current) {
            return editingPostIdRef.current;
        }

        if (postsSubView === 'create' && autoDraftCreatedRef.current) {
            return editingPostIdRef.current;
        }

        const operation = (async (): Promise<number | null> => {
            autosaveInFlightRef.current = true;
            setAutosaveStatus('saving');

            if (!silent) {
                setIsEditorSaving(true);
                setEditorError(null);
                setEditorSuccess(null);
            }

            try {
                const currentPostId = editingPostIdRef.current;
                const path = currentPostId ? `${definition.apiBasePath}/${currentPostId}` : definition.apiBasePath;
                const method = currentPostId ? 'PUT' : 'POST';

                const res = await apiFetch(path, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    setAutosaveStatus('error');
                    if (!silent) {
                        const errData = await res.json();
                        setEditorError(errData.error || `Failed to save ${definition.singular.toLowerCase()}.`);
                    }
                    return currentPostId;
                }

                lastSavedSnapshotRef.current = snapshot;
                setLastSavedAt(new Date());
                setAutosaveStatus('saved');
                let savedPostId = currentPostId;
                let savedUuid = editingPostUuid;

                if (!currentPostId) {
                    const data = await res.json();
                    savedPostId = data.article?.id || data.page?.id || data.id || data.content?.id;
                    savedUuid = data.article?.uuid || data.page?.uuid || data.uuid || data.content?.uuid;
                    setEditingPostUuid(savedUuid);
                    editingPostIdRef.current = savedPostId;
                    autoDraftCreatedRef.current = true;
                    setEditingPostId(savedPostId);
                    setEditingPostRouteId(savedPostId);
                    setPostsSubView('edit');
                }
                if (savedUuid) await notifySaved(savedUuid);

                if (!silent) {
                    setEditorSuccess(currentPostId ? `${definition.singular} updated successfully!` : `${definition.singular} draft created successfully!`);
                    loadPosts();
                }
                return savedPostId;
            } catch (err) {
                console.error('Save error:', err);
                setAutosaveStatus('error');
                if (!silent) {
                    setEditorError(`Network error: Failed to save ${definition.singular.toLowerCase()}.`);
                }
                return editingPostIdRef.current;
            } finally {
                autosaveInFlightRef.current = false;
                if (!silent) setIsEditorSaving(false);
            }
        })();

        autosavePromiseRef.current = operation;
        try {
            return await operation;
        } finally {
            if (autosavePromiseRef.current === operation) autosavePromiseRef.current = null;
        }
    };

    const handleSavePost = async (statusOverride?: 'published' | 'draft') => {
        if (statusOverride === 'draft') {
            await saveDraft();
            return;
        }

        if (publishInFlightRef.current) return;
        setEditorError(null);
        setEditorSuccess(null);

        const postStatus = statusOverride || editorStatus;

        if (postStatus === 'published' && (!editorTitle.trim() || !editorSlug.trim() || !editorBody.trim())) {
            setEditorError(`Title, Slug, and Body are required to publish this ${definition.singular.toLowerCase()}.`);
            setIsEditorSaving(false);
            return;
        }

        if (postStatus === 'published') {
            const checks = await runEditorPublishChecks(getDocumentContext());
            const blocked = checks.find((check) => check.status === 'block');
            if (blocked) {
                setEditorError(blocked.message || `Publishing blocked by ${blocked.owner}`);
                return;
            }
            const warnings = checks.filter((check) => check.status === 'warning');
            if (warnings.length > 0) setEditorError(warnings.map((warning) => warning.message || `${warning.owner} warning`).join('; '));
        }

        publishInFlightRef.current = true;
        setIsEditorSaving(true);

        try {
            if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
            if (autosavePromiseRef.current) await autosavePromiseRef.current;

            const payload = buildArticlePayload(postStatus);
            const currentPostId = editingPostIdRef.current;
            const path = currentPostId ? `${definition.apiBasePath}/${currentPostId}` : definition.apiBasePath;
            const method = currentPostId ? 'PUT' : 'POST';

            const res = await apiFetch(path, {
                method,
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                lastSavedSnapshotRef.current = createPayloadSnapshot(payload);
                setLastSavedAt(new Date());
                setAutosaveStatus('saved');
                setEditorStatus(postStatus);
                setEditorSuccess(postStatus === 'published' ? `${definition.singular} published successfully!` : `${definition.singular} saved successfully!`);
                if (!currentPostId) {
                    const data = await res.json();
                    const createdPostId = data.article?.id || data.page?.id || data.id || data.content?.id;
                    const createdUuid = data.article?.uuid || data.page?.uuid || data.uuid || data.content?.uuid;
                    setEditingPostUuid(createdUuid);
                    editingPostIdRef.current = createdPostId;
                    autoDraftCreatedRef.current = true;
                    setEditingPostId(createdPostId);
                    setEditingPostRouteId(createdPostId);
                    setPostsSubView('edit');
                    if (createdUuid) await notifySaved(createdUuid);
                } else if (editingPostUuid) {
                    await notifySaved(editingPostUuid);
                }
                loadPosts();
            } else {
                const errData = await res.json();
                setEditorError(errData.error || `Failed to save ${definition.singular.toLowerCase()}.`);
            }
        } catch (err) {
            console.error('Save error:', err);
            setEditorError(`Network error: Failed to save ${definition.singular.toLowerCase()}.`);
        } finally {
            publishInFlightRef.current = false;
            setIsEditorSaving(false);
        }
    };

    const handleCreateCategoryInline = async () => {
        if (!newCatName.trim()) return;
        const catSlug = slugify(newCatName);

        try {
            const res = await apiFetch('/api/categories', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newCatName, slug: catSlug }),
            });

            if (res.ok) {
                const data = await res.json();
                setEditorCategoryIds([...editorCategoryIds, data.id]);
                setNewCatName('');
                setShowAddCatForm(false);
                loadTaxonomy();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create category');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleTagInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tagName = tagInputText.trim();
            if (!tagName) return;

            const tagSlug = slugify(tagName);
            const match = allTags.find(t => t.slug === tagSlug);

            if (match) {
                if (!editorTagIds.includes(match.id)) {
                setEditorTagIds([...editorTagIds, match.id]);
                }
                setTagInputText('');
            } else {
                try {
                const res = await apiFetch('/api/tags', {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: tagName, slug: tagSlug }),
                });

                if (res.ok) {
                    const data = await res.json();
                    setEditorTagIds([...editorTagIds, data.id]);
                    setTagInputText('');
                    loadTaxonomy();
                }
                } catch (error) {
                console.error(error);
                }
            }
        }
    };

    const startEditPost = async (postId: number) => {
        try {
            const res = await apiFetch(`${definition.apiBasePath}/${postId}`);
            if (res.ok) {
                const data = await res.json();
                setEditingPostId(postId);
                setEditingPostUuid(data.uuid || null);
                setEditingPostRouteId(postId);
                setEditorTitle(data.title);
                setEditorSlug(data.slug);
                setEditorSlugManuallyEdited(true);
                setEditorExcerpt(data.excerpt || '');
                
                // Set konten ke State dan ke Tiptap Editor
                setEditorBody(data.body || '');
                editor?.commands.setContent(data.body || '');

                 setEditorStatus(data.status);
                setEditorCategoryIds(data.categoryIds || []);
                setEditorTagIds(data.tagIds || []);
                const loadedFeaturedImage = data.featuredImageUrl ? {
                    url: data.featuredImageUrl,
                    assetUuid: data.featuredImageAssetUuid || null,
                    alt: data.featuredImageAlt || '',
                    source: data.featuredImageSource === 'media-library' ? 'media-library' as const : 'external' as const,
                } : null;
                setFeaturedImage(loadedFeaturedImage);
                lastSavedSnapshotRef.current = createPayloadSnapshot({
                    title: data.title || 'Untitled ' + definition.singular,
                    slug: data.slug,
                    excerpt: data.excerpt || '',
                    body: data.body || '',
                    status: data.status,
                    type: contentType,
                    categoryIds: data.categoryIds || [],
                    tagIds: data.tagIds || [],
                    featuredImage: loadedFeaturedImage,
                });
                setLastSavedAt(new Date());
                autoDraftCreatedRef.current = true;
                setPostsSubView('edit');
                setEditorError(null);
                setEditorSuccess(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (postsSubView === 'edit' && editingPostRouteId && editingPostRouteId !== editingPostId) {
            startEditPost(editingPostRouteId);
        }
    }, [postsSubView, editingPostRouteId, editingPostId]);

    const getPublicUrl = (s: string) => {
        const hostname = 'http://localhost:5173';
        if (contentType === 'page') {
            return s === 'home' ? hostname : `${hostname}/${s}`;
        }
        return `${hostname}/articles/${s}`;
    };

    const deletePost = async (postId: number) => {
        if (!confirm(`Are you sure you want to delete this ${definition.singular.toLowerCase()}?`)) return;
        try {
            const res = await apiFetch(`${definition.apiBasePath}/${postId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                loadPosts();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const initNewPost = () => {
        setEditingPostId(null);
        setEditingPostUuid(null);
        setEditingPostRouteId(null);
        lastSavedSnapshotRef.current = '';
        autoDraftCreatedRef.current = false;
        setEditorTitle('');
        setEditorSlug('');
        setEditorSlugManuallyEdited(false);
        setEditorExcerpt('');
        
        // Reset konten
        setEditorBody('');
        editor?.commands.setContent('');

        setEditorStatus('draft');
        setEditorCategoryIds([]);
        setEditorTagIds([]);
        setFeaturedImage(null);
        setPostsSubView('create');
        setEditorError(null);
        setEditorSuccess(null);
        setAutosaveStatus('idle');
        setLastSavedAt(null);
        setWorkspaceTab('write');
        setCanvasWidth('default');
        setFocusMode(false);
        setZenMode(false);
        setCurrentRoute(contentType === 'article' ? 'posts' : 'pages');
    };

    useEffect(() => {
        if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }

        if (postsSubView === 'create') {
            if (!editorTitle.trim() || autoDraftCreatedRef.current || autosaveInFlightRef.current) {
                return undefined;
            }

            setAutosaveStatus('unsaved');

            autosaveTimerRef.current = window.setTimeout(() => {
                saveDraft({ silent: true });
            }, 2000);

            return () => {
                if (autosaveTimerRef.current) {
                    window.clearTimeout(autosaveTimerRef.current);
                    autosaveTimerRef.current = null;
                }
            };
        }

        if (postsSubView === 'edit' && editingPostId) {
            const snapshot = createPayloadSnapshot(buildArticlePayload(editorStatus));

            if (snapshot === lastSavedSnapshotRef.current || autosaveInFlightRef.current) {
                return undefined;
            }

            setAutosaveStatus('unsaved');

            autosaveTimerRef.current = window.setTimeout(() => {
                saveDraft({ silent: true });
            }, 4000);

            return () => {
                if (autosaveTimerRef.current) {
                    window.clearTimeout(autosaveTimerRef.current);
                    autosaveTimerRef.current = null;
                }
            };
        }

        return undefined;
    }, [
        postsSubView,
        editingPostId,
        editorTitle,
        editorSlug,
        editorExcerpt,
        editorBody,
        editorStatus,
        editorCategoryIds,
        editorTagIds,
    ]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (postsSubView !== 'create' && postsSubView !== 'edit') {
                return;
            }

            if (postsSubView === 'create' && !editorTitle.trim()) {
                return;
            }

            if (postsSubView === 'edit' && !editingPostId) {
                return;
            }

            const snapshot = createPayloadSnapshot(buildArticlePayload(editorStatus));

            if (snapshot === lastSavedSnapshotRef.current) {
                return;
            }

            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [
        postsSubView,
        editingPostId,
        editorTitle,
        editorSlug,
        editorExcerpt,
        editorBody,
        editorStatus,
        editorCategoryIds,
        editorTagIds,
    ]);

    const closeInsertModal = useCallback(() => {
        pendingLinkRangeRef.current = null;
        linkModalRangeRef.current = null;
        imageModalRangeRef.current = null;
        imageUserRangeRef.current = null;
        frozenImageInsertRangeRef.current = null;
        lastEditorSelectedTextRef.current = '';
        setInsertModalConfig(null);
        setInsertModalText('');
        setInsertModalValue('');
    }, []);

    // Fungsi Submit Modal Custom
    const handleInsertModalSubmit = () => {
        if (!insertModalConfig || !editor) return;

        if (insertModalConfig.type === 'link') {
            const linkRange = linkModalRangeRef.current;
            const linkUrl = insertModalValue.trim();

            if (!linkRange || !linkUrl) {
                closeInsertModal();
                return;
            }

            const { state, view } = editor;
            const from = Math.max(0, Math.min(linkRange.from, state.doc.content.size));
            const to = Math.max(from, Math.min(linkRange.to, state.doc.content.size));
            const selectedText = !linkRange.empty ? state.doc.textBetween(from, to, ' ').trim() : '';
            const linkText = insertModalText.trim() || selectedText;

            if (!linkText) {
                closeInsertModal();
                return;
            }

            const linkMarkType = state.schema.marks.link;
            const linkMark = linkMarkType.create({ href: linkUrl });
            const linkNode = state.schema.text(linkText, [linkMark]);
            const transaction = state.tr
                .setSelection(TextSelection.create(state.doc, from, to))
                .replaceRangeWith(from, to, linkNode);
            const nextCursorPosition = from + linkText.length;

            transaction.setSelection(TextSelection.create(transaction.doc, nextCursorPosition));
            transaction.removeStoredMark(linkMarkType);

            view.dispatch(transaction.scrollIntoView());
            view.focus();
            editorFocusLeavingRef.current = false;
        } else if (insertModalConfig.type === 'image') {
            return;
        }

        closeInsertModal();
    };

    const getEditorDomSelectionRange = () => {
        if (!editor?.view) return null;

        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0 || !selection.anchorNode || !selection.focusNode) {
            return null;
        }

        const anchorElement =
            selection.anchorNode.nodeType === Node.ELEMENT_NODE
                ? selection.anchorNode
                : selection.anchorNode.parentElement;
        const focusElement =
            selection.focusNode.nodeType === Node.ELEMENT_NODE
                ? selection.focusNode
                : selection.focusNode.parentElement;

        if (
            !(anchorElement instanceof Node) ||
            !(focusElement instanceof Node) ||
            !editor.view.dom.contains(anchorElement) ||
            !editor.view.dom.contains(focusElement)
        ) {
            return null;
        }

        try {
            const anchorPos = editor.view.posAtDOM(selection.anchorNode, selection.anchorOffset);
            const focusPos = editor.view.posAtDOM(selection.focusNode, selection.focusOffset);
            lastEditorSelectedTextRef.current = selection.toString();

            return {
                from: Math.min(anchorPos, focusPos),
                to: Math.max(anchorPos, focusPos),
            };
        } catch {
            return null;
        }
    };

    const captureLinkModalRange = (): LinkModalRange | null => {
        if (!editor) {
            linkModalRangeRef.current = null;
            return null;
        }

        const domSelectionRange = getEditorDomSelectionRange();
        const editorSelection = editor.state.selection;
        const fallbackRange = lastEditorSelectionRangeRef.current || pendingLinkRangeRef.current;
        const nonEmptyDomRange = domSelectionRange && domSelectionRange.from !== domSelectionRange.to
            ? domSelectionRange
            : null;
        const nonEmptyEditorRange = editorSelection && !editorSelection.empty
            ? { from: editorSelection.from, to: editorSelection.to }
            : null;
        const nonEmptyFallbackRange = fallbackRange && fallbackRange.from !== fallbackRange.to
            ? fallbackRange
            : null;
        const range =
            nonEmptyDomRange ||
            nonEmptyEditorRange ||
            nonEmptyFallbackRange ||
            findTextRangeInEditor(lastEditorSelectedTextRef.current) ||
            domSelectionRange ||
            (editorSelection ? { from: editorSelection.from, to: editorSelection.to } : null) ||
            fallbackRange;

        if (!range) {
            linkModalRangeRef.current = null;
            return null;
        }

        const nextRange = {
            from: Math.min(range.from, range.to),
            to: Math.max(range.from, range.to),
            empty: range.from === range.to,
        };

        linkModalRangeRef.current = nextRange;
        pendingLinkRangeRef.current = { from: nextRange.from, to: nextRange.to };
        lastEditorSelectionRangeRef.current = pendingLinkRangeRef.current;

        return nextRange;
    };

    const findTextRangeInEditor = (text: string): { from: number; to: number } | null => {
        if (!editor || !text.trim()) {
            return null;
        }

        let foundRange: { from: number; to: number } | null = null;

        editor.state.doc.descendants((node, pos) => {
            if (foundRange || !node.isText || !node.text) {
                return !foundRange;
            }

            const index = node.text.indexOf(text);

            if (index >= 0) {
                foundRange = {
                    from: pos + index,
                    to: pos + index + text.length,
                };
                return false;
            }

            return true;
        });

        return foundRange;
    };

    const captureToolbarEditorRange = () => {
        if (!editor) {
            return;
        }

        const domRange = getEditorDomSelectionRange();
        const { selection } = editor.state;
        const range = domRange || { from: selection.from, to: selection.to };

        if (!range) {
            return;
        }

        const hasSavedTextRange =
            lastEditorSelectionRangeRef.current &&
            lastEditorSelectionRangeRef.current.from !== lastEditorSelectionRangeRef.current.to;

        if (range.from === range.to && hasSavedTextRange) {
            return;
        }

        pendingLinkRangeRef.current = range;
        lastEditorSelectionRangeRef.current = range;
    };

    const captureImageModalRange = () => {
        if (!editor) {
            imageModalRangeRef.current = null;
            return null;
        }

        const domRange = getEditorDomSelectionRange();
        const { selection } = editor.state;
        const editorRange = { from: selection.from, to: selection.to };
        const savedRange =
            imageUserRangeRef.current ||
            pendingLinkRangeRef.current ||
            lastEditorSelectionRangeRef.current ||
            imageModalRangeRef.current;
        const isEditorFocused = editor.view.hasFocus();
        const range = isEditorFocused
            ? (domRange || editorRange || savedRange)
            : (savedRange || domRange || editorRange);

        imageModalRangeRef.current = {
            from: Math.min(range.from, range.to),
            to: Math.max(range.from, range.to),
        };
        frozenImageInsertRangeRef.current = imageModalRangeRef.current;

        return imageModalRangeRef.current;
    };

    const restoreImageModalRange = () => {
        const savedRange = frozenImageInsertRangeRef.current || imageModalRangeRef.current;

        if (!editor || !savedRange) {
            return null;
        }

        const { from, to } = savedRange;
        const docSize = editor.state.doc.content.size;
        const safeFrom = Math.max(0, Math.min(from, docSize));
        const safeTo = Math.max(safeFrom, Math.min(to, docSize));

        editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
        return { from: safeFrom, to: safeTo };
    };

    const normalizeBlockInsertRange = (range: { from: number; to: number }) => {
        if (!editor || range.from !== range.to) {
            return range;
        }

        const resolved = editor.state.doc.resolve(range.from);
        if (!resolved.parent.isTextblock || resolved.depth === 0) {
            return range;
        }

        if (resolved.parentOffset === 0) {
            const insertAt = resolved.before(resolved.depth);
            return { from: insertAt, to: insertAt };
        }

        if (resolved.parentOffset >= resolved.parent.content.size) {
            const insertAt = resolved.after(resolved.depth);
            return { from: insertAt, to: insertAt };
        }

        return range;
    };

    const insertMediaAtSavedRange = (result: {
        uuid: string;
        alt?: string;
        caption?: string;
        mimeType?: string;
    }) => {
        if (!editor || !result.uuid) {
            return false;
        }

        const range = restoreImageModalRange();

        if (!range) {
            return runtime.executeCommand(editor, 'insertMediaNode', {
                uuid: result.uuid,
                alt: result.alt || '',
                caption: result.caption || '',
                mimeType: result.mimeType || ''
            });
        }

        const insertRange = normalizeBlockInsertRange(range);

        return editor
            .chain()
            .focus()
            .insertContentAt(insertRange, [
                {
                    type: 'mediaNode',
                    attrs: {
                        uuid: result.uuid,
                        alt: result.alt || '',
                        caption: result.caption || '',
                        mimeType: result.mimeType || '',
                        width: null
                    }
                },
                {
                    type: 'paragraph'
                }
            ])
            .run();
    };

    const insertPluginNodeAtSavedRange = (editorNode: { type: string; attrs?: Record<string, any> }) => {
        if (!editor || !editorNode.type || !editor.schema.nodes[editorNode.type]) return false;
        const range = restoreImageModalRange();
        const content = [{ type: editorNode.type, attrs: editorNode.attrs || {} }, { type: 'paragraph' }];
        if (!range) return editor.chain().focus().insertContent(content).run();
        return editor.chain().focus().insertContentAt(normalizeBlockInsertRange(range), content).run();
    };

    const insertExternalImageAtSavedRange = (result: {
        url: string;
        alt?: string;
    }) => {
        if (!editor || !result.url) {
            return false;
        }

        const range = restoreImageModalRange();

        if (!range) {
            return runtime.executeCommand(editor, 'insertExternalImageNode', {
                src: result.url,
                alt: result.alt || ''
            });
        }

        const insertRange = normalizeBlockInsertRange(range);

        return editor
            .chain()
            .focus()
            .insertContentAt(insertRange, [
                {
                    type: 'externalImageNode',
                    attrs: {
                        src: result.url,
                        alt: result.alt || '',
                        width: null
                    }
                },
                {
                    type: 'paragraph'
                }
            ])
            .run();
    };

    const getLinkHrefFromRange = (range: LinkModalRange | null): string => {
        if (!editor || !range) {
            return '';
        }

        const { doc, schema } = editor.state;
        const linkMarkType = schema.marks.link;

        if (!linkMarkType) {
            return '';
        }

        if (range.empty) {
            const marks = doc.resolve(range.from).marks();
            return marks.find((mark) => mark.type === linkMarkType)?.attrs.href || '';
        }

        let href = '';

        doc.nodesBetween(range.from, range.to, (node) => {
            const linkMark = node.marks.find((mark) => mark.type === linkMarkType);

            if (linkMark?.attrs.href) {
                href = linkMark.attrs.href;
                return false;
            }

            return true;
        });

        return href;
    };

    useEffect(() => {
        if (!editor) return undefined;

        const captureRangeBeforeFocusLeavesEditor = (event: MouseEvent) => {
            if (!(event.target instanceof Node)) {
                return;
            }

            if (editor.view.dom.contains(event.target)) {
                editorFocusLeavingRef.current = false;
                return;
            }

            if (
                event.target instanceof Element &&
                (event.target.closest('.editor-tabs-header') || event.target.closest('button[title="Insert Media"]'))
            ) {
                editorFocusLeavingRef.current = true;
                return;
            }

            if (insertModalConfig?.type === 'image') {
                return;
            }

            const domRange = getEditorDomSelectionRange();
            const { selection } = editor.state;
            const range = domRange || { from: selection.from, to: selection.to };

            if (range) {
                pendingLinkRangeRef.current = range;
                lastEditorSelectionRangeRef.current = range;
                imageModalRangeRef.current = range;
            }

            if (insertModalConfig) {
                return;
            }

            editorFocusLeavingRef.current = true;
        };

        const updatePendingLinkRange = () => {
            if (editorFocusLeavingRef.current) {
                return;
            }

            const range = getEditorDomSelectionRange();

            if (range) {
                pendingLinkRangeRef.current = range;
            }
        };

        document.addEventListener('mousedown', captureRangeBeforeFocusLeavesEditor, true);
        document.addEventListener('selectionchange', updatePendingLinkRange);

        return () => {
            document.removeEventListener('mousedown', captureRangeBeforeFocusLeavesEditor, true);
            document.removeEventListener('selectionchange', updatePendingLinkRange);
        };
    }, [editor, insertModalConfig]);

    const handleToolbarDialogRequest = (dialog: 'link' | 'image') => {
        if (dialog === 'link') {
            const linkRange = linkModalRangeRef.current || captureLinkModalRange();
            setInsertModalText(
                editor && linkRange && !linkRange.empty
                    ? editor.state.doc.textBetween(linkRange.from, linkRange.to, ' ')
                    : ''
            );
            setInsertModalValue(getLinkHrefFromRange(linkRange));
            setInsertModalConfig({ type: 'link', title: 'Insert Hyperlink' });
            return;
        }

        const sources = availableInsertSources;
        captureImageModalRange();
        setSelectedInsertSourceId(sources.length === 1 ? sources[0].id : '');
        setInsertModalValue('');
        setInsertModalConfig({ type: 'image', title: 'Insert Media' });
    };

    const openFeaturedImagePicker = () => {
        const sources = availableInsertSources;
        setSelectedInsertSourceId(sources.length === 1 ? sources[0].id : '');
        setInsertModalConfig({ type: 'featured-image', title: featuredImage ? 'Replace Featured Image' : 'Set Featured Image' });
    };

    const setFeaturedImageFromResult = (result: { uuid?: string; url?: string; alt?: string; caption?: string } | null) => {
        if (!result) {
            closeInsertModal();
            return;
        }
        if (result.uuid) {
            setFeaturedImage({
                url: `/api/media/resolve/${result.uuid}`,
                assetUuid: result.uuid,
                alt: result.alt || '',
                source: 'media-library',
            });
            closeInsertModal();
            return;
        }
        const url = result.url?.trim() || '';
        if (!/^https?:\/\//i.test(url)) {
            setEditorError('Featured image URL must use http or https.');
            return;
        }
        setFeaturedImage({ url, assetUuid: null, alt: result.alt || '', source: 'external' });
        closeInsertModal();
    };

    const resolveFeaturedImagePreview = (url: string) => {
        if (!url.startsWith('/')) return url;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';
        return `${apiUrl}${url}`;
    };

    const documentInspectorContent = (
        <>
          <section className="editor-inspector-section workspace-publish-section" data-inspector-section="publish">
            <div className="editor-inspector-section-heading">
              <Globe size={15} className="lucide-icon" />
              <div>
                <h4>Publishing</h4>
                <p>Status and public visibility for this {definition.singular.toLowerCase()}.</p>
              </div>
            </div>
            <div className="workspace-meta-list">
              <div>
                <span>Status</span>
                <strong className={`status-badge ${editorStatus}`}>{editorStatus.toUpperCase()}</strong>
              </div>
              <div>
                <span>Slug</span>
                <strong>{editorSlug || 'not-set'}</strong>
              </div>
              <div>
                <span>Visibility</span>
                <strong>Public Access</strong>
              </div>
              <div>
                <span>Revision</span>
                <strong>{editorVersionLabel}</strong>
              </div>
              <div>
                <span>Author</span>
                <strong>{user.username}</strong>
              </div>
              <div>
                <span>Publish Date</span>
                <strong>{editorStatus === 'published' ? 'Live now' : 'Not scheduled'}</strong>
              </div>
            </div>
          </section>

          <section className="editor-inspector-section" data-inspector-section="excerpt">
            <div className="editor-inspector-section-heading">
              <FileText size={15} className="lucide-icon" />
              <div>
                <h4>Excerpt</h4>
                <p>Short summary for lists and previews.</p>
              </div>
            </div>
            <div className="workspace-field-counter">{editorExcerpt.length}/300 chars</div>
            <textarea
              className="settings-textarea workspace-inspector-textarea"
              placeholder={`Summarize the ${definition.singular.toLowerCase()} content...`}
              maxLength={320}
              value={editorExcerpt}
              onChange={(e) => setEditorExcerpt(e.target.value)}
            />
          </section>

          {contentType === 'article' && (
            <section className="editor-inspector-section" data-inspector-section="categories">
              <div className="editor-inspector-section-heading workspace-section-between">
                <div>
                  <h4>Categories</h4>
                  <p>Group this article in the public archive.</p>
                </div>
                <button
                  className="btn-inline-action"
                  onClick={() => setShowAddCatForm(!showAddCatForm)}
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="topbar-search workspace-inspector-search">
                <Search size={12} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter categories..."
                  value={searchCategoryQuery}
                  onChange={(e) => setSearchCategoryQuery(e.target.value)}
                />
              </div>
              {showAddCatForm && (
                <div className="workspace-inline-create">
                  <input
                    type="text"
                    placeholder="New category..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                  <button className="btn-primary-action" onClick={handleCreateCategoryInline}>Add</button>
                </div>
              )}
              <div className="category-checkbox-list">
                {loadingTaxonomy ? (
                  <span className="workspace-muted">Loading...</span>
                ) : allCategories.length === 0 ? (
                  <span className="workspace-muted">No categories found.</span>
                ) : (
                  allCategories
                    .filter(c => c.name.toLowerCase().includes(searchCategoryQuery.toLowerCase()))
                    .map(cat => (
                      <label key={cat.id} className="category-checkbox-item">
                        <input
                          type="checkbox"
                          checked={editorCategoryIds.includes(cat.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditorCategoryIds([...editorCategoryIds, cat.id]);
                            } else {
                              setEditorCategoryIds(editorCategoryIds.filter(id => id !== cat.id));
                            }
                          }}
                        />
                        <span>{cat.name}</span>
                      </label>
                    ))
                )}
              </div>
            </section>
          )}

          {contentType === 'article' && (
            <section className="editor-inspector-section" data-inspector-section="tags">
              <div className="editor-inspector-section-heading">
                <div>
                  <h4>Tags</h4>
                  <p>Press Enter to attach or create tags.</p>
                </div>
              </div>
              <div className="tag-badges-container">
                {editorTagIds.map(tagId => {
                  const t = allTags.find(tag => tag.id === tagId);
                  if (!t) return null;
                  return (
                    <span key={tagId} className="tag-badge">
                      {t.name}
                      <button onClick={() => setEditorTagIds(editorTagIds.filter(id => id !== tagId))}><X size={10} /></button>
                    </span>
                  );
                })}
              </div>
              <input
                type="text"
                placeholder="Type tag and press Enter..."
                className="search-filter-input workspace-inspector-input"
                value={tagInputText}
                onChange={(e) => setTagInputText(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
            />
          </section>
          )}

          <section className="editor-inspector-section" data-inspector-section="featured-image">
            <div className="editor-inspector-section-heading">
              <ImageIcon size={15} className="lucide-icon" />
              <div>
                <h4>Featured Image</h4>
                <p>Used by themes, previews, and social sharing.</p>
              </div>
            </div>
            {featuredImage ? (
              <div className="workspace-featured-card">
                <img src={resolveFeaturedImagePreview(featuredImage.url)} alt={featuredImage.alt || 'Featured image preview'} />
                <div className="workspace-featured-meta">
                  <span>{featuredImage.source === 'media-library' ? 'Media Library' : 'External URL'}</span>
                  <input
                    type="text"
                    className="workspace-inspector-input"
                    placeholder="Alternative text"
                    value={featuredImage.alt}
                    onChange={(event) => setFeaturedImage({ ...featuredImage, alt: event.target.value })}
                  />
                  <div className="workspace-featured-actions">
                    <button type="button" className="btn-inline-action" onClick={openFeaturedImagePicker}>Replace</button>
                    <button type="button" className="btn-inline-action danger" onClick={() => setFeaturedImage(null)}>Remove</button>
                  </div>
                </div>
              </div>
            ) : (
              <button type="button" className="workspace-featured-placeholder" onClick={openFeaturedImagePicker}>
                <ImageIcon size={18} className="lucide-icon" />
                <span>Select Image</span>
                <small>Use a URL or explore your Media Library</small>
              </button>
            )}
          </section>

        </>
    );


    return(
        <EditorProvider editor={editor}>
            <div className="route-view posts-view">
              {postsSubView === 'list' ? (
                <>
                  <div className="view-header-with-action">
                    <div className="header-text">
                      <h2>{definition.plural}</h2>
                      <p>{contentType === 'article' ? 'Manage site articles, news, and blog content entries.' : `Manage site ${definition.plural.toLowerCase()} and content entries.`}</p>
                    </div>
                    <button className="btn-primary-action" onClick={initNewPost} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Plus size={16} className="lucide-icon" /> New {definition.singular}
                    </button>
                  </div>

                  <div className="table-filter-bar glass">
                    <div className="filter-left">
                      <input 
                        type="text" 
                        placeholder={`Search ${definition.plural.toLowerCase()}...`}
                        className="search-filter-input" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="card glass no-padding">
                    {loadingPosts ? (
                      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <Loader2 className="lucide-icon animate-spin" size={24} style={{ marginBottom: '1rem' }} />
                        <p>Loading {definition.plural.toLowerCase()}...</p>
                      </div>
                    ) : (
                      <div className="table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Title</th>
                              {contentType === 'article' && <th>Categories</th>}
                              <th>Status</th>
                              <th>Author</th>
                              <th>Published At</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                              <tr>
                                <td colSpan={contentType === 'article' ? 6 : 5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                  No {definition.plural.toLowerCase()} found. Click "New {definition.singular}" to create one!
                                </td>
                              </tr>
                            ) : (
                              posts
                                .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((post) => (
                                  <tr key={post.id}>
                                    <td><span className="title-bold">{post.title}</span></td>
                                    {contentType === 'article' && (
                                      <td>
                                        {post.categories && post.categories.length > 0
                                          ? post.categories.map((c: any) => c.name).join(', ')
                                          : '-'}
                                      </td>
                                    )}
                                    <td>
                                      <span className={`status-badge ${post.status}`}>
                                        {post.status.toUpperCase()}
                                      </span>
                                    </td>
                                    <td>{user.username}</td>
                                    <td>
                                      {post.publishedAt 
                                        ? new Date(post.publishedAt).toLocaleDateString() 
                                        : 'Not Published'}
                                    </td>
                                    <td className="table-actions">
                                      <button className="t-action-btn" onClick={() => startEditPost(post.id)}>Edit</button>
                                      <button className="t-action-btn danger" onClick={() => deletePost(post.id)}>Delete</button>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* CREATE / EDIT ARTICLE PANEL */
                <div className={`article-editor-panel${focusMode ? ' editor-focus-mode' : ''}${zenMode ? ' editor-zen-mode' : ''}`}>
                  <div className="publishing-workspace-header">
                    <div className="workspace-header-main">
                      <button 
                        className="workspace-back-button" 
                        onClick={() => setPostsSubView('list')}
                      >
                        <ArrowLeft size={14} /> {definition.plural}
                      </button>
                      <span className="workspace-breadcrumb-separator">&gt;</span>
                      <span>{definition.plural}</span>
                      <span className="workspace-breadcrumb-separator">&gt;</span>
                      <span className="workspace-breadcrumb-current">{editorTitle || (postsSubView === 'create' ? `New ${definition.singular}` : `Edit ${definition.singular}`)}</span>
                      <span className={`status-badge ${editorStatus}`}>{editorStatus.toUpperCase()}</span>
                      {editorStatus === 'published' && <span className="status-badge published">PUBLISHED</span>}
                    </div>

                    <div className="workspace-header-actions">
                      <span className="workspace-autosave-status">
                        {autosaveStatus === 'saving'
                          ? 'Saving...'
                          : autosaveStatus === 'saved'
                            ? formatLastSaved()
                            : autosaveStatus === 'error'
                              ? 'Autosave failed'
                              : autosaveStatus === 'unsaved'
                                ? 'Unsaved changes'
                                : 'Autosave ready'}
                      </span>
                      <span className="workspace-version-pill">{editorVersionLabel}</span>
                      <button className="btn-settings-action" type="button" onClick={() => setWorkspaceTab('preview')}>
                        <Eye size={16} /> Preview
                      </button>
                      <button 
                        className="btn-settings-action warning" 
                        disabled={isEditorSaving}
                        onClick={() => handleSavePost('draft')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        {isEditorSaving ? <Loader2 className="lucide-icon animate-spin" size={16} /> : <Save size={16} />}
                        Save Draft
                      </button>
                      <button 
                        className="btn-primary-action" 
                        disabled={isEditorSaving || !editorTitle.trim() || !editorSlug.trim() || !editorBody.trim()}
                        onClick={() => {
                          if (confirm(`Are you sure you want to publish this ${definition.singular.toLowerCase()} live?`)) {
                            handleSavePost('published');
                          }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        {isEditorSaving ? <Loader2 className="lucide-icon animate-spin" size={16} /> : <Send size={16} />}
                        Publish {definition.singular}
                      </button>
                    </div>
                  </div>

                  {/* Alerts */}
                  {editorError && (
                    <div className="login-error-box" style={{ marginTop: '1.25rem' }}>
                      <AlertCircle size={16} className="lucide-icon" />
                      <span>{editorError}</span>
                    </div>
                  )}

                  {editorSuccess && (
                    <div className="login-error-box" style={{ marginTop: '1.25rem', background: 'var(--accent-success-bg)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#a7f3d0' }}>
                      <CheckCircle size={16} className="lucide-icon" style={{ color: 'var(--accent-success)' }} />
                      <span>{editorSuccess}</span>
                    </div>
                  )}

                  {/* Editor Main Content Area */}
                  <div className="editor-layout-container">
                    <div className="editor-main-panel">
                      <div className="workspace-title-panel">
                        <div className="editor-title-group">
                          <input 
                            type="text" 
                            placeholder={`Enter ${definition.singular.toLowerCase()} title...`}
                            value={editorTitle}
                            onChange={(e) => {
                              setEditorTitle(e.target.value);
                              if (!editorSlugManuallyEdited) {
                                setEditorSlug(slugify(e.target.value));
                              }
                            }}
                            autoFocus
                          />
                        </div>

                        <div className="permalink-display">
                          <span>Permalink: </span>
                          <code>{getPublicUrl(editorSlug || '[slug]')}</code>
                          <button 
                            className="btn-inline-action" 
                            style={{ marginLeft: '0.5rem' }}
                            onClick={() => {
                              const val = prompt('Edit permalink slug:', editorSlug);
                              if (val !== null) {
                                setEditorSlug(slugify(val));
                                setEditorSlugManuallyEdited(true);
                              }
                            }}
                          >
                            Edit
                          </button>
                          {editorSlugManuallyEdited && (
                            <button 
                              className="btn-inline-action" 
                              style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}
                              onClick={() => {
                                setEditorSlug(slugify(editorTitle));
                                setEditorSlugManuallyEdited(false);
                              }}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="workspace-mode-tabs" role="tablist" aria-label="Editor workspace mode">
                        {(['write', 'preview', 'history'] as WorkspaceTab[]).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={workspaceTab === tab}
                            className={workspaceTab === tab ? 'active' : ''}
                            onClick={() => setWorkspaceTab(tab)}
                          >
                            {tab === 'preview' ? 'Editor Preview' : tab[0].toUpperCase() + tab.slice(1)}
                          </button>
                        ))}
                      </div>

                      {/* TIPTAP RICH TEXT EDITOR WORD-LIKE RIBBON */}
                      <div className="editor-card glass" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', position: 'relative' }}>
                        
                        {/* CUSTOM MODAL UNTUK INSERT LINK & IMAGE */}
                        {insertModalConfig && (() => {
                            const selectedSource = availableInsertSources.find(s => s.id === selectedInsertSourceId);
                            const dialogWidth = selectedSource?.preferredWidth ? `${selectedSource.preferredWidth}px` : '400px';
                            const isWide = !!(selectedSource && selectedSource.preferredWidth && selectedSource.preferredWidth > 400);

                            return (
                                <EditorModalShell
                                    isOpen={!!insertModalConfig}
                                    title={insertModalConfig.title}
                                    icon={insertModalConfig.type === 'link' ? <Link size={18} /> : <ImageIcon size={18} />}
                                    maxWidth={dialogWidth}
                                    isWide={isWide}
                                    onClose={closeInsertModal}
                                >
                                    {(insertModalConfig.type === 'image' || insertModalConfig.type === 'featured-image') && selectedInsertSourceId === '' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {availableInsertSources.map(source => {
                                                const SourceIcon = source.icon === 'globe' ? Globe : ImageIcon;
                                                return (
                                                    <button
                                                        key={source.id}
                                                        className="btn-settings-action"
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', padding: '0.75rem', width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
                                                        onClick={() => setSelectedInsertSourceId(source.id)}
                                                    >
                                                        <SourceIcon size={16} /> {source.label}
                                                    </button>
                                                );
                                            })}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                                <button className="btn-inline-action" onClick={closeInsertModal}>Cancel</button>
                                            </div>
                                        </div>
                                    ) : (insertModalConfig.type === 'image' || insertModalConfig.type === 'featured-image') && selectedSource && selectedSource.render ? (
                                        (() => {
                                            const SourceComponent = selectedSource.render;
                                            return (
                                                <SourceComponent
                                                    apiFetch={apiFetch}
                                                    options={insertModalConfig.type === 'featured-image' ? { mimeTypes: ['image/*'], multiple: false } : { multiple: false }}
                                                    onSelect={(result) => {
                                                        if (insertModalConfig.type === 'featured-image') {
                                                            setFeaturedImageFromResult(result);
                                                            return;
                                                        }
                                                        if (result && editor) {
                                                            if (result.editorNode) {
                                                                const inserted = insertPluginNodeAtSavedRange(result.editorNode);
                                                                closeInsertModal();
                                                                if (!inserted) setEditorError('The selected media type is not available in the editor.');
                                                            } else if (result.uuid) {
                                                                insertMediaAtSavedRange({
                                                                    uuid: result.uuid,
                                                                    alt: result.alt || '',
                                                                    caption: result.caption || '',
                                                                    mimeType: result.mimeType || ''
                                                                });
                                                                closeInsertModal();
                                                            } else if (result.url) {
                                                                const inserted = insertExternalImageAtSavedRange({
                                                                    url: result.url,
                                                                    alt: result.alt || ''
                                                                });
                                                                closeInsertModal();
                                                                if (!inserted) {
                                                                    setEditorError('External image URL must be a public http(s) URL and cannot point to local or internal media endpoints.');
                                                                }
                                                            }
                                                        } else {
                                                            closeInsertModal();
                                                        }
                                                    }}
                                                    onCancel={() => {
                                                        const sources = availableInsertSources;
                                                        if (sources.length > 1) {
                                                            setSelectedInsertSourceId('');
                                                        } else {
                                                            closeInsertModal();
                                                        }
                                                    }}
                                                />
                                            );
                                        })()
                                    ) : insertModalConfig.type === 'link' ? (
                                        <>
                                            <input
                                                type="text"
                                                placeholder="Link text"
                                                className="search-filter-input"
                                                style={{ width: '100%', marginBottom: '0.75rem', padding: '0.6rem' }}
                                                value={insertModalText}
                                                onChange={(e) => setInsertModalText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleInsertModalSubmit();
                                                }}
                                            />
                                            <input 
                                                type="url" 
                                                autoFocus
                                                placeholder="https://..."
                                                className="search-filter-input"
                                                style={{ width: '100%', marginBottom: '1.5rem', padding: '0.6rem' }}
                                                value={insertModalValue}
                                                onChange={(e) => setInsertModalValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleInsertModalSubmit();
                                                }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button 
                                                    className="btn-inline-action" 
                                                    onClick={closeInsertModal}
                                                >
                                                    Cancel
                                                </button>
                                                <button className="btn-primary-action" onClick={handleInsertModalSubmit}>Apply Link</button>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>No media insert source is available.</p>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                                <button className="btn-inline-action" onClick={closeInsertModal}>Cancel</button>
                                            </div>
                                        </div>
                                    )}
                                </EditorModalShell>
                            );
                        })()}

                        {workspaceTab === 'write' ? (
                          <>
                            <div className="editor-canvas-controlbar" aria-label="Editor canvas controls">
                              <div className="editor-canvas-control-group" aria-label="Content width">
                                {(['narrow', 'default', 'wide', 'full'] as CanvasWidth[]).map((width) => (
                                  <button
                                    key={width}
                                    type="button"
                                    className={canvasWidth === width ? 'active' : ''}
                                    onClick={() => setCanvasWidth(width)}
                                  >
                                    {width[0].toUpperCase() + width.slice(1)}
                                  </button>
                                ))}
                              </div>
                              <div className="editor-canvas-stats">
                                <span><FileText size={13} /> {wordCount} words</span>
                                <span><Columns3 size={13} /> {readabilityLabel}</span>
                              </div>
                              <div className="editor-canvas-control-group">
                                <button
                                  type="button"
                                  className={focusMode ? 'active' : ''}
                                  onClick={() => setFocusMode((value) => !value)}
                                >
                                  <Minimize2 size={13} /> Focus
                                </button>
                                <button
                                  type="button"
                                  className={zenMode ? 'active' : ''}
                                  onClick={() => setZenMode((value) => !value)}
                                >
                                  <Maximize2 size={13} /> Zen
                                </button>
                              </div>
                            </div>
                            <div
                              onPointerDownCapture={(event) => {
                                if (event.target instanceof Element) {
                                  const button = event.target.closest('button');

                                  if (button) {
                                    const buttonTitle = button.getAttribute('title');

                                    if (buttonTitle === 'Insert Media') {
                                      captureImageModalRange();
                                    } else {
                                      captureToolbarEditorRange();
                                    }

                                    if (buttonTitle === 'Insert / Edit Link') {
                                      captureLinkModalRange();
                                    }

                                    editorFocusLeavingRef.current = true;
                                    event.preventDefault();
                                  }
                                }
                              }}
                              onMouseDownCapture={(event) => {
                                if (event.target instanceof Element) {
                                  const button = event.target.closest('button');

                                  if (button) {
                                    const buttonTitle = button.getAttribute('title');

                                    if (buttonTitle === 'Insert Media') {
                                      captureImageModalRange();
                                    } else {
                                      captureToolbarEditorRange();
                                    }

                                    if (buttonTitle === 'Insert / Edit Link') {
                                      captureLinkModalRange();
                                    }

                                    editorFocusLeavingRef.current = true;
                                    event.preventDefault();
                                  }
                                }
                              }}
                            >
                              <EditorToolbarRibbon
                                activeTab={ribbonTab}
                                onTabChange={setRibbonTab}
                                onRequestDialog={handleToolbarDialogRequest}
                              />
                            </div>

                            <div 
                                className={`tiptap-editor-wrapper tiptap-editor-wrapper--${canvasWidth}`}
                                onMouseMove={updateHoveredBlockFromEvent}
                                onMouseLeave={() => setHoveredBlock(null)}
                                onPointerDown={(event) => {
                                    if (event.pointerType !== 'mouse') selectBlockFromEvent(event);
                                }}
                                onMouseDown={(event) => {
                                    selectBlockFromEvent(event);
                                    const position = editor?.view.posAtCoords({
                                        left: event.clientX,
                                        top: event.clientY,
                                    });

                                    if (position) {
                                        pendingLinkRangeRef.current = { from: position.pos, to: position.pos };
                                        imageModalRangeRef.current = pendingLinkRangeRef.current;
                                        imageUserRangeRef.current = pendingLinkRangeRef.current;
                                    }
                                }}
                                onMouseUp={() => {
                                    const range = getEditorDomSelectionRange();

                                    if (range) {
                                        pendingLinkRangeRef.current = range;
                                        lastEditorSelectionRangeRef.current = range;
                                        imageModalRangeRef.current = range;
                                        imageUserRangeRef.current = range;
                                    }
                                }}
                                onKeyUp={() => {
                                    const range = getEditorDomSelectionRange();

                                    if (range) {
                                        pendingLinkRangeRef.current = range;
                                        lastEditorSelectionRangeRef.current = range;
                                        imageModalRangeRef.current = range;
                                        imageUserRangeRef.current = range;
                                    }
                                }}
                                onClick={(event) => {
                                    if (event.target === event.currentTarget) {
                                        editor?.commands.focus();
                                    }
                                }}
                            >
                                {(selectedBlock || hoveredBlock) && !zenMode && (
                                  <div
                                    className={`editor-block-handle ${selectedBlock ? 'editor-block-handle--selected' : 'editor-block-handle--hovered'}`}
                                    style={{
                                      top: (selectedBlock || hoveredBlock)!.top,
                                      left: (selectedBlock || hoveredBlock)!.left,
                                      minHeight: (selectedBlock || hoveredBlock)!.height,
                                    }}
                                    aria-label={`${(selectedBlock || hoveredBlock)!.label} block controls`}
                                  >
                                    <button
                                      type="button"
                                      className="editor-block-handle-plus"
                                      aria-label="Insert block"
                                      title="Insert block"
                                      onMouseDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        openInsertMenuFromBlock((selectedBlock || hoveredBlock)!);
                                      }}
                                    >
                                      <Plus size={14} />
                                    </button>
                                    <div className="editor-block-move-actions" aria-label="Move block">
                                      <button
                                        type="button"
                                        className="editor-block-move-button"
                                        aria-label={`Move ${(selectedBlock || hoveredBlock)!.label} up`}
                                        title="Move block up"
                                        disabled={!(selectedBlock || hoveredBlock)!.canMoveUp}
                                        onMouseDown={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          moveBlockByDirection((selectedBlock || hoveredBlock)!, 'up');
                                        }}
                                      >
                                        <ArrowUp size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        className="editor-block-move-button"
                                        aria-label={`Move ${(selectedBlock || hoveredBlock)!.label} down`}
                                        title="Move block down"
                                        disabled={!(selectedBlock || hoveredBlock)!.canMoveDown}
                                        onMouseDown={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          moveBlockByDirection((selectedBlock || hoveredBlock)!, 'down');
                                        }}
                                      >
                                        <ArrowDown size={13} />
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      className="editor-block-handle-grip"
                                      data-block-pos={(selectedBlock || hoveredBlock)!.blockPos}
                                      data-block-end-pos={(selectedBlock || hoveredBlock)!.blockEndPos}
                                      data-block-label={(selectedBlock || hoveredBlock)!.label}
                                      aria-label={`Move ${(selectedBlock || hoveredBlock)!.label} block`}
                                      title={`Drag to move ${(selectedBlock || hoveredBlock)!.label}`}
                                      onMouseDown={(event) => {
                                        event.stopPropagation();
                                        setSelectedBlock(null);
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key === 'ArrowUp' && (selectedBlock || hoveredBlock)!.canMoveUp) {
                                          event.preventDefault();
                                          moveBlockByDirection((selectedBlock || hoveredBlock)!, 'up');
                                        }
                                        if (event.key === 'ArrowDown' && (selectedBlock || hoveredBlock)!.canMoveDown) {
                                          event.preventDefault();
                                          moveBlockByDirection((selectedBlock || hoveredBlock)!, 'down');
                                        }
                                      }}
                                    >
                                      <span />
                                      <span />
                                      <span />
                                      <span />
                                      <span />
                                      <span />
                                    </button>
                                  </div>
                                )}
                                {slashCommand.open && (
                                  <SlashCommandMenu
                                    items={slashCommandItems}
                                    activeIndex={slashCommandIndex}
                                    query={slashCommand.query}
                                    anchor={slashCommand.anchor}
                                    onSelect={(id) => applySlashCommand(id)}
                                  />
                                )}
                                <EditorContent editor={editor} />
                            </div>
                          </>
                        ) : (
                          <WorkspaceSupportPanel
                            tab={workspaceTab}
                            title={editorTitle || 'Untitled ' + definition.singular}
                            status={editorStatus}
                            versionLabel={editorVersionLabel}
                            lastSavedLabel={formatLastSaved()}
                          />
                        )}
                      </div>
                    </div>

                    {/* Editor Right Sidebar */}
                    <div className="editor-sidebar-panel">
                      <InspectorHost documentContent={documentInspectorContent} />

                      {/* Publish panel */}
                      <div className="editor-card glass">
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Globe size={14} className="lucide-icon" /> Publish Details
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                            <span className={`status-badge ${editorStatus}`} style={{ padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {editorStatus.toUpperCase()}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Visibility:</span>
                            <span style={{ fontWeight: 600 }}>🌐 Public Access</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Revision:</span>
                            <span style={{ fontWeight: 600 }}>Auto-increment</span>
                          </div>
                        </div>
                      </div>

                      {/* Categories Panel */}
                      {contentType === 'article' && (
                        <div className="editor-card glass">
                          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Categories</span>
                            <button 
                              className="btn-inline-action" 
                              style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                              onClick={() => setShowAddCatForm(!showAddCatForm)}
                            >
                              <Plus size={12} /> Add New
                            </button>
                          </h4>

                          <div className="topbar-search" style={{ width: '100%', marginBottom: '0.75rem' }}>
                            <Search size={12} className="search-icon" />
                            <input 
                              type="text" 
                              placeholder="Filter categories..." 
                              value={searchCategoryQuery}
                              onChange={(e) => setSearchCategoryQuery(e.target.value)}
                            />
                          </div>

                          {showAddCatForm && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                              <input 
                                type="text" 
                                placeholder="New category..." 
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value)}
                                style={{ flexGrow: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white' }}
                              />
                              <button 
                                className="btn-primary-action" 
                                style={{ padding: '0.35rem 0.60rem', fontSize: '0.75rem' }} 
                                onClick={handleCreateCategoryInline}
                              >
                                Add
                              </button>
                            </div>
                          )}

                          <div className="category-checkbox-list">
                            {loadingTaxonomy ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading...</span>
                            ) : allCategories.length === 0 ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No categories found.</span>
                            ) : (
                              allCategories
                                .filter(c => c.name.toLowerCase().includes(searchCategoryQuery.toLowerCase()))
                                .map(cat => (
                                  <label key={cat.id} className="category-checkbox-item">
                                    <input 
                                      type="checkbox" 
                                      checked={editorCategoryIds.includes(cat.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setEditorCategoryIds([...editorCategoryIds, cat.id]);
                                        } else {
                                          setEditorCategoryIds(editorCategoryIds.filter(id => id !== cat.id));
                                        }
                                      }}
                                    />
                                    <span>{cat.name}</span>
                                  </label>
                                ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tags Panel */}
                      {contentType === 'article' && (
                        <div className="editor-card glass">
                          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                            Tags
                          </h4>
                          
                          <div className="tag-badges-container">
                            {editorTagIds.map(tagId => {
                              const t = allTags.find(tag => tag.id === tagId);
                              if (!t) return null;
                              return (
                                <span key={tagId} className="tag-badge">
                                  {t.name}
                                  <button onClick={() => setEditorTagIds(editorTagIds.filter(id => id !== tagId))}><X size={10} /></button>
                                </span>
                              );
                            })}
                          </div>

                          <input 
                            type="text" 
                            placeholder="Type tag and press Enter..." 
                            className="search-filter-input"
                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                            value={tagInputText}
                            onChange={(e) => setTagInputText(e.target.value)}
                            onKeyDown={handleTagInputKeyDown}
                          />
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Tags will be created automatically if they don't exist.</p>
                        </div>
                      )}

                      {/* Featured Image */}
                      <div className="editor-card glass">
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                          Featured Image
                        </h4>
                        
                        <div style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '1.5rem 1rem', textAlign: 'center', cursor: 'pointer' }}>
                          <ImageIcon size={18} className="lucide-icon" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-purple)', fontWeight: 600 }}>Select Image</span>
                        </div>
                      </div>

                      {/* Author */}
                      <div className="editor-card glass">
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                          Author
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="profile-avatar" style={{ width: '26px', height: '26px', fontSize: '0.75rem' }}>{user.username[0].toUpperCase()}</div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.username}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
        </EditorProvider>
    );
}

function SlashCommandMenu({
    items,
    activeIndex,
    query,
    anchor,
    onSelect,
}: {
    items: Array<{ id: string; label: string; hint: string }>;
    activeIndex: number;
    query: string;
    anchor: SlashMenuAnchor | null;
    onSelect: (id: string) => void;
}) {
    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div
            className={`slash-command-menu slash-command-menu--${anchor?.placement || 'down'}`}
            role="listbox"
            aria-label="Insert block"
            style={{
                left: anchor ? `${anchor.left}px` : undefined,
                top: anchor ? `${anchor.top}px` : undefined,
                maxHeight: anchor ? `${anchor.maxHeight}px` : undefined,
            }}
        >
            <div className="slash-command-header">
                <span>Insert block</span>
                <strong>{query ? `/${query}` : '/'}</strong>
            </div>
            <div className="slash-command-list">
                {items.length === 0 ? (
                    <div className="slash-command-empty">No blocks found.</div>
                ) : (
                    items.map((item, index) => (
                        <button
                            key={item.id}
                            type="button"
                            role="option"
                            aria-selected={activeIndex === index}
                            className={activeIndex === index ? 'active' : ''}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                onSelect(item.id);
                            }}
                        >
                            <span>{item.label}</span>
                            <small>{item.hint}</small>
                        </button>
                    ))
                )}
            </div>
        </div>,
        document.body
    );
}

function WorkspaceSupportPanel({
    tab,
    title,
    status,
    versionLabel,
    lastSavedLabel,
}: {
    tab: WorkspaceTab;
    title: string;
    status: string;
    versionLabel: string;
    lastSavedLabel: string;
}) {
    if (tab === 'history') {
        return (
            <div className="workspace-preview-placeholder workspace-support-panel">
                <Clock size={22} className="lucide-icon" />
                <h3>History</h3>
                <div className="workspace-revision-list" aria-label="Revision list">
                    <div>
                        <strong>{versionLabel}</strong>
                        <span>{lastSavedLabel}</span>
                    </div>
                    <div>
                        <strong>Revision 2</strong>
                        <span>Compare and restore will connect to the revision API.</span>
                    </div>
                    <div>
                        <strong>Revision 1</strong>
                        <span>Initial draft snapshot.</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="workspace-preview-placeholder workspace-support-panel">
            <Eye size={22} className="lucide-icon" />
            <h3>Editor Preview</h3>
            <p>Preview rendering will be connected through the Theme System renderer.</p>
            <div className="workspace-preview-summary">
                <span>{title}</span>
                <strong>{status}</strong>
            </div>
        </div>
    );
}

