import { getSetting } from '../settings/settingsService.js';
import { scanThemes } from './themeScanner.js';
import type { ThemeRegistryEntry } from './themeTypes.js';

let registry: ThemeRegistryEntry[] = [];

export async function initializeRegistry(): Promise<void> {
  const scanned = scanThemes();
  const activeThemeIdSetting = await getSetting('theme.active');
  const activeThemeId = activeThemeIdSetting !== null && activeThemeIdSetting !== undefined ? activeThemeIdSetting : 'default';

  registry = scanned.map(item => {
    if (item.status === 'broken') {
      return {
        id: item.id,
        name: item.id,
        version: '0.0.0',
        status: 'broken',
        path: item.themePath,
        manifest: {
          id: item.id,
          name: item.id,
          version: '0.0.0'
        },
        settingsSchemaPath: null,
        error: item.error || 'Unknown error'
      };
    }

    const manifest = item.manifest!;
    const status = manifest.id === activeThemeId ? 'active' : 'inactive';

    return {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      status,
      path: item.themePath,
      manifest,
      settingsSchemaPath: item.settingsSchemaPath || null,
    };
  });
}

export async function refreshRegistry(): Promise<void> {
  await initializeRegistry();
}

export function getRegisteredThemes(): ThemeRegistryEntry[] {
  return [...registry];
}

export function getThemeById(id: string): ThemeRegistryEntry | null {
  return registry.find(t => t.id === id) || null;
}

export function getActiveTheme(): ThemeRegistryEntry | null {
  return registry.find(t => t.status === 'active') || null;
}
