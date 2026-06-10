import type { PluginManifest } from './pluginTypes.js';

export function validatePluginManifest(raw: any): PluginManifest {
  if (!raw || typeof raw !== 'object') {
    throw new Error('plugin.json must be an object');
  }

  if (!raw.id || typeof raw.id !== 'string') {
    throw new Error('plugin.id is required');
  }

  if (!raw.name || typeof raw.name !== 'string') {
    throw new Error('plugin.name is required');
  }

  if (!raw.version || typeof raw.version !== 'string') {
    throw new Error('plugin.version is required');
  }

  if (!raw.backend?.entry || typeof raw.backend.entry !== 'string') {
    throw new Error('plugin.backend.entry is required');
  }

  if (raw.admin) {
    if (!raw.admin.menu || typeof raw.admin.menu !== 'string') {
      throw new Error('plugin.admin.menu is required');
    }

    if (!raw.admin.route || typeof raw.admin.route !== 'string') {
      throw new Error('plugin.admin.route is required');
    }

    if (!raw.admin.bundle || typeof raw.admin.bundle !== 'string') {
      throw new Error('plugin.admin.bundle is required');
    }
  }

  return raw as PluginManifest;
}