import React from 'react';
import { Editor } from '@tiptap/react';

export interface EditorMediaPickerResult {
  uuid: string;
  alt?: string;
  caption?: string;
  mimeType?: string;
}

export type EditorMediaPickerHandler = () => Promise<EditorMediaPickerResult | null>;

export interface EditorInsertResult {
  uuid?: string;
  alt?: string;
  caption?: string;
  mimeType?: string;
  url?: string;
}

export interface EditorInsertSourceRenderProps {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  onSelect: (result: EditorInsertResult | null) => void;
  onCancel: () => void;
}

export interface EditorInsertSource {
  id: string;
  pluginId?: string;
  label: string;
  icon?: string;
  preferredWidth?: number;
  render?: React.ComponentType<EditorInsertSourceRenderProps>;
  pick?: () => Promise<EditorInsertResult | null>;
}

export interface EditorToolbarActionContext {
  editor: Editor;
  executeCommand: (name: string, ...args: any[]) => any;
  requestDialog?: (dialog: 'link' | 'image') => void;
}

export interface EditorToolbarSelectOption {
  label: string;
  value: string;
}

export interface EditorToolbarItem {
  id: string;
  tab: 'format' | 'insert' | string;
  group: string;
  order?: number;
  groupLabel?: string;
  groupOrder?: number;
  type?: 'button' | 'select';
  label: string;
  icon: string; // Icon name to resolve or custom rendering
  commandName?: string;
  commandArgs?: any[];
  options?: EditorToolbarSelectOption[];
  getValue?: (editor: Editor) => string;
  action?: (context: EditorToolbarActionContext) => void;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
}

export interface EditorCommand {
  name: string;
  action: (editor: Editor, ...args: any[]) => any;
}

export interface EditorModalDefinition {
  id: string;
  title: string;
  component: React.ComponentType<{
    editor: Editor;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (value: any) => void;
  }>;
}

export interface EditorNodeDefinition {
  name: string;
  extension: any; // ProseMirror/Tiptap Node extension
}

export interface EditorMarkDefinition {
  name: string;
  extension: any; // ProseMirror/Tiptap Mark extension
}

export interface EditorPropertyPanelDefinition {
  nodeType: string;
  component: React.ComponentType<{
    editor: Editor;
    node: any;
    updateAttributes: (attrs: Record<string, any>) => void;
  }>;
}

export type EditorInspectorMode = 'document' | 'block' | 'history' | string;

export interface EditorInspectorSectionDefinition {
  id: string;
  mode: EditorInspectorMode;
  title: string;
  description?: string;
  order?: number;
  component?: React.ComponentType<{
    editor: Editor;
    selectedNode: any | null;
  }>;
}

export interface EditorSidebarDefinition {
  id: string;
  title: string;
  icon: string;
  component: React.ComponentType<{
    editor: Editor;
  }>;
}

export interface EditorRegistry {
  toolbar: {
    register: (item: EditorToolbarItem) => void;
    getAll: () => EditorToolbarItem[];
    getByTab: (tab: string) => EditorToolbarItem[];
  };
  commands: {
    register: (command: EditorCommand) => void;
    execute: (editor: Editor, name: string, ...args: any[]) => any;
    getAll: () => EditorCommand[];
  };
  nodes: {
    register: (node: EditorNodeDefinition) => void;
    getAll: () => EditorNodeDefinition[];
  };
  marks: {
    register: (mark: EditorMarkDefinition) => void;
    getAll: () => EditorMarkDefinition[];
  };
  modals: {
    register: (modal: EditorModalDefinition) => void;
    getAll: () => EditorModalDefinition[];
    getById: (id: string) => EditorModalDefinition | undefined;
  };
  propertyPanels: {
    register: (panel: EditorPropertyPanelDefinition) => void;
    getAll: () => EditorPropertyPanelDefinition[];
    getByNodeType: (nodeType: string) => EditorPropertyPanelDefinition | undefined;
  };
  inspectorSections: {
    register: (section: EditorInspectorSectionDefinition) => void;
    getAll: () => EditorInspectorSectionDefinition[];
    getByMode: (mode: EditorInspectorMode) => EditorInspectorSectionDefinition[];
  };
  sidebars: {
    register: (sidebar: EditorSidebarDefinition) => void;
    getAll: () => EditorSidebarDefinition[];
    getById: (id: string) => EditorSidebarDefinition | undefined;
  };
  mediaPicker: {
    register: (handler: EditorMediaPickerHandler) => void;
    get: () => EditorMediaPickerHandler | null;
  };
  insertSources: {
    register: (source: EditorInsertSource) => void;
    getAll: () => EditorInsertSource[];
  };
}
