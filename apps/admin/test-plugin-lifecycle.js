import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const registry = read('./src/plugins/registry.ts');
const runtime = read('./src/plugins/adminRuntimeSdk.ts');
const app = read('./src/app/App.tsx');
const manager = read('./src/pages/ContentManager.tsx');
const seoIntegration = read('../../plugins/seo-suite/admin/registerEditorIntegration.ts');

const checks = [
  [registry.includes("plugin.status === 'ACTIVE'") && registry.includes('syncAdminPlugins(availablePlugins'), 'Admin runtime must register only active plugins.'],
  [!registry.includes('registerAdminPlugins(pluginRegistry)'), 'Admin registry must not eagerly register every discovered plugin.'],
  [runtime.includes('class AdminPluginRuntimeScope') && runtime.includes('scope.dispose()'), 'Admin plugins must own a disposable runtime scope.'],
  [runtime.includes('createAdminRuntimeSdk(plugin.id, scope.own)'), 'Every SDK registration must be captured by its plugin scope.'],
  [app.includes('syncAdminPluginRuntime(pluginsList)') && app.includes('setPluginRuntimeVersion'), 'Admin UI must reconcile and rerender after plugin lifecycle changes.'],
  [seoIntegration.includes('sdk.editor.inspector.register') && seoIntegration.includes('registerSupplementalSave') && seoIntegration.includes('registerCheck'), 'SEO Suite contributions must use lifecycle-aware SDK contracts.'],
  [!manager.includes('SEO Search Snippet') && !manager.includes("tab === 'seo'") && !manager.includes("'history', 'seo'"), 'Core editor must not own SEO Suite UI.'],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);
if (failures.length) {
  console.error(`Admin plugin lifecycle checks failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('Admin plugin lifecycle checks passed.');
