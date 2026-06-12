import { getSetting, setSetting } from '../settings/settingsService.js';
import { pluginEventBus } from '../plugins/pluginEventBus.js';
import { refreshRegistry, getRegisteredThemes, getThemeById } from './themeRegistry.js';

export async function discoverThemes() {
  await refreshRegistry();
  return getRegisteredThemes();
}

export async function activateTheme(themeId: string) {
  const theme = getThemeById(themeId);
  if (!theme) throw new Error(`Theme not found: ${themeId}`);
  if (theme.status === 'broken') throw new Error(`Cannot activate broken theme: ${themeId}`);
  
  await setSetting('theme.active', themeId, {
    group: 'theme',
    type: 'string',
    isPublic: true,
    description: 'Active public theme id',
  });
  
  await refreshRegistry();
  await pluginEventBus.emit('theme.activated', { themeId }, 'theme-engine');
  
  return { success: true, activeThemeId: themeId };
}

export async function deactivateTheme() {
  throw new Error("Deactivation is not allowed. A theme must always be active. To switch themes, please activate a different theme.");
}

export async function listThemes() {
  return getRegisteredThemes();
}

export async function getThemeDetail(id: string) {
  return getThemeById(id);
}

export async function getActiveThemeId() {
  return (await getSetting('theme.active', 'default')) || 'default';
}
