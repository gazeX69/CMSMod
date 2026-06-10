import React from 'react';
import { NodeSelection } from '@tiptap/pm/state';
import { useEditorContext } from '../core/EditorContext';
import { PropertyPanelManager } from './PropertyPanelManager';

export function PropertyPanelHost() {
  const { editor, registry, selectionState } = useEditorContext();
  const manager = React.useMemo(() => new PropertyPanelManager(registry), [registry]);
  const selectedNode = selectionState.selectedNode;
  const selectedNodePos = selectionState.selectedNodePos;
  const panel = manager.resolve(selectedNode);

  if (!editor || !selectedNode || selectedNodePos === null || !panel) {
    return null;
  }

  const PanelComponent = panel.component;
  const nodeType = selectedNode.type.name;

  const updateAttributes = (attrs: Record<string, any>) => {
    editor.commands.command(({ state, tr, dispatch }: any) => {
      const node = state.doc.nodeAt(selectedNodePos);

      if (!node || node.type.name !== nodeType) {
        return false;
      }

      if (dispatch) {
        tr.setNodeMarkup(selectedNodePos, undefined, { ...node.attrs, ...attrs });
        tr.setSelection(NodeSelection.create(tr.doc, selectedNodePos));
        dispatch(tr);
      }

      return true;
    });
  };

  return (
    <div className="editor-card glass property-panel-host" data-property-panel-node-type={nodeType}>
      <PanelComponent editor={editor} node={selectedNode} updateAttributes={updateAttributes} />
    </div>
  );
}
