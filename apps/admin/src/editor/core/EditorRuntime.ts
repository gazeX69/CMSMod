import { EditorRegistry, EditorToolbarItem, EditorCommand, EditorNodeDefinition, EditorMarkDefinition, EditorMediaPickerHandler, EditorInsertSource, EditorPropertyPanelDefinition, EditorInspectorMode, EditorInspectorSectionDefinition } from '../contracts';
import { Editor } from '@tiptap/react';
import { resolvePropertyPanel } from '../property-panels/PropertyPanelResolver';

export class EditorRuntime {
  constructor(private registry: EditorRegistry) {}

  // -- Toolbar Runtime --
  public getToolbarItems(): EditorToolbarItem[] {
    return this.registry.toolbar.getAll();
  }

  public getToolbarByTab(tab: string): EditorToolbarItem[] {
    return this.registry.toolbar.getByTab(tab);
  }

  // -- Command Runtime --
  public getCommands(): EditorCommand[] {
    return this.registry.commands.getAll();
  }

  public executeCommand(editor: Editor, name: string, ...args: any[]): any {
    return this.registry.commands.execute(editor, name, ...args);
  }

  // -- Node Runtime --
  public getNodes(): EditorNodeDefinition[] {
    return this.registry.nodes.getAll();
  }

  public getMarks(): EditorMarkDefinition[] {
    return this.registry.marks.getAll();
  }

  // -- Property Panel Runtime --
  public getPropertyPanels(): EditorPropertyPanelDefinition[] {
    return this.registry.propertyPanels.getAll();
  }

  public getPropertyPanelByNodeType(nodeType: string): EditorPropertyPanelDefinition | null {
    return this.registry.propertyPanels.getByNodeType(nodeType) || null;
  }

  public resolvePropertyPanel(selectedNode: any | null): EditorPropertyPanelDefinition | null {
    return resolvePropertyPanel(this.registry, selectedNode);
  }

  public getInspectorSections(): EditorInspectorSectionDefinition[] {
    return this.registry.inspectorSections.getAll();
  }

  public getInspectorSectionsByMode(mode: EditorInspectorMode): EditorInspectorSectionDefinition[] {
    return this.registry.inspectorSections.getByMode(mode);
  }

  public getSidebars() {
    return this.registry.sidebars.getAll();
  }

  // -- Media Picker Runtime --
  public registerMediaPicker(handler: EditorMediaPickerHandler): void {
    this.registry.mediaPicker.register(handler);
  }

  public getMediaPicker(): EditorMediaPickerHandler | null {
    return this.registry.mediaPicker.get();
  }

  // -- Insert Source Runtime --
  public getInsertSources(): EditorInsertSource[] {
    return this.registry.insertSources.getAll();
  }

  // Helper for Tiptap initialization
  public getTiptapExtensions(): any[] {
    const nodeExtensions = this.getNodes().map(node => node.extension);
    const markExtensions = this.getMarks().map(mark => mark.extension);
    return [...nodeExtensions, ...markExtensions];
  }
}
