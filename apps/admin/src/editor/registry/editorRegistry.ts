import {
  EditorRegistry as IEditorRegistry,
  EditorToolbarItem,
  EditorCommand,
  EditorModalDefinition,
  EditorNodeDefinition,
  EditorMarkDefinition,
  EditorPropertyPanelDefinition,
  EditorInspectorMode,
  EditorInspectorSectionDefinition,
  EditorSidebarDefinition,
  EditorMediaPickerHandler,
  EditorInsertSource,
} from '../contracts';
import { Editor } from '@tiptap/react';

export class EditorRegistryManager implements IEditorRegistry {
  private toolbarItems: EditorToolbarItem[] = [];
  private editorCommands: Map<string, EditorCommand> = new Map();
  private editorNodes: EditorNodeDefinition[] = [];
  private editorMarks: EditorMarkDefinition[] = [];
  private editorModals: Map<string, EditorModalDefinition> = new Map();
  private propertyPanelsMap: Map<string, EditorPropertyPanelDefinition> = new Map();
  private inspectorSectionsMap: Map<string, EditorInspectorSectionDefinition> = new Map();
  private sidebarsMap: Map<string, EditorSidebarDefinition> = new Map();

  public toolbar = {
    register: (item: EditorToolbarItem) => {
      const exists = this.toolbarItems.some(i => i.id === item.id);
      if (!exists) {
        this.toolbarItems.push(item);
      } else {
        const index = this.toolbarItems.findIndex(i => i.id === item.id);
        this.toolbarItems[index] = item;
      }
    },
    getAll: () => {
      return [...this.toolbarItems];
    },
    getByTab: (tab: string) => {
      return this.toolbarItems.filter(item => item.tab === tab);
    }
  };

  public commands = {
    register: (command: EditorCommand) => {
      this.editorCommands.set(command.name, command);
    },
    execute: (editor: Editor, name: string, ...args: any[]) => {
      const command = this.editorCommands.get(name);
      if (command) {
        return command.action(editor, ...args);
      }
      console.warn(`Editor command "${name}" is not registered.`);
      return null;
    },
    getAll: () => {
      return Array.from(this.editorCommands.values());
    }
  };

  public nodes = {
    register: (node: EditorNodeDefinition) => {
      const exists = this.editorNodes.some(n => n.name === node.name);
      if (!exists) {
        this.editorNodes.push(node);
      } else {
        const index = this.editorNodes.findIndex(n => n.name === node.name);
        this.editorNodes[index] = node;
      }
    },
    getAll: () => {
      return [...this.editorNodes];
    }
  };

  public marks = {
    register: (mark: EditorMarkDefinition) => {
      const exists = this.editorMarks.some(m => m.name === mark.name);
      if (!exists) {
        this.editorMarks.push(mark);
      } else {
        const index = this.editorMarks.findIndex(m => m.name === mark.name);
        this.editorMarks[index] = mark;
      }
    },
    getAll: () => {
      return [...this.editorMarks];
    }
  };

  public modals = {
    register: (modal: EditorModalDefinition) => {
      this.editorModals.set(modal.id, modal);
    },
    getAll: () => {
      return Array.from(this.editorModals.values());
    },
    getById: (id: string) => {
      return this.editorModals.get(id);
    }
  };

  public propertyPanels = {
    register: (panel: EditorPropertyPanelDefinition) => {
      this.propertyPanelsMap.set(panel.nodeType, panel);
    },
    getAll: () => {
      return Array.from(this.propertyPanelsMap.values());
    },
    getByNodeType: (nodeType: string) => {
      return this.propertyPanelsMap.get(nodeType);
    }
  };

  public inspectorSections = {
    register: (section: EditorInspectorSectionDefinition) => {
      this.inspectorSectionsMap.set(section.id, section);
    },
    getAll: () => {
      return Array.from(this.inspectorSectionsMap.values())
        .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
    },
    getByMode: (mode: EditorInspectorMode) => {
      return Array.from(this.inspectorSectionsMap.values())
        .filter(section => section.mode === mode)
        .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
    }
  };

  public sidebars = {
    register: (sidebar: EditorSidebarDefinition) => {
      this.sidebarsMap.set(sidebar.id, sidebar);
    },
    getAll: () => {
      return Array.from(this.sidebarsMap.values());
    },
    getById: (id: string) => {
      return this.sidebarsMap.get(id);
    }
  };

  private pickerHandler: EditorMediaPickerHandler | null = null;

  public mediaPicker = {
    register: (handler: EditorMediaPickerHandler) => {
      this.pickerHandler = handler;
    },
    get: () => {
      return this.pickerHandler;
    }
  };

  private editorInsertSources: EditorInsertSource[] = [];

  public insertSources = {
    register: (source: EditorInsertSource) => {
      const exists = this.editorInsertSources.some(s => s.id === source.id);
      if (!exists) {
        this.editorInsertSources.push(source);
      } else {
        const index = this.editorInsertSources.findIndex(s => s.id === source.id);
        this.editorInsertSources[index] = source;
      }
    },
    getAll: () => {
      return [...this.editorInsertSources];
    }
  };
}

export const editorRegistry = new EditorRegistryManager();
export default editorRegistry;
