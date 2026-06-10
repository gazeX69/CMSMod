import { Node } from '@tiptap/react';
import { ReactNodeViewRenderer } from '@tiptap/react';
import MediaNodeView from './MediaNodeView';
import {
  createImageNodeSelectionPlugin,
  parseImageAlignmentAttribute,
  parseImageWidthAttribute,
  renderImageAlignmentAttribute,
  renderImageWidthAttribute,
} from './imageNodeSelection';

const MEDIA_NODE_NAME = 'mediaNode';

export const MediaNode = Node.create({
  name: MEDIA_NODE_NAME,

  group: 'block',

  atom: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      uuid: {
        default: null,
        parseHTML: (element: any) => element.getAttribute('data-media-uuid'),
        renderHTML: (attributes: any) => {
          if (!attributes.uuid) {
            return {};
          }
          return { 'data-media-uuid': attributes.uuid };
        },
      },
      alt: {
        default: '',
        parseHTML: (element: any) => element.getAttribute('alt') || element.getAttribute('data-alt') || '',
        renderHTML: (attributes: any) => {
          return { alt: attributes.alt || '' };
        },
      },
      caption: {
        default: '',
        parseHTML: (element: any) => element.getAttribute('data-caption') || '',
        renderHTML: (attributes: any) => {
          if (!attributes.caption) {
            return {};
          }
          return { 'data-caption': attributes.caption };
        },
      },
      mimeType: {
        default: '',
        parseHTML: (element: any) => element.getAttribute('data-mime-type') || '',
        renderHTML: (attributes: any) => {
          if (!attributes.mimeType) {
            return {};
          }
          return { 'data-mime-type': attributes.mimeType };
        },
      },
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => parseImageWidthAttribute(element),
        renderHTML: (attributes: any) => renderImageWidthAttribute(attributes.width),
      },
      alignment: {
        default: 'center',
        parseHTML: (element: HTMLElement) => parseImageAlignmentAttribute(element),
        renderHTML: (attributes: any) => renderImageAlignmentAttribute(attributes.alignment),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-media-uuid]',
      },
      {
        tag: 'media-node[data-media-uuid]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: any) {
    return ['img', HTMLAttributes];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaNodeView);
  },

  addProseMirrorPlugins() {
    return [createImageNodeSelectionPlugin([MEDIA_NODE_NAME])];
  },
});

export default MediaNode;
