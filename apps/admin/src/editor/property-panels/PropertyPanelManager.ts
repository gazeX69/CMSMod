import type { EditorPropertyPanelDefinition, EditorRegistry } from '../contracts';
import { resolvePropertyPanel } from './PropertyPanelResolver';

export class PropertyPanelManager {
  constructor(private registry: EditorRegistry) {}

  public resolve(selectedNode: any | null): EditorPropertyPanelDefinition | null {
    return resolvePropertyPanel(this.registry, selectedNode);
  }

  public getPanelForNodeType(nodeType: string): EditorPropertyPanelDefinition | null {
    return this.registry.propertyPanels.getByNodeType(nodeType) || null;
  }
}
