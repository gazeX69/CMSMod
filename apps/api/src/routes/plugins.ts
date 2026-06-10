import { FastifyInstance } from 'fastify';
import { db } from '../database/client.js';
import { plugins } from '../database/schema.js';
import { eq } from 'drizzle-orm';
import { requirePermission } from '../hooks/permissions.js';

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
      return await activatePlugin(key);
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
        : await activatePlugin(key);

      return result;
    } catch (error) {
      app.log.error(error, 'Error toggling plugin');
      reply.status(500);
      return { error: 'Failed to toggle plugin status' };
    }
  });
}
