import React from 'react';
import type { AdminPlugin } from '@modern-cms/plugin-sdk';
import SeoSuitePage from './SeoSuitePage';
import { registerSeoEditorIntegration } from './registerEditorIntegration';

const SeoIcon = ({ size = 18, className }: { size?: number; className?: string }) => React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, className }, React.createElement('circle', { cx: 11, cy: 11, r: 7 }), React.createElement('path', { d: 'm20 20-4-4M8 11h6M11 8v6' }));

const plugin: AdminPlugin = { id: 'seo-suite', icon: SeoIcon, component: SeoSuitePage, register: registerSeoEditorIntegration };
export default plugin;
