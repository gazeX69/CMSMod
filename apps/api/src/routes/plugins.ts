import { FastifyInstance } from 'fastify';
import { db } from '../database/client.js';
import { packageOperations, plugins } from '../database/schema.js';
import { desc, eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { requirePermission } from '../hooks/permissions.js';
import { requireAuth } from '../hooks/auth.js';
import { userHasPermission } from '../permissions/permissionService.js';
import { pluginApiRegistry } from '../plugins/PluginApiRegistry.js';
import { requirePluginActive } from '../plugins/pluginLifecycleService.js';
import { installPackageArchive, rollbackPackageOperation } from '../distribution/PackageDistributionService.js';
import { pluginsDir } from '../plugins/pluginScanner.js';

import {
  activatePlugin,
  deactivatePlugin,
  getPluginsWithManifest,
  installPlugin,
  syncPluginsFromDisk,
  uninstallPlugin,
} from '../plugins/pluginLifecycleService.js';



export async function pluginsRoutes(app: FastifyInstance) {
  const requirePluginsManage = requirePermission('plugins.manage');

  app.get('/plugin-assets/:pluginKey/admin.js', async (request, reply) => {
    const { pluginKey } = request.params as { pluginKey: string };
    if (!(await requirePluginActive(pluginKey))) return reply.status(404).send({ error: 'Plugin asset unavailable' });
    const records = await getPluginsWithManifest();
    const plugin = records.find((item) => item.key === pluginKey);
    if (!plugin?.manifest?.admin || plugin.manifest.admin.runtime !== 'distributed') return reply.status(404).send({ error: 'Distributed Admin bundle not declared' });
    const bundlePath = path.resolve(pluginsDir, pluginKey, plugin.manifest.admin.bundle);
    const pluginRoot = path.resolve(pluginsDir, pluginKey);
    if (!bundlePath.startsWith(`${pluginRoot}${path.sep}`) || !/\.m?js$/i.test(bundlePath) || !fs.existsSync(bundlePath)) return reply.status(404).send({ error: 'Admin bundle unavailable' });
    reply.header('Cache-Control', 'no-store');
    reply.type('text/javascript; charset=utf-8');
    return fs.createReadStream(bundlePath);
  });

  app.post('/admin/packages/upload', { preHandler: requirePluginsManage }, async (request, reply) => {
    const part = await request.file();
    if (!part) return reply.status(400).send({ error: 'Package archive is required' });
    const archive = await part.toBuffer();
    const query = request.query as Record<string, string | undefined>;
    const source = query.source === 'remote' || query.source === 'private' ? query.source : 'local';
    try {
      const result = await installPackageArchive(archive, {
        source,
        allowUnsigned: source === 'local' && query.allowUnsigned === 'true',
        expectedChecksum: request.headers['x-package-sha256'] as string | undefined,
        actorUserId: request.user?.id,
        activate: query.activate === 'true',
        app,
      });
      return result;
    } catch (error) {
      request.log.error(error as Error, 'Package installation failed');
      return reply.status(400).send({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/admin/packages/operations', { preHandler: requirePluginsManage }, async () => {
    return db.select().from(packageOperations).orderBy(desc(packageOperations.startedAt)).limit(100);
  });

  app.post('/admin/packages/operations/:operationId/rollback', { preHandler: requirePluginsManage }, async (request, reply) => {
    try {
      return await rollbackPackageOperation((request.params as { operationId: string }).operationId, request.user?.id, app);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.all('/plugin-runtime/:pluginKey/*', { preHandler: requireAuth }, async (request, reply) => {
    const { pluginKey } = request.params as { pluginKey: string };
    if (!(await requirePluginActive(pluginKey))) return reply.status(403).send({ error: `Plugin ${pluginKey} is inactive` });
    const suffix = `/${(request.params as Record<string, string>)['*'] || ''}`;
    const resolved = pluginApiRegistry.resolve(pluginKey, request.method, suffix);
    if (!resolved) return reply.status(404).send({ error: 'Plugin API route not found' });
    if (resolved.route.permission && (!request.user || !(await userHasPermission(request.user.id, resolved.route.permission)))) {
      return reply.status(403).send({ error: 'Forbidden', permission: resolved.route.permission });
    }
    const response = await resolved.route.handler({
      method: request.method,
      path: suffix,
      query: request.query as Record<string, string | string[]>,
      headers: request.headers as Record<string, string | undefined>,
      params: resolved.params,
      body: request.body,
      user: request.user || null,
    });
    if (response.headers) Object.entries(response.headers).forEach(([key, value]) => reply.header(key, value));
    return reply.status(response.status || 200).send(response.body ?? null);
  });

  app.get(
    '/admin/plugins',
    { preHandler: requirePluginsManage },
    async (request, reply) => {
      try {
        await syncPluginsFromDisk();

        return await getPluginsWithManifest();
      } catch (error) {
        app.log.error(error, 'Error fetching plugins');

        reply.status(500);

        return {
          error: 'Failed to retrieve plugins',
        };
      }
    }
  );

  // GET /api/admin/plugins
  app.post('/admin/plugins/sync', { preHandler: requirePluginsManage }, async (request, reply) => {
    try {
      return await syncPluginsFromDisk();
    } catch (error) {
      app.log.error(error, 'Error syncing plugins');
      reply.status(500);
      return { error: 'Failed to sync plugins' };
    }
  });

  app.post('/admin/plugins/:key/install', { preHandler: requirePluginsManage }, async (request, reply) => {
    const { key } = request.params as any;

    try {
      return await installPlugin(key);
    } catch (error) {
      app.log.error(error, 'Error installing plugin');
      reply.status(400);
      return { error: error instanceof Error ? error.message : 'Failed to install plugin' };
    }
  });

  app.post('/admin/plugins/:key/activate', { preHandler: requirePluginsManage }, async (request, reply) => {
    const { key } = request.params as any;

    try {
      return await activatePlugin(key, app);
    } catch (error) {
      app.log.error(error, 'Error activating plugin');
      reply.status(400);
      return { error: error instanceof Error ? error.message : 'Failed to activate plugin' };
    }
  });

  app.post('/admin/plugins/:key/deactivate', { preHandler: requirePluginsManage }, async (request, reply) => {
    const { key } = request.params as any;

    try {
      return await deactivatePlugin(key);
    } catch (error) {
      app.log.error(error, 'Error deactivating plugin');
      reply.status(400);
      return { error: error instanceof Error ? error.message : 'Failed to deactivate plugin' };
    }
  });

  app.post('/admin/plugins/:key/uninstall', { preHandler: requirePluginsManage }, async (request, reply) => {
    const { key } = request.params as any;
    const { mode = 'plugin-only', confirmFullClean = false } = (request.body || {}) as any;

    if (mode === 'full-clean' && confirmFullClean !== true) {
      reply.status(400);
      return { error: 'Full clean uninstall requires confirmFullClean=true' };
    }

    if (mode !== 'plugin-only' && mode !== 'full-clean') {
      reply.status(400);
      return { error: 'Invalid uninstall mode' };
    }

    try {
      return await uninstallPlugin(key, mode);
    } catch (error) {
      app.log.error(error, 'Error uninstalling plugin');
      reply.status(400);
      return { error: error instanceof Error ? error.message : 'Failed to uninstall plugin' };
    }
  });
  // POST /api/admin/plugins/:key/toggle
  app.post('/admin/plugins/:key/toggle', { preHandler: requirePluginsManage }, async (request, reply) => {
    const { key } = request.params as any;

    try {
      await syncPluginsFromDisk();

      const existing = await db
        .select()
        .from(plugins)
        .where(eq(plugins.key, key))
        .limit(1);

      if (existing.length === 0) {
        reply.status(404);
        return { error: 'Plugin not found' };
      }

      const plugin = existing[0];

      if (plugin.status === 'BROKEN') {
        reply.status(400);
        return { error: 'Cannot toggle: Plugin manifest/runtime is broken' };
      }

      const result = plugin.status === 'ACTIVE'
        ? await deactivatePlugin(key)
        : await activatePlugin(key, app);

      return result;
    } catch (error) {
      app.log.error(error, 'Error toggling plugin');
      reply.status(500);
      return { error: 'Failed to toggle plugin status' };
    }
  });

  // GET /api/admin/plugins/diagnostics
  app.get('/admin/plugins/diagnostics', { preHandler: requirePluginsManage }, async (request, reply) => {
    try {
      const { pluginRuntimeRegistry } = await import('../plugins/pluginRuntimeLoader.js');
      const { getPluginRuntimeScopeDiagnostics } = await import('../plugins/PluginRuntimeScope.js');
      const { pluginEventBus } = await import('../plugins/pluginEventBus.js');
      const { capabilityRegistry } = await import('../plugins/CapabilityRegistry.js');
      const { runtimeCatalogDiagnostics } = await import('../plugins/PluginRuntimeCatalog.js');
      const dbPlugins = await getPluginsWithManifest();

      const diagnostics = dbPlugins.map((plugin) => {
        const runtimeInfo = pluginRuntimeRegistry.get(plugin.key);
        return {
          key: plugin.key,
          name: plugin.name,
          dbStatus: plugin.status,
          runtimeLoaded: runtimeInfo ? runtimeInfo.status : 'not_loaded',
          registeredPrefix: runtimeInfo?.registeredPrefix || null,
          loadedAt: runtimeInfo?.loadedAt || null,
          lastError: runtimeInfo?.error || null,
        };
      });

      return {
        ok: true,
        items: diagnostics,
        runtimeScopes: getPluginRuntimeScopeDiagnostics(),
        eventSubscriptions: pluginEventBus.diagnostics(),
        capabilities: capabilityRegistry.list(),
        runtimeCatalog: runtimeCatalogDiagnostics(),
      };
    } catch (error: any) {
      app.log.error(error, 'Error fetching plugin diagnostics');
      reply.status(500);
      return { error: 'Failed to retrieve plugin diagnostics' };
    }
  });
}
