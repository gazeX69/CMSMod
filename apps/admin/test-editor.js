import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, path), 'utf8');

const mediaNode = read('src/editor/nodes/MediaNode.ts');
const mediaNodeView = read('src/editor/nodes/MediaNodeView.tsx');
const externalImageNode = read('src/editor/nodes/ExternalImageNode.ts');
const imageNodeSelection = read('src/editor/nodes/imageNodeSelection.ts');
const editorProvider = read('src/editor/provider/EditorProvider.tsx');
const articleManager = read('src/pages/ArticleManager.tsx');

const checks = [
  [
    mediaNode.includes("const MEDIA_NODE_NAME = 'mediaNode'") &&
      mediaNode.includes('name: MEDIA_NODE_NAME') &&
      mediaNode.includes("group: 'block'") &&
      mediaNode.includes('atom: true') &&
      mediaNode.includes('selectable: true') &&
      mediaNode.includes('draggable: true'),
    'MediaNode must be a selectable draggable block atom.',
  ],
  [
    mediaNode.includes("tag: 'img[data-media-uuid]'") &&
      mediaNode.includes("tag: 'media-node[data-media-uuid]'"),
    'MediaNode must parse img[data-media-uuid] and legacy media-node[data-media-uuid].',
  ],
  [
    mediaNode.includes("return ['img', HTMLAttributes]") &&
      mediaNode.includes("'data-media-uuid': attributes.uuid") &&
      !mediaNode.includes("return ['media-node', HTMLAttributes]"),
    'MediaNode must render storage-safe img[data-media-uuid], not media-node.',
  ],
  [
    mediaNode.includes("element.getAttribute('alt')") &&
      mediaNode.includes("'data-mime-type': attributes.mimeType"),
    'MediaNode must preserve alt and mimeType attributes.',
  ],
  [
    mediaNode.includes('width: {') &&
      mediaNode.includes('parseImageWidthAttribute(element)') &&
      mediaNode.includes('renderImageWidthAttribute(attributes.width)') &&
      imageNodeSelection.includes("element.getAttribute('width')") &&
      imageNodeSelection.includes("element.getAttribute('data-width')") &&
      imageNodeSelection.includes('element.style.width') &&
      imageNodeSelection.includes('return { width }'),
    'MediaNode must parse and render persisted width without changing media identity.',
  ],
  [
    editorProvider.includes("type: 'mediaNode'") &&
      editorProvider.includes('mimeType: payload.mimeType') &&
      editorProvider.includes("type: 'paragraph'"),
    'insertMediaNode command must insert a valid mediaNode followed by a typing paragraph.',
  ],
  [
    mediaNode.includes('createImageNodeSelectionPlugin([MEDIA_NODE_NAME])') &&
      imageNodeSelection.includes('handleTextInput') &&
      imageNodeSelection.includes('transaction.insertText(text)') &&
      imageNodeSelection.includes("event.key === 'Enter'") &&
      imageNodeSelection.includes("event.key === 'ArrowDown'") &&
      imageNodeSelection.includes("event.key === 'ArrowUp'"),
    'MediaNode must redirect typing, Enter, ArrowDown, and ArrowUp from node selection into paragraphs through the shared image selection plugin.',
  ],
  [
    mediaNodeView.includes('const MIN_MEDIA_WIDTH = 64') &&
      mediaNodeView.includes("const imageWidthStyle = isWide ? '100%' : numericWidth") &&
      mediaNodeView.includes("const wrapperWidthStyle = isWide ? '100%' : numericWidth") &&
      mediaNodeView.includes('props.updateAttributes({ width: nextWidth })') &&
      mediaNodeView.includes('startResize(event, 1)') &&
      mediaNodeView.includes('startResize(event, -1)') &&
      mediaNodeView.includes("width: imageWidthStyle") &&
      mediaNodeView.includes('width: wrapperWidthStyle') &&
      mediaNodeView.includes('draggable={false}') &&
      mediaNodeView.includes('onDragStart={(event) => event.preventDefault()}') &&
      !mediaNodeView.includes('data-drag-handle') &&
      mediaNodeView.includes('selected && imgSrc && !error') &&
      mediaNodeView.includes('selected-image-toolbar') &&
      mediaNodeView.includes('data-image-alignment-option={item.value}') &&
      mediaNodeView.includes('onPointerDown={handleAlignmentChange}') &&
      mediaNodeView.includes('onClick={handleAlignmentChange}'),
    'MediaNodeView must show selected-only resize handles without invoking ProseMirror node dragging.',
  ],
  [
    !articleManager.includes('@tiptap/extension-image') &&
      !articleManager.includes('setImage({ src:'),
    'Article editor must not use TipTap Image or src-based media insertion.',
  ],
  [
    externalImageNode.includes("const EXTERNAL_IMAGE_NODE_NAME = 'externalImageNode'") &&
      externalImageNode.includes('name: EXTERNAL_IMAGE_NODE_NAME') &&
      externalImageNode.includes('isAllowedExternalImageUrl') &&
      externalImageNode.includes("'img[src]:not([data-media-uuid])'") &&
      externalImageNode.includes("url.pathname.startsWith('/uploads/')") &&
      externalImageNode.includes("url.pathname.startsWith('/api/media/resolve/')") &&
      externalImageNode.includes("'localhost'") &&
      externalImageNode.includes("'127.0.0.1'") &&
      externalImageNode.includes('ReactNodeViewRenderer(MediaNodeView)') &&
      externalImageNode.includes('createImageNodeSelectionPlugin([EXTERNAL_IMAGE_NODE_NAME])') &&
      externalImageNode.includes('renderImageWidthAttribute(attributes.width)'),
    'ExternalImageNode must be separate from MediaNode, reject internal media/local URLs, and use the stable image node view/selection behavior.',
  ],
  [
    editorProvider.includes("name: 'insertExternalImageNode'") &&
      editorProvider.includes("type: 'externalImageNode'") &&
      editorProvider.includes("id: 'url'") &&
      editorProvider.includes("label: 'URL'") &&
      editorProvider.includes('UrlInsertForm'),
    'EditorProvider must register core URL source and insert ExternalImageNode.',
  ],
  [
    articleManager.includes("runtime.executeCommand(editor, 'insertExternalImageNode'") &&
      articleManager.includes("runtime.executeCommand(editor, 'insertMediaNode'") &&
      !articleManager.includes('setImage({ src:'),
    'Article insert flow must route URLs to ExternalImageNode and UUIDs to MediaNode.',
  ],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);

if (failures.length > 0) {
  console.error(`Editor regression checks failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('Editor regression checks passed.');
