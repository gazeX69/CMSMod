import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, path), 'utf8');

const mediaNode = read('src/editor/nodes/MediaNode.ts');
const mediaNodeView = read('src/editor/nodes/MediaNodeView.tsx');
const externalImageNode = read('src/editor/nodes/ExternalImageNode.ts');
const imageNodeSelection = read('src/editor/nodes/imageNodeSelection.ts');
const editorCanvasCss = read('src/editor/layout/EditorCanvas.css');
const editorProvider = read('src/editor/provider/EditorProvider.tsx');
const propertyPanelHost = read('src/editor/property-panels/PropertyPanelHost.tsx');
const articleManager = read('src/pages/ArticleManager.tsx');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getFunctionBody(source, functionName) {
  const signatureIndex = source.indexOf(`function ${functionName}`);
  assert(signatureIndex >= 0, `Could not find function ${functionName}.`);

  const bodyStart = source.indexOf('{', signatureIndex);
  assert(bodyStart >= 0, `Could not find function body for ${functionName}.`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(bodyStart + 1, index);
    }
  }

  throw new Error(`Could not parse function body for ${functionName}.`);
}

function makeElement(attributes, style = {}) {
  return {
    getAttribute: (name) => attributes[name] ?? null,
    style,
  };
}

const parseImageWidthAttribute = new Function(
  'element',
  getFunctionBody(imageNodeSelection, 'parseImageWidthAttribute')
);

const renderImageWidthAttribute = new Function(
  'width',
  getFunctionBody(imageNodeSelection, 'renderImageWidthAttribute')
);

