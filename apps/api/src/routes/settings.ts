import type { FastifyInstance } from 'fastify';
import { requirePermission } from '../hooks/permissions.js';
import {
  getPublicSettings,
  getSetting,
  getSettingsByScope,
  setSetting,
} from '../settings/settingsService.js';

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/admin/settings/public', async () => getPublicSettings());

  app.get(
    '/admin/settings/scope/:scope',
    { preHandler: requirePermission('settings.manage') },
    async (request) => {
      const { scope } = request.params as any;
      return getSettingsByScope(scope);
    }
  );

  app.get(
    '/admin/settings/:key',
    { preHandler: requirePermission('settings.manage') },
    async (request, reply) => {
      const { key } = request.params as any;
      const value = await getSetting(key);

      if (value === null) {
        reply.status(404);
        return { error: 'Setting not found' };
      }

      return { key, value };
    }
  );

  app.put(
    '/admin/settings/:key',
    { preHandler: requirePermission('settings.manage') },
    async (request) => {
      const { key } = request.params as any;
      const {
        value,
        description,
        group,
        type,
        isPublic,
      } = request.body as any;

      await setSetting(key, String(value), {
        description,
        group,
        type,
        isPublic,
        source: 'admin-api',
      });

      return { ok: true };
    }
  );
}
