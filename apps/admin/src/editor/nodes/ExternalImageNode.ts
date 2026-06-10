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

const EXTERNAL_IMAGE_NODE_NAME = 'externalImageNode';

const BLOCKED_EXTERNAL_IMAGE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
]);

export function isAllowedExternalImageUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false;
    }

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');

    if (BLOCKED_EXTERNAL_IMAGE_HOSTS.has(hostname)) {
      return false;
    }

    if (url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/api/media/resolve/')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export const ExternalImageNode = Node.create({
  name: EXTERNAL_IMAGE_NODE_NAME,

  group: 'block',

  atom: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const src = element.getAttribute('src') || '';
          return isAllowedExternalImageUrl(src) ? src : null;
        },
        renderHTML: (attributes: { src?: string }) => {
          if (!attributes.src || !isAllowedExternalImageUrl(attributes.src)) {
            return {};
          }

          return { src: attributes.src };
        },
      },
      alt: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('alt') || '',
        renderHTML: (attributes: { alt?: string }) => {
          return { alt: attributes.alt || '' };
        },
      },
      title: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('title') || '',
        renderHTML: (attributes: { title?: string }) => {
          if (!attributes.title) {
            return {};
          }

          return { title: attributes.title };
        },
      },
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => parseImageWidthAttribute(element),
        renderHTML: (attributes: { width?: number }) => renderImageWidthAttribute(attributes.width),
      },
      alignment: {
        default: 'center',
        parseHTML: (element: HTMLElement) => parseImageAlignmentAttribute(element),
        renderHTML: (attributes: { alignment?: string }) => renderImageAlignmentAttribute(attributes.alignment),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]:not([data-media-uuid])',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) {
            return false;
          }

          const src = element.getAttribute('src') || '';
          return isAllowedExternalImageUrl(src) ? null : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['img', HTMLAttributes];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaNodeView);
  },

  addProseMirrorPlugins() {
    return [createImageNodeSelectionPlugin([EXTERNAL_IMAGE_NODE_NAME])];
  },
});

export default ExternalImageNode;
