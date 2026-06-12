import { FastifyInstance } from 'fastify';
import { db } from '../database/client.js';
import { navigationItems } from '../database/schema.js';
import { eq } from 'drizzle-orm';
import { requirePermission } from '../hooks/permissions.js';

export async function navigationRoutes(app: FastifyInstance) {
  const requireSettingsManage = requirePermission('settings.manage');

  // GET /admin/navigation/locations - List all menu locations
  app.get('/admin/navigation/locations', { preHandler: requireSettingsManage }, async (request, reply) => {
    try {
      const results = await db
        .select({ location: navigationItems.location })
        .from(navigationItems)
        .groupBy(navigationItems.location);
      
      const locations = results.map(r => r.location);
      if (!locations.includes('primary')) locations.push('primary');
      if (!locations.includes('footer')) locations.push('footer');
      
      return locations;
    } catch (error) {
      app.log.error(error, 'Error fetching navigation locations');
      reply.status(500);
      return { error: 'Failed to retrieve menu locations' };
    }
  });

  // GET /admin/navigation/:location - Get all items for a specific location
  app.get('/admin/navigation/:location', { preHandler: requireSettingsManage }, async (request, reply) => {
    const { location } = request.params as any;
    try {
      const items = await db
        .select()
        .from(navigationItems)
        .where(eq(navigationItems.location, location))
        .orderBy(navigationItems.sortOrder);
      
      return items;
    } catch (error) {
      app.log.error(error, `Error fetching navigation items for location ${location}`);
      reply.status(500);
      return { error: 'Failed to retrieve navigation items' };
    }
  });

  // PUT /admin/navigation/:location - Bulk update all navigation items for a location
  app.put('/admin/navigation/:location', { preHandler: requireSettingsManage }, async (request, reply) => {
    const { location } = request.params as any;
    const body = request.body as any;

    if (!body || !Array.isArray(body)) {
      reply.status(400);
      return { error: 'Request body must be an array of navigation items' };
    }

    try {
      await db.transaction(async (tx) => {
        // 1. Clear parentId references first to avoid foreign key delete constraints
        await tx.update(navigationItems).set({ parentId: null }).where(eq(navigationItems.location, location));

        // 2. Delete all existing items for this location
        await tx.delete(navigationItems).where(eq(navigationItems.location, location));

        if (body.length === 0) return;

        // Map to keep track of tempId (client) -> database insertedId
        const idMap = new Map<any, number>();

        // 2. Hierarchical insertion resolver
        let remaining = [...body];
        let loopLimit = 10; // safety ceiling to prevent infinite loops

        while (remaining.length > 0 && loopLimit > 0) {
          const toInsertThisPass: any[] = [];
          const deferred: any[] = [];

          for (const item of remaining) {
            // Insert if it has no parent, or if parent's real ID has already been resolved in this transaction
            if (!item.parentTempId || idMap.has(item.parentTempId)) {
              toInsertThisPass.push(item);
            } else {
              deferred.push(item);
            }
          }

          // If no items can be resolved this pass (e.g. due to circular references or broken parentTempId),
          // fallback to inserting the remaining items as top-level to prevent data loss.
          if (toInsertThisPass.length === 0) {
            toInsertThisPass.push(...deferred);
            deferred.length = 0;
          }

          for (const item of toInsertThisPass) {
            const parentId = item.parentTempId ? idMap.get(item.parentTempId) : null;
            const [insertResult] = await tx.insert(navigationItems).values({
              label: String(item.label || ''),
              url: String(item.url || '/'),
              target: String(item.target || '_self'),
              parentId: parentId || null,
              sortOrder: Number(item.sortOrder || 0),
              location: String(location),
              isActive: item.isActive !== false,
            });
            const insertedId = (insertResult as any).insertId;
            if (item.tempId !== undefined) {
              idMap.set(item.tempId, insertedId);
            }
          }

          remaining = deferred;
          loopLimit--;
        }
      });

      return { success: true };
    } catch (error) {
      app.log.error(error, `Error updating navigation for location ${location}`);
      reply.status(500);
      return { error: 'Failed to update navigation menu' };
    }
  });
}
