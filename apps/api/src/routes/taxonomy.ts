import { FastifyInstance } from 'fastify';
import { db } from '../database/client.js';
import { categories, tags, contentCategories, contentTags } from '../database/schema.js';
import { eq, sql } from 'drizzle-orm';
import { requirePermission } from '../hooks/permissions.js';

export async function taxonomyRoutes(app: FastifyInstance) {
  const requireContentRead = requirePermission('content.read');
  const requireContentUpdate = requirePermission('content.update');
  const requireContentDelete = requirePermission('content.delete');

  // GET /api/categories
  app.get('/categories', { preHandler: requireContentRead }, async (request, reply) => {
    try {
      const allCategories = await db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          parentId: categories.parentId,
          sortOrder: categories.sortOrder,
          postCount: sql<number>`cast(count(${contentCategories.contentId}) as unsigned)`
        })
        .from(categories)
        .leftJoin(contentCategories, eq(categories.id, contentCategories.categoryId))
        .groupBy(categories.id)
        .orderBy(categories.sortOrder);

      return allCategories;
    } catch (error) {
      app.log.error(error, 'Error fetching categories');
      reply.status(500);
      return { error: 'Failed to retrieve categories' };
    }
  });

  // POST /api/categories (Protected)
  app.post('/categories', { preHandler: requireContentUpdate }, async (request, reply) => {
    const body = request.body as any;
    if (!body || !body.name || !body.slug) {
      reply.status(400);
      return { error: 'Name and Slug are required' };
    }

    try {
      const existing = await db.select().from(categories).where(eq(categories.slug, body.slug)).limit(1);
      if (existing.length > 0) {
        reply.status(409);
        return { error: 'Category slug already exists' };
      }

      const [result] = await db.insert(categories).values({
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        parentId: body.parentId || null,
        sortOrder: body.sortOrder || 0,
      });

      const insertedId = (result as any).insertId;
      return { ok: true, id: insertedId };
    } catch (error) {
      app.log.error(error, 'Error creating category');
      reply.status(500);
      return { error: 'Failed to create category' };
    }
  });

  // PUT /api/categories/:id (Protected)
  app.put('/categories/:id', { preHandler: requireContentUpdate }, async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;

    if (!body || !body.name || !body.slug) {
      reply.status(400);
      return { error: 'Name and Slug are required' };
    }

    try {
      const catId = parseInt(id, 10);
      const existing = await db.select().from(categories).where(eq(categories.id, catId)).limit(1);
      if (existing.length === 0) {
        reply.status(404);
        return { error: 'Category not found' };
      }

      // Check slug collision
      const collision = await db
        .select()
        .from(categories)
        .where(sql`${categories.slug} = ${body.slug} AND ${categories.id} != ${catId}`)
        .limit(1);

      if (collision.length > 0) {
        reply.status(409);
        return { error: 'Category slug already exists' };
      }

      await db
        .update(categories)
        .set({
          name: body.name,
          slug: body.slug,
          description: body.description || null,
          parentId: body.parentId || null,
          sortOrder: body.sortOrder || 0,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, catId));

      return { ok: true };
    } catch (error) {
      app.log.error(error, 'Error updating category');
      reply.status(500);
      return { error: 'Failed to update category' };
    }
  });

  // DELETE /api/categories/:id (Protected)
  app.delete('/categories/:id', { preHandler: requireContentDelete }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      const catId = parseInt(id, 10);
      const existing = await db.select().from(categories).where(eq(categories.id, catId)).limit(1);
      if (existing.length === 0) {
        reply.status(404);
        return { error: 'Category not found' };
      }

      await db.delete(categories).where(eq(categories.id, catId));
      return { ok: true };
    } catch (error) {
      app.log.error(error, 'Error deleting category');
      reply.status(500);
      return { error: 'Failed to delete category' };
    }
  });

  // GET /api/tags
  app.get('/tags', { preHandler: requireContentRead }, async (request, reply) => {
    try {
      const allTags = await db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          description: tags.description,
          postCount: sql<number>`cast(count(${contentTags.contentId}) as unsigned)`
        })
        .from(tags)
        .leftJoin(contentTags, eq(tags.id, contentTags.tagId))
        .groupBy(tags.id);

      return allTags;
    } catch (error) {
      app.log.error(error, 'Error fetching tags');
      reply.status(500);
      return { error: 'Failed to retrieve tags' };
    }
  });

  // POST /api/tags (Protected)
  app.post('/tags', { preHandler: requireContentUpdate }, async (request, reply) => {
    const body = request.body as any;
    if (!body || !body.name || !body.slug) {
      reply.status(400);
      return { error: 'Name and Slug are required' };
    }

    try {
      const existing = await db.select().from(tags).where(eq(tags.slug, body.slug)).limit(1);
      if (existing.length > 0) {
        reply.status(409);
        return { error: 'Tag slug already exists' };
      }

      const [result] = await db.insert(tags).values({
        name: body.name,
        slug: body.slug,
        description: body.description || null,
      });

      const insertedId = (result as any).insertId;
      return { ok: true, id: insertedId };
    } catch (error) {
      app.log.error(error, 'Error creating tag');
      reply.status(500);
      return { error: 'Failed to create tag' };
    }
  });

  // PUT /api/tags/:id (Protected)
  app.put('/tags/:id', { preHandler: requireContentUpdate }, async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;

    if (!body || !body.name || !body.slug) {
      reply.status(400);
      return { error: 'Name and Slug are required' };
    }

    try {
      const tagId = parseInt(id, 10);
      const existing = await db.select().from(tags).where(eq(tags.id, tagId)).limit(1);
      if (existing.length === 0) {
        reply.status(404);
        return { error: 'Tag not found' };
      }

      // Check slug collision
      const collision = await db
        .select()
        .from(tags)
        .where(sql`${tags.slug} = ${body.slug} AND ${tags.id} != ${tagId}`)
        .limit(1);

      if (collision.length > 0) {
        reply.status(409);
        return { error: 'Tag slug already exists' };
      }

      await db
        .update(tags)
        .set({
          name: body.name,
          slug: body.slug,
          description: body.description || null,
          updatedAt: new Date(),
        })
        .where(eq(tags.id, tagId));

      return { ok: true };
    } catch (error) {
      app.log.error(error, 'Error updating tag');
      reply.status(500);
      return { error: 'Failed to update tag' };
    }
  });

  // DELETE /api/tags/:id (Protected)
  app.delete('/tags/:id', { preHandler: requireContentDelete }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      const tagId = parseInt(id, 10);
      const existing = await db.select().from(tags).where(eq(tags.id, tagId)).limit(1);
      if (existing.length === 0) {
        reply.status(404);
        return { error: 'Tag not found' };
      }

      await db.delete(tags).where(eq(tags.id, tagId));
      return { ok: true };
    } catch (error) {
      app.log.error(error, 'Error deleting tag');
      reply.status(500);
      return { error: 'Failed to delete tag' };
    }
  });
}
