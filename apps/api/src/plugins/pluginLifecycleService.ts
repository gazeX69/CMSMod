import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { eq, sql } from 'drizzle-orm';
import { db } from '../database/client.js';
import {
  pluginEvents,
  pluginMigrations,
  pluginPermissions,
  packageVersions,
  plugins,
  settings,
} from '../database/schema.js';
import { pluginsDir, scanPlugins } from './pluginScanner.js';
import type { PluginManifest, PluginStatus, ScannedPlugin } from './pluginTypes.js';
import {
  assignAllPermissionsToRole,
  registerPermission,
} from '../permissions/permissionService.js';
import { pluginEventBus } from './pluginEventBus.js';

const dataPreservingStatuses: PluginStatus[] = ['DISCOVERED', 'INSTALLED', 'ACTIVE', 'INACTIVE', 'BROKEN'];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageBaseDir = path.resolve(__dirname, '../../../../storage');

function normalizeStatus(status: string | null | undefined): PluginStatus {
  switch ((status || '').toUpperCase()) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'INACTIVE':
      return 'INACTIVE';
    case 'BROKEN':
      return 'BROKEN';
    case 'MISSING':
      return 'BROKEN';
    case 'INSTALLING':
      return 'INSTALLING';
    case 'INSTALLED':
      return 'INSTALLED';
    case 'UNINSTALLED':
      return 'UNINSTALLED';
    case 'DISCOVERED':
    default:
      return 'DISCOVERED';
  }
}

function findScannedPlugin(key: string): ScannedPlugin | null {
  return scanPlugins().find((plugin) => plugin.key === key) || null;
}

function getPluginStorageRoot(manifest: PluginManifest) {
  const storageRoot = manifest.storage?.root || `plugins/${manifest.id}`;
  return path.resolve(storageBaseDir, storageRoot);
}

function assertPathInside(basePath: string, targetPath: string) {
  const base = path.resolve(basePath);
  const target = path.resolve(targetPath);

  if (target !== base && !target.startsWith(`${base}${path.sep}`)) {
    throw new Error(`Unsafe plugin path: ${target}`);
  }
}

async function getPluginRecord(key: string) {
  const rows = await db.select().from(plugins).where(eq(plugins.key, key)).limit(1);
  return rows[0] || null;
}

async function setPluginStatus(key: string, status: PluginStatus, extra: Record<string, unknown> = {}) {
  await db
    .update(plugins)
    .set({
      ...extra,
      status,
      updatedAt: new Date(),
    })
    .where(eq(plugins.key, key));
}

