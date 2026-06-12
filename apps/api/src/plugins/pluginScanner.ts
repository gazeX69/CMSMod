import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  PluginManifest,
  PluginPermissionManifest,
  PluginSettingManifest,
  ScannedPlugin,
} from './pluginTypes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pluginsDir = path.resolve(__dirname, '../../../../plugins');

function validateManifest(raw: any): PluginManifest {
  if (!raw || typeof raw !== 'object') {
    throw new Error('plugin.json must be an object');
  }

  if (!raw.id || typeof raw.id !== 'string') {
    throw new Error('plugin.json missing required field: id');
  }

  if (!raw.name || typeof raw.name !== 'string') {
    throw new Error('plugin.json missing required field: name');
  }

  if (!raw.version || typeof raw.version !== 'string') {
    throw new Error('plugin.json missing required field: version');
  }

  if (raw.backend && typeof raw.backend.entry !== 'string') {
    throw new Error('plugin.backend.entry must be a string');
  }

  if (raw.compatibility !== undefined && typeof raw.compatibility !== 'string') {
    throw new Error('plugin.compatibility must be a string');
  }

  if (raw.backend?.namespace && typeof raw.backend.namespace !== 'string') {
    throw new Error('plugin.backend.namespace must be a string');
  }

  if (raw.layer && !['platform', 'plugin', 'application'].includes(raw.layer)) {
    throw new Error('plugin.layer must be platform, plugin, or application');
  }

  if (raw.dependencies && !Array.isArray(raw.dependencies)) {
    throw new Error('plugin.dependencies must be an array');
  }

  if (raw.dependencies?.some((dependency: any) => typeof dependency !== 'string')) {
    const invalid = raw.dependencies.some((dependency: any) => typeof dependency !== 'string' && (!dependency || typeof dependency.id !== 'string'));
    if (invalid) throw new Error('plugin.dependencies must contain plugin ids or { id, version } objects');
  }

  if (raw.package) {
    if (!['plugin', 'theme', 'integration', 'sdk-extension'].includes(raw.package.type)) throw new Error('plugin.package.type is invalid');
    if (!raw.package.publisher?.id || !raw.package.publisher?.name) throw new Error('plugin.package.publisher requires id and name');
  }

  if (raw.runtime?.entry && typeof raw.runtime.entry !== 'string') throw new Error('plugin.runtime.entry must be a string');

  if (raw.admin) {
    if (!raw.admin.menu || typeof raw.admin.menu !== 'string') {
      throw new Error('plugin.admin.menu must be a string');
    }

    if (!raw.admin.route || typeof raw.admin.route !== 'string') {
      throw new Error('plugin.admin.route must be a string');
    }

    if (!raw.admin.bundle || typeof raw.admin.bundle !== 'string') {
      throw new Error('plugin.admin.bundle must be a string');
    }
  }

  if (raw.permissions) {
    if (!Array.isArray(raw.permissions)) {
      throw new Error('plugin.permissions must be an array');
    }

    for (const permission of raw.permissions as Array<string | PluginPermissionManifest>) {
      if (typeof permission === 'string') continue;
      if (!permission || typeof permission !== 'object' || typeof permission.key !== 'string') {
        throw new Error('plugin.permissions entries must be strings or { key } objects');
      }
    }
  }

  if (raw.settings) {
    if (!Array.isArray(raw.settings)) {
      throw new Error('plugin.settings must be an array');
    }

    for (const setting of raw.settings as PluginSettingManifest[]) {
      if (!setting || typeof setting !== 'object') {
        throw new Error('plugin.settings entries must be objects');
      }

      if (typeof setting.key !== 'string' || setting.key.length === 0) {
        throw new Error('plugin.settings entries require key');
      }

      if (typeof setting.defaultValue !== 'string') {
        throw new Error('plugin.settings entries require string defaultValue');
      }
    }
  }

  if (raw.events) {
    const eventGroups = [raw.events.emits, raw.events.listens].filter(Boolean);
    for (const group of eventGroups) {
      if (!Array.isArray(group)) {
        throw new Error('plugin.events.emits/listens must be arrays');
      }

      for (const event of group) {
        if (!event || typeof event !== 'object' || typeof event.name !== 'string') {
          throw new Error('plugin event entries require name');
        }
      }
    }
  }

  if (raw.storage) {
    if (!raw.storage.root || typeof raw.storage.root !== 'string') {
      throw new Error('plugin.storage.root must be a string');
    }
  }

  if (raw.migrations) {
    if (!raw.migrations.directory || typeof raw.migrations.directory !== 'string') {
      throw new Error('plugin.migrations.directory must be a string');
    }
  }

  return raw as PluginManifest;
}

export function scanPlugins(): ScannedPlugin[] {
  if (!fs.existsSync(pluginsDir)) {
    return [];
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  const scanned: ScannedPlugin[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const pluginPath = path.join(pluginsDir, entry.name);
    const manifestPath = path.join(pluginPath, 'plugin.json');

    if (!fs.existsSync(manifestPath)) {
      scanned.push({
        key: entry.name,
        pluginPath,
        manifestPath,
        manifest: null,
        status: 'BROKEN',
        error: 'plugin.json not found',
      });
      continue;
    }

    try {
      const rawManifest = fs.readFileSync(manifestPath, 'utf-8');
      const parsed = JSON.parse(rawManifest);
      const manifest = validateManifest(parsed);
      if (manifest.admin?.bundle) {
        const bundlePath = path.resolve(pluginPath, manifest.admin.bundle);
        if (bundlePath !== pluginPath && !bundlePath.startsWith(`${pluginPath}${path.sep}`)) throw new Error('plugin.admin.bundle resolves outside plugin root');
        if (!fs.existsSync(bundlePath)) throw new Error(`plugin.admin.bundle not found: ${manifest.admin.bundle}`);
      }
      if (manifest.runtime?.entry) {
        const runtimePath = path.resolve(pluginPath, manifest.runtime.entry);
        if (runtimePath !== pluginPath && !runtimePath.startsWith(`${pluginPath}${path.sep}`)) throw new Error('plugin.runtime.entry resolves outside plugin root');
        if (!fs.existsSync(runtimePath)) throw new Error(`plugin.runtime.entry not found: ${manifest.runtime.entry}`);
      }

      scanned.push({
        key: manifest.id,
        pluginPath,
        manifestPath,
        manifest,
        status: 'DISCOVERED',
      });
    } catch (error: any) {
      scanned.push({
        key: entry.name,
        pluginPath,
        manifestPath,
        manifest: null,
        status: 'BROKEN',
        error: error.message || 'Invalid plugin.json',
      });
    }
  }

  return scanned;
}
