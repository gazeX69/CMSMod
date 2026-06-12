import { Node, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';

type StoredAttributes = Record<string, string>;

export const OpaquePluginBlock = Node.create({
  name: 'opaquePluginBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  priority: 10,
  addAttributes() {
    return {
      tagName: { default: 'cms-block', rendered: false },
      plugin: { default: '', rendered: false },
      storedAttributes: { default: {}, rendered: false },
    };
  },
  parseHTML() {
    return [{
      tag: '[data-plugin-block]',
      getAttrs: (element) => {
        const node = element as HTMLElement;
        const storedAttributes: StoredAttributes = {};
        Array.from(node.attributes).forEach((attribute) => {
          if (attribute.name.startsWith('data-')) {
            storedAttributes[attribute.name] = attribute.value;
          }
        });
        return {
          tagName: node.tagName.toLowerCase(),
          plugin: node.getAttribute('data-plugin-block') || '',
          storedAttributes,
        };
      },
    }];
  },
  renderHTML({ node }) {
    const tagName = /^cms-[a-z0-9-]+$/.test(node.attrs.tagName)
      ? node.attrs.tagName
      : 'cms-block';
    return [tagName, node.attrs.storedAttributes || {}];
  },
  addNodeView() {
    return ReactNodeViewRenderer(OpaquePluginBlockView);
  },
});

function OpaquePluginBlockView({ node, selected }: any) {
  const pluginName = node.attrs.plugin || 'unknown plugin';
  return (
    <NodeViewWrapper
      className={`opaque-plugin-block${selected ? ' is-selected' : ''}`}
      data-plugin={pluginName}
      contentEditable={false}
      draggable
    >
      <strong>Plugin content preserved</strong>
      <span>Activate {pluginName} to edit or preview this block.</span>
    </NodeViewWrapper>
  );
}