async function registerManifestContracts(manifest: PluginManifest) {
  await db.delete(pluginPermissions).where(eq(pluginPermissions.pluginKey, manifest.id));
  await db.delete(pluginEvents).where(eq(pluginEvents.pluginKey, manifest.id));

  const permissions = manifest.permissions || [];
  if (permissions.length > 0) {
    for (const permission of permissions) {
      await registerPermission({
        key: typeof permission === 'string' ? permission : permission.key,
        description: typeof permission === 'string' ? null : permission.description || null,
        source: 'plugin',
        pluginKey: manifest.id,
      });
    }

    await assignAllPermissionsToRole('Admin');

    await db.insert(pluginPermissions).values(
      permissions.map((permission) => {
        if (typeof permission === 'string') {
          return {
            pluginKey: manifest.id,
            permissionKey: permission,
            description: null,
          };
        }

        return {
          pluginKey: manifest.id,
          permissionKey: permission.key,
          description: permission.description || null,
        };
      })
    );
  }

  const eventsToRegister = [
    ...(manifest.events?.emits || []).map((event) => ({ ...event, direction: 'emit' })),
    ...(manifest.events?.listens || []).map((event) => ({ ...event, direction: 'listen' })),
  ];

  if (eventsToRegister.length > 0) {
    await db.insert(pluginEvents).values(
      eventsToRegister.map((event) => ({
        pluginKey: manifest.id,
        eventName: event.name,
        direction: event.direction,
        description: event.description || null,
      }))
    );
  }

  for (const setting of manifest.settings || []) {
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, setting.key))
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(settings).values({
      key: setting.key,
      value: setting.defaultValue,
      description: setting.description || null,
      group: manifest.id,
      type: setting.type || 'string',
      isPublic: setting.isPublic ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

async function runPluginMigrations(scanned: ScannedPlugin) {
  const manifest = scanned.manifest;
  if (!manifest?.migrations?.directory) return [];

  const migrationDir = path.resolve(scanned.pluginPath, manifest.migrations.directory);
  assertPathInside(scanned.pluginPath, migrationDir);

  if (!fs.existsSync(migrationDir)) return [];

  const migrationFiles = fs
    .readdirSync(migrationDir)
    .filter((file) => file.endsWith('.sql') && !file.endsWith('.down.sql'))
    .sort();
  const applied: string[] = [];

  for (const migrationFile of migrationFiles) {
    const migrationPath = path.join(migrationDir, migrationFile);
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    const checksum = crypto.createHash('sha256').update(migrationSql).digest('hex');

    const existing = await db
      .select()
      .from(pluginMigrations)
      .where(eq(pluginMigrations.pluginKey, manifest.id))
      .limit(1000);

    const existingMigration = existing.find((row) => row.migration === migrationFile);
    if (existingMigration) {
      if (existingMigration.checksum !== checksum) throw new Error(`Applied migration checksum changed: ${migrationFile}`);
      continue;
    }

    const statements = migrationSql
      .split('--> statement-breakpoint')
      .flatMap((chunk) => chunk.split(/;\s*(?:\r?\n|$)/))
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await db.execute(sql.raw(statement));
    }

    await db.insert(pluginMigrations).values({
      pluginKey: manifest.id,
      migration: migrationFile,
      checksum,
      appliedAt: new Date(),
    });
    applied.push(migrationFile);
  }
  return applied;
}

async function rollbackPluginMigrations(scanned: ScannedPlugin, migrations: string[]) {
  const manifest = scanned.manifest;
  if (!manifest?.migrations?.directory) return;
  const migrationDir = path.resolve(scanned.pluginPath, manifest.migrations.directory);
  assertPathInside(scanned.pluginPath, migrationDir);
  for (const migration of [...migrations].reverse()) {
    const downPath = path.join(migrationDir, migration.replace(/\.sql$/, '.down.sql'));
    if (!fs.existsSync(downPath)) throw new Error(`Rollback migration missing: ${path.basename(downPath)}`);
    const statements = fs.readFileSync(downPath, 'utf8')
      .split('--> statement-breakpoint')
      .flatMap((chunk) => chunk.split(/;\s*(?:\r?\n|$)/))
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) await db.execute(sql.raw(statement));
    await db.delete(pluginMigrations).where(sql`${pluginMigrations.pluginKey} = ${manifest.id} AND ${pluginMigrations.migration} = ${migration}`);
  }
}

export async function rollbackPluginMigrationsNotInPackage(key: string, retainedMigrations: string[]) {
  const scanned = findScannedPlugin(key);
  if (!scanned?.manifest) throw new Error('Current plugin package is unavailable for rollback');
  const existing = await db.select().from(pluginMigrations).where(eq(pluginMigrations.pluginKey, key)).limit(1000);
  const retained = new Set(retainedMigrations);
  const toRollback = existing.map((row) => row.migration).filter((migration) => !retained.has(migration));
  await rollbackPluginMigrations(scanned, toRollback);
  return toRollback;
}

export async function migratePlugin(key: string) {
  await syncPluginsFromDisk();

  const scanned = findScannedPlugin(key);
  if (!scanned?.manifest) {
    throw new Error('Plugin manifest is missing or invalid');
  }

  await runPluginMigrations(scanned);
  await pluginEventBus.emit('plugin.migrated', { pluginKey: key }, 'plugin-migration');

  return { ok: true, pluginKey: key };
}

async function ensurePluginStorage(manifest: PluginManifest) {
  const storageRoot = getPluginStorageRoot(manifest);
  assertPathInside(storageBaseDir, storageRoot);
  fs.mkdirSync(storageRoot, { recursive: true });
}

