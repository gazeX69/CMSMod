import React from 'react';
import type { AdminRuntimeSdk } from '@modern-cms/plugin-sdk';
import MediaPicker from '../admin/MediaPicker';
import { UNIVERSAL_MEDIA_NODE, UniversalMediaNode, UniversalMediaPropertyPanel } from './UniversalMediaNode';

export function registerEditorIntegration(sdk: AdminRuntimeSdk) {
  sdk.editor.node.register({ name: UNIVERSAL_MEDIA_NODE, extension: UniversalMediaNode });
  sdk.editor.propertyPanel.register({ nodeType: UNIVERSAL_MEDIA_NODE, component: UniversalMediaPropertyPanel });
  sdk.editor.command.register({
    name: 'media-library:insert',
    action: (editor: any, attrs: Record<string, unknown>) => editor.chain().focus().insertContent([
      { type: UNIVERSAL_MEDIA_NODE, attrs },
      { type: 'paragraph' },
    ]).run(),
  });
  sdk.capabilities.registerProvider('media.picker', {
    render: (props: any) => React.createElement(MediaPicker, {
      apiFetch: props.apiFetch,
      options: props.options,
      onSelect: props.onSelect,
      onCancel: props.onCancel,
    }),
  });
  sdk.editor.insertSource.register({
    id: 'media-library',
    label: 'Media Library',
    icon: 'image',
    preferredWidth: 900,
    render: (props: any) => React.createElement(MediaPicker, {
      apiFetch: props.apiFetch,
      options: props.options,
      onSelect: props.onSelect,
      onCancel: props.onCancel,
    }),
  });
}
