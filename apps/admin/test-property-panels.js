import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, path), 'utf8');

const contracts = read('src/editor/contracts/index.ts');
const registry = read('src/editor/registry/editorRegistry.ts');
const runtime = read('src/editor/core/EditorRuntime.ts');
const provider = read('src/editor/provider/EditorProvider.tsx');
const articleManager = read('src/pages/ContentManager.tsx');
const propertyPanelIndex = read('src/editor/property-panels/index.ts');
const resolver = read('src/editor/property-panels/PropertyPanelResolver.ts');
const manager = read('src/editor/property-panels/PropertyPanelManager.ts');
const host = read('src/editor/property-panels/PropertyPanelHost.tsx');
const inspector = read('src/editor/inspector/InspectorHost.tsx');
const imagePanels = read('src/editor/property-panels/ImagePlaceholderPanels.tsx');

const checks = [
  [
    contracts.includes('export interface EditorInspectorSectionDefinition') &&
      contracts.includes("export type EditorInspectorMode") &&
      contracts.includes('mode: EditorInspectorMode'),
    'Editor contracts must expose contextual inspector section definitions.',
  ],
  [
    registry.includes('private inspectorSectionsMap') &&
      registry.includes('inspectorSections = {') &&
      registry.includes('getByMode: (mode: EditorInspectorMode)'),
    'Editor registry must expose inspector section registration and lookup by mode.',
  ],
  [
    runtime.includes('getInspectorSections()') &&
      runtime.includes('getInspectorSectionsByMode(mode'),
    'Editor runtime must expose inspector sections.',
  ],
  [
    inspector.includes("id: 'document', label: 'Document'") &&
      inspector.includes("id: 'inspector', label: 'Inspector'") &&
      inspector.includes('runtime.getInspectorSectionsByMode') &&
      inspector.includes('<PropertyPanelHost />'),
    'InspectorHost must keep document and selected block property panels available as tabs.',
  ],
  [
    contracts.includes('export interface EditorPropertyPanelDefinition') &&
      contracts.includes('nodeType: string') &&
      contracts.includes('updateAttributes: (attrs: Record<string, any>) => void'),
    'Editor contracts must expose property panel definitions with nodeType and updateAttributes.',
  ],
  [
    registry.includes('private propertyPanelsMap') &&
      registry.includes('propertyPanels = {') &&
      registry.includes('getByNodeType: (nodeType: string)'),
    'Editor registry must expose property panel registration and lookup by node type.',
  ],
  [
    resolver.includes('resolvePropertyPanel') &&
      resolver.includes('getSelectedNodeType') &&
      resolver.includes('registry.propertyPanels.getByNodeType(nodeType)'),
    'Property panel resolver must map selected node type to a registered panel.',
  ],
  [
    manager.includes('export class PropertyPanelManager') &&
      manager.includes('resolve(selectedNode') &&
      manager.includes('getPanelForNodeType(nodeType'),
    'Property panel manager must wrap panel resolution and node type lookup.',
  ],
  [
    runtime.includes('getPropertyPanels()') &&
      runtime.includes('getPropertyPanelByNodeType(nodeType') &&
      runtime.includes('resolvePropertyPanel(selectedNode'),
    'Editor runtime must expose property panel access and selected-node resolution.',
  ],
  [
    host.includes('useEditorContext') &&
      host.includes('selectionState.selectedNode') &&
      host.includes('manager.resolve(selectedNode)') &&
      host.includes('data-property-panel-node-type={nodeType}') &&
      host.includes('return null'),
    'PropertyPanelHost must render only when selected node resolves to a panel.',
  ],
  [
    provider.includes("nodeType: 'mediaNode'") &&
      provider.includes('component: MediaImagePropertyPanel') &&
      provider.includes("nodeType: 'externalImageNode'") &&
      provider.includes('component: ExternalImagePropertyPanel'),
    'EditorProvider must register placeholder image property panels.',
  ],
  [
    imagePanels.includes('MediaImagePropertyPanel') &&
      imagePanels.includes('ExternalImagePropertyPanel') &&
      imagePanels.includes('updateAttributes({ width: parseWidthInput(value) })') &&
      imagePanels.includes('updateAttributes({ alignment: value })') &&
      imagePanels.includes('updateAttributes({ alt: value })') &&
      imagePanels.includes('updateAttributes({ caption: value })') &&
      imagePanels.includes('updateAttributes({ title: value })'),
    'Image property panels must update existing width, alt, caption, and title attributes.',
  ],
  [
    imagePanels.includes('<h4>Image</h4>') &&
      imagePanels.includes('Width') &&
      imagePanels.includes('Alignment') &&
      imagePanels.includes('Alt Text') &&
      imagePanels.includes('Caption') &&
      imagePanels.includes('Title') &&
      imagePanels.includes('Advanced'),
    'Image property panels must expose the MVP image fields.',
  ],
  [
    !imagePanels.includes('crop') &&
      !imagePanels.includes('gallery') &&
      !imagePanels.includes('filter') &&
      !imagePanels.includes('float'),
    'Image property panels must not add forbidden advanced image controls.',
  ],
  [
    articleManager.includes('InspectorHost') &&
      articleManager.includes('<InspectorHost documentContent={documentInspectorContent} />') &&
      articleManager.includes('editor-sidebar-panel'),
    'Article editor sidebar must host the contextual inspector infrastructure.',
  ],
  [
    propertyPanelIndex.includes("export * from './PropertyPanelHost'") &&
      propertyPanelIndex.includes("export * from './PropertyPanelManager'") &&
      propertyPanelIndex.includes("export * from './PropertyPanelResolver'"),
    'Property panel module index must export infrastructure pieces.',
  ],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);

if (failures.length > 0) {
  console.error(`Property panel infrastructure checks failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('Property panel infrastructure checks passed.');