export async function syncPluginsFromDisk() {
  const scannedPlugins = scanPlugins();
  const dbPlugins = await db.select().from(plugins);
  const scannedKeys = new Set(scannedPlugins.map((plugin) => plugin.key));

  for (const scanned of scannedPlugins) {
    const existing = dbPlugins.find((plugin) => plugin.key === scanned.key);

    if (!scanned.manifest) {
      if (existing) {
        await setPluginStatus(scanned.key, 'BROKEN', {
          description: scanned.error || existing.description,
        });
      } else {
        await db.insert(plugins).values({
          key: scanned.key,
          name: scanned.key,
          version: 'unknown',
          type: 'first-party-plugin',
          description: scanned.error || 'Broken plugin',
          manifestJson: null,
          status: 'BROKEN',
          installedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      continue;
    }

    const manifest = scanned.manifest;
    const manifestJson = JSON.stringify(manifest);

    if (!existing) {
      await db.insert(plugins).values({
        key: manifest.id,
        name: manifest.name,
        version: manifest.version,
        type: 'first-party-plugin',
        description: manifest.description || null,
        manifestJson,
        status: 'DISCOVERED',
        installedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      continue;
    }

    const normalizedStatus = normalizeStatus(existing.status);
    const nextStatus = normalizedStatus === 'BROKEN' ? 'DISCOVERED' : normalizedStatus;

    await db
      .update(plugins)
      .set({
        name: manifest.name,
        version: manifest.version,
        description: manifest.description || null,
        manifestJson,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(plugins.key, manifest.id));

    if (['INSTALLED', 'ACTIVE', 'INACTIVE'].includes(nextStatus)) {
      await registerManifestContracts(manifest);
    }
  }

  for (const dbPlugin of dbPlugins) {
    if (!scannedKeys.has(dbPlugin.key) && dataPreservingStatuses.includes(normalizeStatus(dbPlugin.status))) {
      await setPluginStatus(dbPlugin.key, 'BROKEN', {
        description: dbPlugin.description || 'Plugin directory is missing',
      });
    }
  }

  return getPluginsWithManifest();
}

export async function getPluginsWithManifest() {
  const scannedPlugins = scanPlugins();
  const dbPlugins = await db.select().from(plugins);

  return dbPlugins.map((dbPlugin) => {
    const scanned = scannedPlugins.find((plugin) => plugin.key === dbPlugin.key);

    return {
      ...dbPlugin,
      status: normalizeStatus(dbPlugin.status),
      manifest: scanned?.manifest || (dbPlugin.manifestJson ? JSON.parse(dbPlugin.manifestJson) : null),
      manifestError: scanned?.error || null,
    };
  });
}

export async function installPlugin(key: string) {
  await syncPluginsFromDisk();

  const scanned = findScannedPlugin(key);
  if (!scanned?.manifest) {
    throw new Error('Plugin manifest is missing or invalid');
  }

  const plugin = await getPluginRecord(key);
  if (!plugin) {
    throw new Error('Plugin not found');
  }

  const status = normalizeStatus(plugin.status);
  if (['INSTALLED', 'ACTIVE', 'INACTIVE'].includes(status)) {
    return { ok: true, status };
  }

  await setPluginStatus(key, 'INSTALLING');

  try {
    for (const dependency of scanned.manifest.dependencies || []) {
      const dependencyId = typeof dependency === 'string' ? dependency : dependency.id;
      const dependencyRecord = await getPluginRecord(dependencyId);
      const dependencyStatus = normalizeStatus(dependencyRecord?.status);

      if (!dependencyRecord || !['INSTALLED', 'ACTIVE', 'INACTIVE'].includes(dependencyStatus)) {
        if (typeof dependency !== 'object' || !dependency.optional) throw new Error(`Missing installed dependency: ${dependencyId}`);
      }
    }

    await runPluginMigrations(scanned);
    await ensurePluginStorage(scanned.manifest);
    await registerManifestContracts(scanned.manifest);

    await setPluginStatus(key, 'INSTALLED', {
      installedAt: new Date(),
      manifestJson: JSON.stringify(scanned.manifest),
    });
    await pluginEventBus.emit('plugin.installed', { pluginKey: key }, 'plugin-lifecycle');

    return { ok: true, status: 'INSTALLED' as PluginStatus };
  } catch (error) {
    await setPluginStatus(key, 'BROKEN', {
      description: error instanceof Error ? error.message : 'Plugin installation failed',
    });
    throw error;
  }
}

export async function applyPluginPackageVersion(key: string) {
  await syncPluginsFromDisk();
  const scanned = findScannedPlugin(key);
  if (!scanned?.manifest) throw new Error('Plugin manifest is missing or invalid');
  const previous = await getPluginRecord(key);
  const previousStatus = normalizeStatus(previous?.status);
  let applied: string[] = [];
  try {
    applied = await runPluginMigrations(scanned);
    await ensurePluginStorage(scanned.manifest);
    await registerManifestContracts(scanned.manifest);
    const status: PluginStatus = previousStatus === 'ACTIVE' ? 'ACTIVE' : 'INSTALLED';
    await setPluginStatus(key, status, {
      version: scanned.manifest.version,
      name: scanned.manifest.name,
      description: scanned.manifest.description || null,
      manifestJson: JSON.stringify(scanned.manifest),
      installedAt: previous?.installedAt || new Date(),
    });
    return { status, appliedMigrations: applied };
  } catch (error) {
    if (applied.length > 0) await rollbackPluginMigrations(scanned, applied);
    throw error;
  }
}

export async function activatePlugin(key: string, app?: any) {
  const plugin = await getPluginRecord(key);
  if (!plugin) throw new Error('Plugin not found');

  let status = normalizeStatus(plugin.status);
  if (status === 'DISCOVERED' || status === 'UNINSTALLED') {
    await installPlugin(key);
    status = 'INSTALLED';
  }

  if (!['INSTALLED', 'INACTIVE', 'ACTIVE'].includes(status)) {
    throw new Error(`Plugin cannot be activated from status ${status}`);
  }

  await setPluginStatus(key, 'ACTIVE', { activatedAt: new Date() });
  await pluginEventBus.emit('plugin.activated', { pluginKey: key }, 'plugin-lifecycle');

  if (app) {
    const { loadPluginRuntime } = await import('./pluginRuntimeLoader.js');
    await loadPluginRuntime(app, key);
  }

  return { ok: true, status: 'ACTIVE' as PluginStatus };
}

export async function deactivatePlugin(key: string) {
  const plugin = await getPluginRecord(key);
  if (!plugin) throw new Error('Plugin not found');

  const status = normalizeStatus(plugin.status);
  if (status !== 'ACTIVE') {
    return { ok: true, status };
  }

  await setPluginStatus(key, 'INACTIVE', { deactivatedAt: new Date() });
  await pluginEventBus.emit('plugin.deactivated', { pluginKey: key }, 'plugin-lifecycle');

  try {
    const { unloadPluginRuntime } = await import('./pluginRuntimeLoader.js');
    unloadPluginRuntime(key);
  } catch (err) {
    // Ignore error if registry fails to update
  }

  return { ok: true, status: 'INACTIVE' as PluginStatus };
}

export async function uninstallPlugin(key: string, mode: 'plugin-only' | 'full-clean' = 'plugin-only') {
  const plugin = await getPluginRecord(key);
  if (!plugin) throw new Error('Plugin not found');
  const dependents = (await getPluginsWithManifest()).filter((candidate) =>
    candidate.key !== key
    && ['INSTALLED', 'ACTIVE', 'INACTIVE'].includes(candidate.status)
    && (candidate.manifest?.dependencies || []).some((dependency: any) => (typeof dependency === 'string' ? dependency : dependency.id) === key)
  );
  if (dependents.length > 0) throw new Error(`Plugin is required by: ${dependents.map((item) => item.key).join(', ')}`);

  try {
    const { resetPluginRuntime } = await import('./pluginRuntimeLoader.js');
    resetPluginRuntime(key);
  } catch {
    // Continue cleanup when no runtime was loaded.
  }

  const scanned = findScannedPlugin(key);
  const manifest = scanned?.manifest || (plugin.manifestJson ? JSON.parse(plugin.manifestJson) : null);

  await db.delete(pluginPermissions).where(eq(pluginPermissions.pluginKey, key));
  await db.delete(pluginEvents).where(eq(pluginEvents.pluginKey, key));

  if (mode === 'full-clean') {
    if (scanned?.manifest) {
      const applied = await db.select().from(pluginMigrations).where(eq(pluginMigrations.pluginKey, key)).limit(1000);
      await rollbackPluginMigrations(scanned, applied.map((row) => row.migration));
    }
    await db.delete(settings).where(eq(settings.group, key));
    await db.delete(pluginMigrations).where(eq(pluginMigrations.pluginKey, key));

    if (manifest?.storage) {
      const storageRoot = getPluginStorageRoot(manifest);
      assertPathInside(storageBaseDir, storageRoot);
      fs.rmSync(storageRoot, { recursive: true, force: true });
    }
  }


  const managedVersions = await db.select().from(packageVersions).where(eq(packageVersions.packageId, key)).limit(1);
  if (managedVersions.length > 0) {
    const pluginPath = path.resolve(pluginsDir, key);
    assertPathInside(pluginsDir, pluginPath);
    fs.rmSync(pluginPath, { recursive: true, force: true });
  }

  await setPluginStatus(key, 'UNINSTALLED', {
    deactivatedAt: new Date(),
  });
  await pluginEventBus.emit('plugin.uninstalled', { pluginKey: key, mode }, 'plugin-lifecycle');

  return { ok: true, status: 'UNINSTALLED' as PluginStatus, mode };
}

export async function requirePluginActive(pluginKey: string) {
  const rows = await db.select().from(plugins).where(eq(plugins.key, pluginKey)).limit(1);
  return rows.length > 0 && normalizeStatus(rows[0].status) === 'ACTIVE';
}
