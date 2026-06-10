import type { EditorPropertyPanelDefinition, EditorRegistry } from '../contracts';

export function getSelectedNodeType(selectedNode: any | null): string | null {
  return selectedNode?.type?.name || null;
}

export function resolvePropertyPanel(
  registry: EditorRegistry,
  selectedNode: any | null
): EditorPropertyPanelDefinition | null {
  const nodeType = getSelectedNodeType(selectedNode);

  if (!nodeType) {
    return null;
  }

  return registry.propertyPanels.getByNodeType(nodeType) || null;
}
