import React, { createContext, useContext } from 'react';
import { EditorRegistry } from '../contracts';
import { editorRegistry } from '../registry/editorRegistry';

interface EditorRegistryContextState {
  registry: EditorRegistry;
}

const EditorRegistryContext = createContext<EditorRegistryContextState>({
  registry: editorRegistry
});

export const useEditorRegistry = () => useContext(EditorRegistryContext);

interface EditorRegistryProviderProps {
  children: React.ReactNode;
  registry?: EditorRegistry;
}

export const EditorRegistryProvider: React.FC<EditorRegistryProviderProps> = ({
  children,
  registry = editorRegistry
}) => {
  return (
    <EditorRegistryContext.Provider value={{ registry }}>
      {children}
    </EditorRegistryContext.Provider>
  );
};
export default EditorRegistryProvider;
