import { AdminPlugin } from '@modern-cms/plugin-sdk';
import React from 'react';
import MediaLibraryPage from './MediaLibraryPage';
import '../editor/registerEditorIntegration';

const MediaIcon = ({ size = 14, className }: { size?: number; className?: string }) => 
  React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className
    },
    React.createElement('rect', { width: '18', height: '18', x: '3', y: '3', rx: '2', ry: '2' }),
    React.createElement('circle', { cx: '9', cy: '9', r: '2' }),
    React.createElement('path', { d: 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' })
  );

const MediaLibraryPlugin: AdminPlugin = {
  id: 'media-library',
  icon: MediaIcon,
  component: MediaLibraryPage
};

export default MediaLibraryPlugin;