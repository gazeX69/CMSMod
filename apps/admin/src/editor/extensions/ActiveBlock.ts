import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const ActiveBlockExtension = Extension.create({
  name: 'activeBlock',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('activeBlock'),
        props: {
          decorations(state) {
            const { selection } = state;
            const $from = selection.$from;
            
            // Resolve the top-level block node (direct child of doc, always at depth 1)
            if ($from.depth >= 1) {
              const node = $from.node(1);
              if (node && node.isBlock) {
                const pos = $from.before(1);
                return DecorationSet.create(state.doc, [
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: 'active-block'
                  })
                ]);
              }
            }
            return null;
          }
        }
      })
    ];
  }
});
