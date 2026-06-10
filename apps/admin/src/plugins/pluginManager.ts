import { pluginRegistry } from './registry';
import { PluginMenu, PluginManifest } from '@modern-cms/plugin-sdk';

export const pluginManager = {
  getMenus(activePlugins: any[]): PluginMenu[] {
    const menus: PluginMenu[] = [];

    for (const p of activePlugins) {
      if (p.status !== 'ACTIVE' || !p.manifest?.admin) continue;

      const manifest = p.manifest as PluginManifest;
      const registryMatch = pluginRegistry.find(pr => pr.id === p.key);

      menus.push({
        label: manifest.admin!.menu,
        route: manifest.admin!.route,
        icon: registryMatch?.icon
      });
    }

    return menus;
  },

  resolveRoute(
    route: string,
    activePlugins: any[]
  ) {
    const activeMatch = activePlugins.find(
      p => p.status === 'ACTIVE' && p.manifest?.admin?.route === route
    );

    if (!activeMatch) return null;

    const registryMatch = pluginRegistry.find(pr => pr.id === activeMatch.key);
    return registryMatch || null;
  }
};
