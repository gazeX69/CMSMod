import { FastifyInstance } from 'fastify';
import { db } from '../database/client.js';
import { contents } from '../database/schema.js';
import { eq, and, isNull, ne } from 'drizzle-orm';
import { requirePermission } from '../hooks/permissions.js';
import { createRevisionSnapshot } from '../utils/revisions.js';
import { pluginEventBus } from '../plugins/pluginEventBus.js';

export async function pagesRoutes(app: FastifyInstance) {
  const requireContentRead = requirePermission('content.read');
  const requireContentCreate = requirePermission('content.create');
  const requireContentUpdate = requirePermission('content.update');
  const requireContentDelete = requirePermission('content.delete');

  // GET /api/pages/slug-check
  app.get('/pages/slug-check', { preHandler: requireContentRead }, async (request, reply) => {
    const { slug, excludeId } = request.query as any;
    if (!slug) {
      reply.status(400);
      return { error: 'Slug is required' };
    }

    try {
      let queryCondition = and(eq(contents.type, 'page'), eq(contents.slug, slug), isNull(contents.deletedAt));
      if (excludeId) {
        queryCondition = and(queryCondition, ne(contents.id, parseInt(excludeId, 10)));
      }

      const existing = await db.select().from(contents).where(queryCondition).limit(1);

      if (existing.length === 0) {
        return { available: true, suggestedSlug: slug };
      }

      // Loop to find an available suggested slug
      let suffix = 2;
      let suggestedSlug = `${slug}-${suffix}`;
      while (true) {
        let suggestCondition = and(eq(contents.type, 'page'), eq(contents.slug, suggestedSlug), isNull(contents.deletedAt));
        if (excludeId) {
          suggestCondition = and(suggestCondition, ne(contents.id, parseInt(excludeId, 10)));
        }
        const check = await db.select().from(contents).where(suggestCondition).limit(1);
        if (check.length === 0) {
          break;
        }
        suffix++;
        suggestedSlug = `${slug}-${suffix}`;
      }

      return { available: false, suggestedSlug };
    } catch (error) {
      app.log.error(error, 'Slug check error');
      reply.status(500);
      return { error: 'Failed to check slug' };
    }
  });

  // GET /api/pages
  app.get('/pages', { preHandler: requireContentRead }, async (request, reply) => {
    try {
      const allPages = await db
        .select()
        .from(contents)
        .where(and(eq(contents.type, 'page'), isNull(contents.deletedAt)));
      return allPages;
    } catch (error) {
      app.log.error(error, 'Error fetching pages');
      reply.status(500);
      return { error: 'Failed to retrieve pages' };
    }
  });

  // GET /api/pages/:id
  app.get('/pages/:id', { preHandler: requireContentRead }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      const page = await db
        .select()
        .from(contents)
        .where(and(eq(contents.id, parseInt(id, 10)), eq(contents.type, 'page'), isNull(contents.deletedAt)))
        .limit(1);

      if (page.length === 0) {
        reply.status(404);
        return { error: 'Page not found' };
      }

      return page[0];
    } catch (error) {
      app.log.error(error, 'Error fetching page');
      reply.status(500);
      return { error: 'Failed to retrieve page' };
    }
  });

  // POST /api/pages (Protected)
  app.post('/pages', { preHandler: requireContentCreate }, async (request, reply) => {
    const body = request.body as any;
    if (!body || !body.title || !body.slug) {
      reply.status(400);
      return { error: 'Title and Slug are required' };
    }

    try {
      // Check slug uniqueness for pages
      const existing = await db
        .select()
        .from(contents)
        .where(and(eq(contents.type, 'page'), eq(contents.slug, body.slug), isNull(contents.deletedAt)))
        .limit(1);

      if (existing.length > 0) {
        reply.status(409);
        return { error: 'Page with this slug already exists' };
      }

      const userId = request.user!.id;
      const status = body.status || 'draft';
      const publishedAt = status === 'published' ? new Date() : null;

      const [result] = await db.insert(contents).values({
        title: body.title,
        slug: body.slug,
        type: 'page',
        status,
        authorId: userId,
        excerpt: body.excerpt || null,
        body: body.body || null,
        publishedAt,
      });

      const insertedId = (result as any).insertId;

      // Create revision snapshot
      await createRevisionSnapshot(insertedId, userId);
      await pluginEventBus.emit('content.created', {
        contentId: insertedId,
        type: 'page',
        status,
        authorId: userId,
      }, 'content-engine');

      return { ok: true, id: insertedId };
    } catch (error) {
      app.log.error(error, 'Error creating page');
      reply.status(500);
      return { error: 'Failed to create page' };
    }
  });

  // PUT /api/pages/:id (Protected)
  app.put('/pages/:id', { preHandler: requireContentUpdate }, async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;

    if (!body || !body.title || !body.slug) {
      reply.status(400);
      return { error: 'Title and Slug are required' };
    }

    try {
      const pageId = parseInt(id, 10);
      const existingPage = await db
        .select()
        .from(contents)
        .where(and(eq(contents.id, pageId), eq(contents.type, 'page'), isNull(contents.deletedAt)))
        .limit(1);

      if (existingPage.length === 0) {
        reply.status(404);
        return { error: 'Page not found' };
      }

      // Check slug collision
      const collision = await db
        .select()
        .from(contents)
        .where(and(eq(contents.type, 'page'), eq(contents.slug, body.slug), ne(contents.id, pageId), isNull(contents.deletedAt)))
        .limit(1);

      if (collision.length > 0) {
        reply.status(409);
        return { error: 'Page with this slug already exists' };
      }

      const userId = request.user!.id;
      const oldStatus = existingPage[0].status;
      const newStatus = body.status || oldStatus;
      let publishedAt = existingPage[0].publishedAt;
      if (newStatus === 'published' && oldStatus !== 'published') {
        publishedAt = new Date();
      }

      await db
        .update(contents)
        .set({
          title: body.title,
          slug: body.slug,
          status: newStatus,
          excerpt: body.excerpt || null,
          body: body.body || null,
          publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(contents.id, pageId));

      // Create revision snapshot
      await createRevisionSnapshot(pageId, userId);
      await pluginEventBus.emit('content.updated', {
        contentId: pageId,
        type: 'page',
        status: newStatus,
        authorId: userId,
      }, 'content-engine');

      return { ok: true };
    } catch (error) {
      app.log.error(error, 'Error updating page');
      reply.status(500);
      return { error: 'Failed to update page' };
    }
  });

  // DELETE /api/pages/:id (Protected)
  app.delete('/pages/:id', { preHandler: requireContentDelete }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      const pageId = parseInt(id, 10);
      const existing = await db
        .select()
        .from(contents)
        .where(and(eq(contents.id, pageId), eq(contents.type, 'page'), isNull(contents.deletedAt)))
        .limit(1);

      if (existing.length === 0) {
        reply.status(404);
        return { error: 'Page not found' };
      }

      await db.update(contents).set({ deletedAt: new Date() }).where(eq(contents.id, pageId));
      await pluginEventBus.emit('content.deleted', {
        contentId: pageId,
        type: 'page',
        authorId: request.user!.id,
      }, 'content-engine');
      return { ok: true };
    } catch (error) {
      app.log.error(error, 'Error deleting page');
      reply.status(500);
      return { error: 'Failed to delete page' };
    }
  });
}
