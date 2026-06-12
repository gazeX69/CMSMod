import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const manager = read('./src/pages/ContentManager.tsx');
const sdk = read('../../packages/plugin-sdk/src/index.ts');
const integration = read('../../plugins/media-library/editor/registerEditorIntegration.ts');
const node = read('../../plugins/media-library/editor/UniversalMediaNode.tsx');
const routes = read('../../plugins/media-library/server/routes.ts');
const fallback = read('./src/editor/nodes/OpaquePluginBlock.tsx');

const checks = [
  [sdk.includes('editorNode?:') && sdk.includes('propertyPanel:'), 'Plugin SDK must expose generic editor node insertion and property panels.'],
  [manager.includes('insertPluginNodeAtSavedRange') && manager.includes('result.editorNode'), 'ContentManager must insert plugin-defined nodes generically.'],
  [integration.includes('sdk.editor.node.register') && integration.includes('sdk.editor.propertyPanel.register'), 'Media Library must own its editor node and inspector.'],
  [node.includes("kind === 'video'") && node.includes("kind === 'audio'") && node.includes("kind === 'pdf'"), 'Universal Media node must render video, audio, and PDF.'],
  [node.includes("tag: 'cms-media[data-media-uuid]'") && node.includes("return ['cms-media'"), 'Universal Media serialization must round-trip through cms-media.'],
  [node.includes("'data-plugin-block': 'media-library'") && node.includes('priority: 1000'), 'Universal Media must identify its owner and take precedence over the core fallback.'],
  [fallback.includes("tag: '[data-plugin-block]'") && fallback.includes('storedAttributes'), 'Core must preserve plugin blocks while their owner is disabled.'],
  [routes.includes("registerContentFilter('render-media-blocks'") && routes.includes('renderPublicMediaBlock'), 'Media Library must render media blocks publicly.'],
  [routes.includes("request.headers.range") && routes.includes("Content-Range") && routes.includes("Accept-Ranges"), 'Media resolver must support byte ranges.'],
  [routes.includes("Content-Disposition") && routes.includes("download === '1'"), 'Media resolver must support safe downloads.'],
  [routes.includes("images,documents,audio,video"), 'Audio and video must be enabled in the default media groups.'],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);
if (failures.length) {
  console.error(`Universal Media checks failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Universal Media integration checks passed.');
