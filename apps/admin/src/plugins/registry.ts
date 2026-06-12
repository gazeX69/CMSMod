import type { AdminPlugin } from '@modern-cms/plugin-sdk';
import { syncAdminPlugins } from './adminRuntimeSdk';

const manifests = import.meta.glob('../../../../plugins/*/plugin.json', { eager: true, import: 'default' }) as Record<string, { id: string; admin?: { bundle: string } }>;
const modules = import.meta.glob('../../../../plugins/*/admin/*.{ts,tsx}', { eager: true }) as Record<string, { default?: AdminPlugin }>;

const bundledPlugins: AdminPlugin[] = Object.entries(manifests)
  .map(([manifestPath, manifest]) => {
    if (!manifest.admin?.bundle) return undefined;
    const pluginRoot = manifestPath.replace(/\/plugin\.json$/, '');
    return modules[`${pluginRoot}/${manifest.admin.bundle}`]?.default;
  })
  .filter((plugin): plugin is AdminPlugin => Boolean(plugin));

export const pluginRegistry: AdminPlugin[] = [...bundledPlugins];
const bundledPluginIds = new Set(bundledPlugins.map((plugin) => plugin.id));
const distributedPlugins = new Map<string, AdminPlugin>();

async function hydrateDistributedPlugins(pluginRecords: Array<any>) {
  const activeDistributed = new Set(
    pluginRecords
      .filter((plugin) => plugin.status === 'ACTIVE' && plugin.manifest?.admin?.runtime === 'distributed')
      .map((plugin) => plugin.key as string)
  );

  for (const pluginId of distributedPlugins.keys()) {
    if (!activeDistributed.has(pluginId)) distributedPlugins.delete(pluginId);
  }

  for (const record of pluginRecords) {
    if (!activeDistributed.has(record.key) || distributedPlugins.has(record.key) || bundledPluginIds.has(record.key)) continue;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';
    const moduleUrl = `${apiUrl}/api/plugin-assets/${encodeURIComponent(record.key)}/admin.js?v=${encodeURIComponent(record.version)}`;
    const loaded = await import(/* @vite-ignore */ moduleUrl) as { default?: AdminPlugin };
    if (!loaded.default || loaded.default.id !== record.key) throw new Error(`Distributed Admin bundle identity mismatch: ${record.key}`);
    distributedPlugins.set(record.key, loaded.default);
  }

  pluginRegistry.splice(0, pluginRegistry.length, ...bundledPlugins, ...distributedPlugins.values());
}

export async function syncAdminPluginRuntime(pluginRecords: Array<{ key: string; status: string; version?: string; manifest?: any }>) {
  await hydrateDistributedPlugins(pluginRecords);
  const availablePlugins = [
    ...pluginRegistry.filter((plugin) => bundledPluginIds.has(plugin.id)),
    ...distributedPlugins.values(),
  ];
  const activePluginIds = pluginRecords
    .filter((plugin) => plugin.status === 'ACTIVE')
    .map((plugin) => plugin.key);
  return syncAdminPlugins(availablePlugins, activePluginIds);
}
