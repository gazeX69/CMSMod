import type { FastifyInstance } from 'fastify';
import {
  findPublicContentBySlug,
  findPublicHomeContent,
  getPublicNavigation,
  listPublicContent,
  publicContentResponse,
  renderPublicRoute,
  searchPublicContent,
} from '../public/publicWebsiteService.js';

export async function publicRoutes(app: FastifyInstance) {
  app.get('/public/content/home', async () => {
    const content = await findPublicHomeContent();
    return publicContentResponse(content);
  });

  app.get('/public/content/by-slug/:slug', async (request) => {
    const { slug } = request.params as any;
    const content = await findPublicContentBySlug(slug);
    return publicContentResponse(content);
  });

  app.get('/public/content', async (request) => {
    const { type, limit = '20', offset = '0' } = request.query as any;
    const data = await listPublicContent(type, Number(limit), Number(offset));
    return {
      success: true,
      data,
    };
  });

  app.get('/public/navigation/:location', async (request) => {
    const { location } = request.params as any;
    return {
      success: true,
      data: await getPublicNavigation(location),
    };
  });

  app.get('/public/search', async (request) => {
    const { q = '' } = request.query as any;
    const data = await searchPublicContent(String(q));
    return {
      success: true,
      data: data.map((item) => ({
        title: item.title,
        url: item.slug === 'home' ? '/' : `/${item.slug}`,
        excerpt: item.excerpt || '',
        type: item.type,
        publishedAt: item.publishedAt,
      })),
    };
  });

  app.get('/public/render', async (request, reply) => {
    const { path = '/', q } = request.query as any;
    const rendered = await renderPublicRoute(String(path), { q });

    if ('statusCode' in rendered && typeof rendered.statusCode === 'number') {
      reply.status(rendered.statusCode);
    }

    return rendered;
  });
}
