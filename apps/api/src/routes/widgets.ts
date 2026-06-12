import { FastifyInstance } from 'fastify';
import { requirePermission } from '../hooks/permissions.js';
import {
  getWidgetsForTheme,
  createWidget,
  updateWidget,
  deleteWidget,
} from '../widgets/widgetService.js';
import { getActiveThemeId } from '../themes/themeService.js';

export async function widgetsRoutes(app: FastifyInstance) {
  const requireThemesManage = requirePermission('themes.manage');

  // GET /api/widgets - Get all widgets for a theme (or active theme if not specified)
  app.get('/widgets', { preHandler: requireThemesManage }, async (request, reply) => {
    const query = request.query as any;
    try {
      const themeId = query.themeId || (await getActiveThemeId());
      if (!themeId) {
        return [];
      }
      const widgetsList = await getWidgetsForTheme(themeId);
      
      // Parse settings JSON for easier frontend consumption
      const formatted = widgetsList.map(w => {
        let settings = {};
        if (w.settingsJson) {
          try {
            settings = JSON.parse(w.settingsJson);
          } catch {
            // Ignore
          }
        }
        return {
          id: w.id,
          themeId: w.themeId,
          region: w.region,
          type: w.type,
          title: w.title,
          settings,
          sortOrder: w.sortOrder,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
        };
      });

      return formatted;
    } catch (error) {
      app.log.error(error, 'Error fetching widgets');
      reply.status(500);
      return { error: 'Failed to retrieve widgets' };
    }
  });

  // POST /api/widgets - Add new widget
  app.post('/widgets', { preHandler: requireThemesManage }, async (request, reply) => {
    const { themeId, region, type, title, settings = {}, sortOrder = 0 } = request.body as any;

    if (!themeId || !region || !type || title === undefined) {
      reply.status(400);
      return { error: 'themeId, region, type, and title are required fields' };
    }

    try {
      const insertedId = await createWidget({
        themeId,
        region,
        type,
        title,
        settings,
        sortOrder,
      });

      return { success: true, id: insertedId };
    } catch (error) {
      app.log.error(error, 'Error creating widget');
      reply.status(500);
      return { error: 'Failed to create widget' };
    }
  });

  // PUT /api/widgets/:id - Update widget
  app.put('/widgets/:id', { preHandler: requireThemesManage }, async (request, reply) => {
    const { id } = request.params as any;
    const { title, region, settings, sortOrder } = request.body as any;

    try {
      const widgetId = parseInt(id, 10);
      if (isNaN(widgetId)) {
        reply.status(400);
        return { error: 'Invalid widget ID' };
      }

      await updateWidget(widgetId, {
        title,
        region,
        settings,
        sortOrder,
      });

      return { success: true };
    } catch (error) {
      app.log.error(error, 'Error updating widget');
      reply.status(500);
      return { error: 'Failed to update widget' };
    }
  });

  // DELETE /api/widgets/:id - Delete widget
  app.delete('/widgets/:id', { preHandler: requireThemesManage }, async (request, reply) => {
    const { id } = request.params as any;

    try {
      const widgetId = parseInt(id, 10);
      if (isNaN(widgetId)) {
        reply.status(400);
        return { error: 'Invalid widget ID' };
      }

      await deleteWidget(widgetId);
      return { success: true };
    } catch (error) {
      app.log.error(error, 'Error deleting widget');
      reply.status(500);
      return { error: 'Failed to delete widget' };
    }
  });
}
