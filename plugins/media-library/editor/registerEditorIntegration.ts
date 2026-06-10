import React from 'react';
import { editorRegistry } from '../../../apps/admin/src/editor/registry/editorRegistry';
import MediaPicker from '../admin/MediaPicker';
import { EditorInsertSourceRenderProps } from '../../../apps/admin/src/editor/contracts';

// 1. Register the Media Picker Handler
editorRegistry.mediaPicker.register(async () => {
  return {
    uuid: '00000000-0000-0000-0000-000000000001',
    alt: 'Media Library Demo',
    caption: 'Plugin Bridge Test'
  };
});

// 2. Register as a dynamic Insert Source
editorRegistry.insertSources.register({
  id: 'media-library',
  pluginId: 'media-library',
  label: 'Media Library',
  icon: 'image',
  preferredWidth: 900,
  render: (props: EditorInsertSourceRenderProps) => {
    return React.createElement(MediaPicker, {
      apiFetch: props.apiFetch,
      onSelect: props.onSelect,
      onCancel: props.onCancel
    });
  },
  pick: async () => {
    const picker = editorRegistry.mediaPicker.get();
    if (!picker) return null;

    try {
      const result = await picker();
      if (result) {
        return {
          uuid: result.uuid,
          alt: result.alt || '',
          caption: result.caption || ''
        };
      }
    } catch (err) {
      // Fail-safe ignore
    }
    return null;
  }
});
