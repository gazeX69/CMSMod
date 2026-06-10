import { createContext, useContext } from 'react';
import { Editor } from '@tiptap/react';
import { EditorRegistry } from '../contracts';
import { EditorRuntime } from './EditorRuntime';

export interface EditorContextState {
  editor: Editor | null;
  registry: EditorRegistry;
  runtime: EditorRuntime;
  metadata: Record<string, any>;
  selectionState: {
    selectedNode: any | null;
    selectedNodePos: number | null;
    selectedBlockNode: any | null;
    selectedBlockPos: number | null;
    activeBlockNode: any | null;
    activeBlockPos: number | null;
    isFocused: boolean;
  };
}

export const EditorContext = createContext<EditorContextState | undefined>(undefined);

export function useEditorContext(): EditorContextState {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
}