const isAllowedExternalImageUrl = new Function(
  'BLOCKED_EXTERNAL_IMAGE_HOSTS',
  'value',
  getFunctionBody(externalImageNode, 'isAllowedExternalImageUrl')
).bind(null, new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']));

function testMediaNodeHtmlRoundTrip() {
  const uuid = '11111111-2222-3333-4444-555555555555';
  const element = makeElement({ 'data-media-uuid': uuid, width: '300' });
  const parsedWidth = parseImageWidthAttribute(element);
  const renderedWidth = renderImageWidthAttribute(parsedWidth);

  assert(
    mediaNode.includes("parseHTML: (element: any) => element.getAttribute('data-media-uuid')"),
    'MediaNode must parse data-media-uuid from HTML.'
  );
  assert(
    mediaNode.includes("'data-media-uuid': attributes.uuid"),
    'MediaNode must render data-media-uuid back to HTML.'
  );
  assert(parsedWidth === 300, 'MediaNode width round-trip must parse width=300.');
  assert(renderedWidth.width === 300, 'MediaNode width round-trip must render width=300.');
}

function testExternalImageNodeHtmlRoundTrip() {
  const src = 'https://example.com/a.jpg';
  const element = makeElement({ src, width: '300' });
  const parsedWidth = parseImageWidthAttribute(element);
  const renderedWidth = renderImageWidthAttribute(parsedWidth);

  assert(isAllowedExternalImageUrl(src), 'ExternalImageNode must accept public https image URLs.');
  assert(
    externalImageNode.includes("return { src: attributes.src }"),
    'ExternalImageNode must render src back to HTML.'
  );
  assert(parsedWidth === 300, 'ExternalImageNode width round-trip must parse width=300.');
  assert(renderedWidth.width === 300, 'ExternalImageNode width round-trip must render width=300.');
}

function testWidthParsingFallbacks() {
  assert(parseImageWidthAttribute(makeElement({ 'data-width': '275' })) === 275, 'Must parse data-width fallback.');
  assert(parseImageWidthAttribute(makeElement({}, { width: '325px' })) === 325, 'Must parse inline style width fallback.');
  assert(parseImageWidthAttribute(makeElement({ width: '0' })) === null, 'Must reject zero width.');
  assert(Object.keys(renderImageWidthAttribute(null)).length === 0, 'Must not render null width.');
}

function testTypingAndResizeGuards() {
  assert(
    mediaNode.includes('createImageNodeSelectionPlugin([MEDIA_NODE_NAME])'),
    'MediaNode must keep selected image typing guard.'
  );
  assert(
    externalImageNode.includes('createImageNodeSelectionPlugin([EXTERNAL_IMAGE_NODE_NAME])'),
    'ExternalImageNode must keep selected image typing guard.'
  );
  assert(
    mediaNodeView.includes('props.updateAttributes({ width: nextWidth })'),
    'Image NodeView must keep resize persistence via updateAttributes.'
  );
  assert(
      mediaNodeView.includes('updateImageNodeAttributes') &&
      mediaNodeView.includes('state.selection.from') &&
      mediaNodeView.includes('setNodeMarkup(pos, undefined') &&
      mediaNodeView.includes('NodeSelection.create(state.doc, pos)') &&
      mediaNodeView.includes('data-image-alignment-option={item.value}') &&
      mediaNodeView.includes('handleAlignmentButtonChange') &&
      mediaNodeView.includes('onPointerDown={(event) => handleAlignmentButtonChange(event, item.value)}') &&
      mediaNodeView.includes('onPointerDown={handleAlignmentChange}') &&
      mediaNodeView.includes('onClick={handleAlignmentChange}'),
    'Image toolbar alignment must update the exact selected node through an undoable editor transaction.'
  );
  assert(
    mediaNodeView.includes('activeResizeCleanupRef') &&
      mediaNodeView.includes("window.addEventListener('pointercancel', stopResize)") &&
      mediaNodeView.includes("window.addEventListener('blur', stopResize)") &&
      mediaNodeView.includes('moveEvent.buttons === 0'),
    'Image NodeView must reliably stop resize after release, cancel, blur, or button-up mousemove.'
  );
  assert(
    mediaNodeView.includes("width: imageWidthStyle") &&
      mediaNodeView.includes('width: wrapperWidthStyle') &&
      mediaNodeView.includes('data-image-alignment={imageAlignment}'),
    'Image NodeView must size the rendered img and wrapper together.'
  );
}

function testSelectedImageToolbarSpacing() {
  assert(
    mediaNodeView.includes("paddingTop: selected && imgSrc && !error ? '2.25rem' : 0"),
    'Selected Image NodeView must reserve vertical space for the contextual toolbar.'
  );
  assert(
    editorCanvasCss.includes('top: 0.125rem') &&
      editorCanvasCss.includes('[data-image-alignment="left"] .selected-image-toolbar') &&
      editorCanvasCss.includes('[data-image-alignment="right"] .selected-image-toolbar'),
    'Selected image toolbar must sit inside the selected image wrapper and stay canvas-aware for edge alignments.'
  );
}

function testImageSelectionOwnershipUsesNodeSelectionPosition() {
  assert(
      mediaNodeView.includes("import { NodeSelection } from '@tiptap/pm/state'") &&
      mediaNodeView.includes('const { node, editor, getPos } = props') &&
      mediaNodeView.includes('selection instanceof NodeSelection') &&
      mediaNodeView.includes('selection.from === nodePos') &&
      mediaNodeView.includes('const pos = getPos()') &&
      mediaNodeView.includes('NodeSelection.create(state.doc, pos)') &&
      mediaNodeView.includes('event.stopPropagation()') &&
      mediaNodeView.includes('editor.view.focus()') &&
      mediaNodeView.includes("event.type === 'click'") &&
      mediaNodeView.includes('window.setTimeout(applyNodeSelection, 0)') &&
      mediaNodeView.includes('window.setTimeout(applyNodeSelection, 50)') &&
      mediaNodeView.includes('onMouseDown={selectImageNode}') &&
      mediaNodeView.includes('onMouseUp={selectImageNode}') &&
      mediaNodeView.includes('onClick={selectImageNode}'),
    'Image NodeView must explicitly restore NodeSelection from getPos when the image body is clicked.'
  );
  assert(
    imageNodeSelection.includes('handleClickOn(view, nodePos, node') &&
      imageNodeSelection.includes('selectableNodeNames.has(node.type.name)') &&
      imageNodeSelection.includes('NodeSelection.create(view.state.doc, nodePos)'),
    'Image selection plugin must restore NodeSelection from the clicked node position after TextSelection drift.'
  );
  assert(
    imageNodeSelection.includes('selectClickedImageNode') &&
      imageNodeSelection.includes('button[data-image-alignment-option]') &&
      imageNodeSelection.includes('alignment: nextAlignment') &&
      imageNodeSelection.includes("target.closest('[data-node-view-wrapper]')") &&
      imageNodeSelection.includes('view.posAtDOM(nodeViewElement, 0)') &&
      imageNodeSelection.includes('mouseup(view, event)') &&
      imageNodeSelection.includes('handleDOMEvents'),
    'Image selection plugin must map image node-view DOM clicks back to the exact document position.'
  );
  assert(
    editorProvider.includes("import { NodeSelection, TextSelection } from '@tiptap/pm/state'") &&
      editorProvider.includes('selection instanceof NodeSelection') &&
      editorProvider.includes('setSelectedNodePos(selection.from)') &&
      editorProvider.includes('handleSelectionUpdate();'),
    'EditorProvider must derive selected image ownership from the current ProseMirror NodeSelection and position.'
  );
  assert(
    propertyPanelHost.includes('const selectedNodePos = selectionState.selectedNodePos') &&
      propertyPanelHost.includes('state.doc.nodeAt(selectedNodePos)') &&
      propertyPanelHost.includes('tr.setNodeMarkup(selectedNodePos') &&
      propertyPanelHost.includes('NodeSelection.create(tr.doc, selectedNodePos)'),
    'Image property panel updates must target the selected NodeSelection position, not a detached node cache.'
  );
}

function testPluginActivationFiltering() {
  const sources = [{ id: 'url' }, { id: 'plugin-image-source', pluginId: 'plugin-image' }];
  const filterSources = (pluginsList) =>
    sources.filter((source) => !source.pluginId || new Set(pluginsList.filter((plugin) => plugin.status === 'active').map((plugin) => plugin.key)).has(source.pluginId));

  assert(
    articleManager.includes('!source.pluginId || activePluginIds.has(source.pluginId)'),
    'ArticleManager must filter plugin insert sources through generic plugin metadata.'
  );
  assert(
    filterSources([{ key: 'plugin-image', status: 'active' }]).some((source) => source.id === 'plugin-image-source'),
    'Plugin insert source must exist when its plugin is active.'
  );
  assert(
    !filterSources([{ key: 'plugin-image', status: 'inactive' }]).some((source) => source.id === 'plugin-image-source'),
    'Plugin insert source must be absent when its plugin is inactive.'
  );
}

function testUrlValidation() {
  const rejected = [
    'http://localhost/a.jpg',
    'http://127.0.0.1/a.jpg',
    'http://0.0.0.0/a.jpg',
    'http://[::1]/a.jpg',
    'https://example.com/uploads/a.jpg',
    'https://example.com/api/media/resolve/11111111-2222-3333-4444-555555555555',
  ];

  const accepted = [
    'https://example.com/a.jpg',
    'http://example.com/a.jpg',
  ];

  for (const url of rejected) {
    assert(!isAllowedExternalImageUrl(url), `External image URL must reject ${url}.`);
  }

  for (const url of accepted) {
    assert(isAllowedExternalImageUrl(url), `External image URL must accept ${url}.`);
  }
}

function testResolverContractSeparation() {
  assert(
    mediaNodeView.includes('/api/media/resolve/${uuid}?size=thumb'),
    'MediaNodeView must keep Media Library resolver URL contract.'
  );
  assert(
    mediaNode.includes("'data-media-uuid': attributes.uuid"),
    'MediaNode must keep data-media-uuid storage identity.'
  );
  assert(
    externalImageNode.includes("return { src: attributes.src }"),
    'ExternalImageNode must keep src storage identity.'
  );
  assert(
    externalImageNode.includes("'img[src]:not([data-media-uuid])'"),
    'ExternalImageNode must not parse Media Library images.'
  );
}

const tests = [
  testMediaNodeHtmlRoundTrip,
  testExternalImageNodeHtmlRoundTrip,
  testWidthParsingFallbacks,
  testTypingAndResizeGuards,
  testSelectedImageToolbarSpacing,
  testImageSelectionOwnershipUsesNodeSelectionPosition,
  testPluginActivationFiltering,
  testUrlValidation,
  testResolverContractSeparation,
];

const failures = [];

for (const test of tests) {
  try {
    test();
  } catch (error) {
    failures.push(`${test.name}: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error(`Editor image regression lock failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Editor image regression lock passed (${tests.length} scenarios).`);
