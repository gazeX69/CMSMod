import type { AdminPlugin } from '@modern-cms/plugin-sdk';

import MediaLibraryPlugin from '../../../../plugins/media-library/admin/plugin';

export const pluginRegistry: AdminPlugin[] = [
  MediaLibraryPlugin
];