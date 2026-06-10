import { FastifyInstance } from 'fastify';
import { db } from '../database/client.js';
import { contents, contentCategories, contentTags, categories, tags } from '../database/schema.js';
import { eq, and, isNull, ne } from 'drizzle-orm';
import { requirePermission } from '../hooks/permissions.js';
import { createRevisionSnapshot } from '../utils/revisions.js';
import { pluginEventBus } from '../plugins/pluginEventBus.js';

export async function postsRoutes(app: FastifyInstance) {
  const requireContentRead = requirePermission('content.read');
  const requireContentCreate = requirePermission('content.create');
  const requireContentUpdate = requirePermission('content.update');
  const requireContentPublish = requirePermission('content.publish');
  const requireContentDelete = requirePermission('content.delete');

  // GET /api/posts/slug-check
  app.get('/posts/slug-check', { preHandler: requireContentRead }, async (request, reply) => {
    const { slug, excludeId } = request.query as any;
    if (!slug) {
      reply.status(400);
      return { error: 'Slug is required' };
    }

    try {
      let queryCondition = and(eq(contents.type, 'article'), eq(contents.slug, slug), isNull(contents.deletedAt));
      if (excludeId) {
        queryCondition = and(queryCondition, ne(contents.id, parseInt(excludeId, 10)));
      }

      const existing = await db.select().from(contents).where(queryCondition).limit(1);

      if (existing.length === 0) {
        return { available: true, suggestedSlug: slug };
      }

      // Loop to find available suggested slug
      let suffix = 2;
      let suggestedSlug = `${slug}-${suffix}`;
      while (true) {
        let suggestCondition = and(eq(contents.type, 'article'), eq(contents.slug, suggestedSlug), isNull(contents.deletedAt));
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

  // GET /api/posts
  app.get('/posts', { preHandler: requireContentRead }, async (request, reply) => {
    try {
      const allPosts = await db
        .select()
        .from(contents)
        .where(and(eq(contents.type, 'article'), isNull(contents.deletedAt)));
      
      // Populate categories and tags for each post
      const populatedPosts = [];
      for (const post of allPosts) {
        // Fetch categories
        const cats = await db
          .select({ id: categories.id, name: categories.name })
          .from(contentCategories)
          .innerJoin(categories, eq(contentCategories.categoryId, categories.id))
          .where(eq(contentCategories.contentId, post.id));
        
        // Fetch tags
        const tg = await db
          .select({ id: tags.id, name: tags.name })
          .from(contentTags)
          .innerJoin(tags, eq(contentTags.tagId, tags.id))
          .where(eq(contentTags.contentId, post.id));

        populatedPosts.push({
          ...post,
          categories: cats,
          tags: tg,
        });
      }

      return populatedPosts;
    } catch (error) {
      app.log.error(error, 'Error fetching posts');
      reply.status(500);
      return { error: 'Failed to retrieve posts' };
    }
  });

  // GET /api/posts/:id
  app.get('/posts/:id', { preHandler: requireContentRead }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      const post = await db
        .select()
        .from(contents)
        .where(and(eq(contents.id, parseInt(id, 10)), eq(contents.type, 'article'), isNull(contents.deletedAt)))
        .limit(1);

      if (post.length === 0) {
        reply.status(404);
        return { error: 'Article not found' };
      }

      const article = post[0];

      // Fetch categories
      const cats = await db
        .select({ id: categories.id, name: categories.name })
        .from(contentCategories)
        .innerJoin(categories, eq(contentCategories.categoryId, categories.id))
        .where(eq(contentCategories.contentId, article.id));
      
      // Fetch tags
      const tg = await db
        .select({ id: tags.id, name: tags.name })
        .from(contentTags)
        .innerJoin(tags, eq(contentTags.tagId, tags.id))
        .where(eq(contentTags.contentId, article.id));

      return {
        ...article,
        categoryIds: cats.map(c => c.id),
        tagIds: tg.map(t => t.id),
        categories: cats,
        tags: tg,
      };
    } catch (error) {
      app.log.error(error, 'Error fetching post');
      reply.status(500);
      return { error: 'Failed to retrieve post' };
    }
  });

  // POST /api/posts (Protected)
  app.post('/posts', { preHandler: requireContentCreate }, async (request, reply) => {
    const body = request.body as any;
    if (!body || !body.title || !body.slug) {
      reply.status(400);
      return { error: 'Title and Slug are required' };
    }

    try {
      // Check slug uniqueness
      const existing = await db
        .select()
        .from(contents)
        .where(and(eq(contents.type, 'article'), eq(contents.slug, body.slug), isNull(contents.deletedAt)))
        .limit(1);

      if (existing.length > 0) {
        reply.status(409);
        return { error: 'Article with this slug already exists' };
      }

      const userId = request.user!.id;
      const status = body.status || 'draft';
      const publishedAt = status === 'published' ? new Date() : null;

      const [result] = await db.insert(contents).values({
        title: body.title,
        slug: body.slug,
        type: 'article',
        status,
        authorId: userId,
        excerpt: body.excerpt || null,
        body: body.body || null,
        publishedAt,
      });

      const contentId = (result as any).insertId;

      // Handle categories relation
      if (body.categoryIds && Array.isArray(body.categoryIds) && body.categoryIds.length > 0) {
        const catValues = body.categoryIds.map((catId: number) => ({
          contentId,
          categoryId: catId,
        }));
        await db.insert(contentCategories).values(catValues);
      }

      // Handle tags relation
      if (body.tagIds && Array.isArray(body.tagIds) && body.tagIds.length > 0) {
        const tagValues = body.tagIds.map((tId: number) => ({
          contentId,
          tagId: tId,
        }));
        await db.insert(contentTags).values(tagValues);
      }

      // Create revision snapshot
      await createRevisionSnapshot(contentId, userId);
      await pluginEventBus.emit('content.created', {
        contentId,
        type: 'article',
        status,
        authorId: userId,
      }, 'content-engine');

      return {
        ok: true,
        article: {
          id: contentId,
          type: 'article',
          title: body.title,
          slug: body.slug,
          status,
        },
      };
    } catch (error) {
      app.log.error(error, 'Error creating post');
      reply.status(500);
      return { error: 'Failed to create article' };
    }
  });

  // PUT /api/posts/:id (Protected)
  app.put('/posts/:id', { preHandler: requireContentUpdate }, async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;

    if (!body || !body.title || !body.slug) {
      reply.status(400);
      return { error: 'Title and Slug are required' };
    }

    try {
      const postId = parseInt(id, 10);
      const existingPost = await db
        .select()
        .from(contents)
        .where(and(eq(contents.id, postId), eq(contents.type, 'article'), isNull(contents.deletedAt)))
        .limit(1);

      if (existingPost.length === 0) {
        reply.status(404);
        return { error: 'Article not found' };
      }

      // Check slug collision
      const collision = await db
        .select()
        .from(contents)
        .where(and(eq(contents.type, 'article'), eq(contents.slug, body.slug), ne(contents.id, postId), isNull(contents.deletedAt)))
        .limit(1);

      if (collision.length > 0) {
        reply.status(409);
        return { error: 'Article with this slug already exists' };
      }

      const userId = request.user!.id;
      const oldStatus = existingPost[0].status;
      const newStatus = body.status || oldStatus;
      let publishedAt = existingPost[0].publishedAt;
      if (newStatus === 'published' && oldStatus !== 'published') {
        publishedAt = new Date();
      }

      // Update content record
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
        .where(eq(contents.id, postId));

      // Sync categories (delete old, insert new)
      await db.delete(contentCategories).where(eq(contentCategories.contentId, postId));
      if (body.categoryIds && Array.isArray(body.categoryIds) && body.categoryIds.length > 0) {
        const catValues = body.categoryIds.map((catId: number) => ({
          contentId: postId,
          categoryId: catId,
        }));
        await db.insert(contentCategories).values(catValues);
      }

      // Sync tags (delete old, insert new)
      await db.delete(contentTags).where(eq(contentTags.contentId, postId));
      if (body.tagIds && Array.isArray(body.tagIds) && body.tagIds.length > 0) {
        const tagValues = body.tagIds.map((tId: number) => ({
          contentId: postId,
          tagId: tId,
        }));
        await db.insert(contentTags).values(tagValues);
      }

      // Create revision snapshot
      await createRevisionSnapshot(postId, userId);
      await pluginEventBus.emit('content.updated', {
        contentId: postId,
        type: 'article',
        status: newStatus,
        authorId: userId,
      }, 'content-engine');

      return { ok: true };
    } catch (error) {
      app.log.error(error, 'Error updating post');
      reply.status(500);
      return { error: 'Failed to update article' };
    }
  });

  // POST /api/posts/:id/publish (Protected)
  app.post('/posts/:id/publish', { preHandler: requireContentPublish }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      const postId = parseInt(id, 10);
      const existing = await db
        .select()
        .from(contents)
        .where(and(eq(contents.id, postId), eq(contents.type, 'article'), isNull(contents.deletedAt)))
        .limit(1);

      if (existing.length === 0) {
        reply.status(404);
        return { error: 'Article not found' };
      }

      const post = existing[0];
      if (!post.title || !post.slug || !post.body) {
        reply.status(400);
        return { error: 'Title, Slug, and Body are required to publish this article' };
      }

      const userId = request.user!.id;
      const publishedAt = post.publishedAt || new Date();

      await db
        .update(contents)
        .set({
          status: 'published',
          publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(contents.id, postId));

      // Create revision snapshot
      await createRevisionSnapshot(postId, userId);
      await pluginEventBus.emit('content.published', {
        contentId: postId,
        type: 'article',
        authorId: userId,
      }, 'content-engine');

      return { ok: true };
    } catch (error) {
      app.log.error(error, 'Error publishing post');
      reply.status(500);
      return { error: 'Failed to publish article' };
    }
  });

  // DELETE /api/posts/:id (Protected)
  app.delete('/posts/:id', { preHandler: requireContentDelete }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      const postId = parseInt(id, 10);
      const existing = await db
        .select()
        .from(contents)
        .where(and(eq(contents.id, postId), eq(contents.type, 'article'), isNull(contents.deletedAt)))
        .limit(1);

      if (existing.length === 0) {
        reply.status(404);
        return { error: 'Article not found' };
      }

      await db.update(contents).set({ deletedAt: new Date() }).where(eq(contents.id, postId));
      await pluginEventBus.emit('content.deleted', {
        contentId: postId,
        type: 'article',
        authorId: request.user!.id,
      }, 'content-engine');
      return { ok: true };
    } catch (error) {
      app.log.error(error, 'Error deleting post');
      reply.status(500);
      return { error: 'Failed to delete article' };
    }
  });
}
