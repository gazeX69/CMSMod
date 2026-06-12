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
import { publicRequestInterceptors, publicRouteRegistry, publicAssetRegistry } from '../public/PublicExtensionRegistries.js';

export async function publicRoutes(app: FastifyInstance) {
  app.get('/public/document', async (request, reply) => {
    const { path = '/', ...query } = request.query as any;
    const routeContext = {
      method: 'GET',
      path: String(path),
      query: Object.fromEntries(Object.entries(query).map(([key, value]) => [key, String(value)])),
      headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])),
    };
    let currentPath = routeContext.path;
    const before = await publicRequestInterceptors.run('beforeResolve', { ...routeContext, path: currentPath });
    if (before.action === 'respond' || before.action === 'deny') {
      const response = before.response || { status: 403, body: 'Forbidden', contentType: 'text/plain; charset=utf-8' };
      reply.status(response.status).type(response.contentType || 'text/plain; charset=utf-8');
      for (const [key, value] of Object.entries(response.headers || {})) reply.header(key, value);
      return reply.send(response.body);
    }
    if (before.action === 'rewrite' && before.path) currentPath = before.path;
    const ownedRoute = publicRouteRegistry.resolve('GET', currentPath);
    if (ownedRoute) {
      const response = await ownedRoute.handler({ ...routeContext, path: currentPath });
      reply.status(response.status).type(response.contentType || 'text/plain; charset=utf-8');
      for (const [key, value] of Object.entries(response.headers || {})) reply.header(key, value);
      return reply.send(response.body);
    }
    const afterResolve = await publicRequestInterceptors.run('afterResolve', { ...routeContext, path: currentPath });
    if (afterResolve.action === 'respond' || afterResolve.action === 'deny') {
      const response = afterResolve.response || { status: 403, body: 'Forbidden', contentType: 'text/plain; charset=utf-8' };
      reply.status(response.status).type(response.contentType || 'text/plain; charset=utf-8');
      return reply.send(response.body);
    }
    const beforeRender = await publicRequestInterceptors.run('beforeRender', { ...routeContext, path: currentPath });
    if (beforeRender.action === 'respond' || beforeRender.action === 'deny') {
      const response = beforeRender.response || { status: 403, body: 'Forbidden', contentType: 'text/plain; charset=utf-8' };
      reply.status(response.status).type(response.contentType || 'text/plain; charset=utf-8');
      return reply.send(response.body);
    }
    const rendered = await renderPublicRoute(currentPath, query, { mode: 'public', request: routeContext });
    const status = 'statusCode' in rendered && typeof rendered.statusCode === 'number' ? rendered.statusCode : 200;
    const afterRender = await publicRequestInterceptors.run('afterRender', { ...routeContext, path: currentPath });
    if (afterRender.action === 'respond' && afterRender.response) {
      reply.status(afterRender.response.status).type(afterRender.response.contentType || 'text/html; charset=utf-8');
      return reply.send(afterRender.response.body);
    }
    reply.status(status).type('text/html; charset=utf-8');
    return reply.send(rendered.html);
  });

  app.get('/public/content/home', async (request) => {
    const content = await findPublicHomeContent();
    const routeContext = {
      method: 'GET',
      path: '/',
      query: {},
      headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])),
    };
    return await publicContentResponse(content, { mode: 'headless', request: routeContext });
  });

  app.get('/public/content/by-slug/:slug', async (request) => {
    const { slug } = request.params as any;
    const content = await findPublicContentBySlug(slug);
    const routeContext = {
      method: 'GET',
      path: `/${slug}`,
      query: {},
      headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])),
    };
    return await publicContentResponse(content, { mode: 'headless', request: routeContext });
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
    const { path = '/', ...query } = request.query as any;
    const routeContext = {
      method: 'GET',
      path: String(path),
      query: Object.fromEntries(Object.entries(query).map(([key, value]) => [key, String(value)])),
      headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])),
    };
    const rendered = await renderPublicRoute(String(path), query, { mode: 'public', request: routeContext });

    if ('statusCode' in rendered && typeof rendered.statusCode === 'number') {
      reply.status(rendered.statusCode);
    }

    return rendered;
  });

  app.get('/public/assets/*', async (request, reply) => {
    const assetPath = (request.params as any)['*'];
    if (!assetPath) {
      reply.status(404).send('Asset path missing');
      return;
    }
    const segments = assetPath.split('/');
    const owner = segments[0];
    const path = segments.slice(1).join('/');
    
    const asset = publicAssetRegistry.resolve(owner, path);
    if (!asset) {
      reply.status(404).send('Asset not found');
      return;
    }
    reply.type(asset.mimeType).send(asset.content);
  });
}
