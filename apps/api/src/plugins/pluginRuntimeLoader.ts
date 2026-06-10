import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../database/client.js';
import * as schema from '../database/schema.js';
import { requireAuth } from '../hooks/auth.js';
import { pluginEventBus } from './pluginEventBus.js';
import {
  getPluginsWithManifest,
  requirePluginActive,
} from './pluginLifecycleService.js';
import { pluginsDir } from './pluginScanner.js';
import type { PluginManifest } from './pluginTypes.js';
import { createSettingsSdk } from '../settings/settingsService.js';
import { userHasPermission } from '../permissions/permissionService.js';

function resolveBackendEntry(pluginPath: string, manifest: PluginManifest) {
  const entry = manifest.backend?.entry;
  if (!entry) return null;

  const declaredPath = path.resolve(pluginPath, entry);
  const candidates = [
    declaredPath.replace(/\.ts$/, '.js').replace(`${path.sep}server${path.sep}`, `${path.sep}dist${path.sep}`),
    declaredPath,
    path.resolve(pluginPath, 'dist/routes.js'),
    path.resolve(pluginPath, 'server/routes.js'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function createPluginSdk(pluginKey: string) {
  return {
    events: {
      on: pluginEventBus.on.bind(pluginEventBus),
      emit: (eventName: string, payload: unknown) => pluginEventBus.emit(eventName, payload, pluginKey),
    },
    settings: createSettingsSdk(pluginKey),
    permissions: {
      can: (userId: number, permissionKey: string) => userHasPermission(userId, permissionKey),
    },
    requireActive: async (request: FastifyRequest, reply: FastifyReply) => {
      const isActive = await requirePluginActive(pluginKey);
      if (!isActive) {
        reply.status(403).send({ ok: false, error: `Plugin ${pluginKey} is inactive or unavailable` });
      }
    },
  };
}

export async function loadActivePluginRuntimes(app: FastifyInstance) {
  const plugins = await getPluginsWithManifest();

  for (const plugin of plugins) {
    if (plugin.status !== 'ACTIVE' || !plugin.manifest?.backend?.entry) continue;

    const manifest = plugin.manifest as PluginManifest;
    const backendEntryDeclaration = manifest.backend?.entry;
    if (!backendEntryDeclaration) continue;

    const pluginPath = path.join(pluginsDir, plugin.key);
    const backendEntry = resolveBackendEntry(pluginPath, manifest);

    if (!backendEntry) {
      await db
        .update(schema.plugins)
        .set({
          status: 'BROKEN',
          description: `Backend entry not found: ${backendEntryDeclaration}`,
          updatedAt: new Date(),
        })
        .where(eq(schema.plugins.key, plugin.key));
      continue;
    }

    try {
      const pluginModule = await import(pathToFileURL(backendEntry).href);
      const registerFn = pluginModule.default || pluginModule.routes;

      if (typeof registerFn !== 'function') {
        throw new Error(`Backend entry does not export a route registration function: ${backendEntry}`);
      }

      await app.register(registerFn, {
        prefix: '/api',
        db,
        schema,
        requireAuth,
        plugin: {
          key: plugin.key,
          manifest,
        },
        sdk: createPluginSdk(plugin.key),
      });

      app.log.info(`Loaded plugin runtime: ${plugin.key}`);
    } catch (error) {
      app.log.error(error, `Failed to load plugin runtime: ${plugin.key}`);
      await db
        .update(schema.plugins)
        .set({
          status: 'BROKEN',
          description: error instanceof Error ? error.message : 'Plugin runtime failed to load',
          updatedAt: new Date(),
        })
        .where(eq(schema.plugins.key, plugin.key));
    }
  }
}
