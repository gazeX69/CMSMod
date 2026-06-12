import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ContentRecord, PluginRuntimeSdk, PublicDocumentContribution } from '@modern-cms/plugin-sdk';
import { and, desc, eq, sql } from 'drizzle-orm';
import { analyzeSeo } from './analyzer.js';
import { seoRedirects } from './schema.js';

type SeoMetadata = {
  title: string;
  description: string;
  focus_keyword: string;
  canonical: string;
  robots: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image_url: string;
  twitter_card: string;
  schema_type: string;
  breadcrumb_title: string;
  sitemap_exclude: boolean;
};

const metadataDefinitions = [
  { key: 'title', type: 'string', visibility: 'admin', maxLength: 300 },
  { key: 'description', type: 'string', visibility: 'admin', maxLength: 600 },
  { key: 'focus_keyword', type: 'string', visibility: 'private', maxLength: 300 },
  { key: 'canonical', type: 'string', visibility: 'admin', maxLength: 2048 },
  { key: 'robots', type: 'string', visibility: 'admin', maxLength: 100 },
  { key: 'og_title', type: 'string', visibility: 'admin', maxLength: 300 },
  { key: 'og_description', type: 'string', visibility: 'admin', maxLength: 600 },
  { key: 'og_image_url', type: 'string', visibility: 'admin', maxLength: 2048 },
  { key: 'twitter_title', type: 'string', visibility: 'admin', maxLength: 300 },
  { key: 'twitter_description', type: 'string', visibility: 'admin', maxLength: 600 },
  { key: 'twitter_image_url', type: 'string', visibility: 'admin', maxLength: 2048 },
  { key: 'twitter_card', type: 'string', visibility: 'admin', maxLength: 40 },
  { key: 'schema_type', type: 'string', visibility: 'admin', maxLength: 80 },
  { key: 'breadcrumb_title', type: 'string', visibility: 'admin', maxLength: 300 },
  { key: 'sitemap_exclude', type: 'boolean', visibility: 'private' },
] as const;

const defaults: SeoMetadata = {
  title: '', description: '', focus_keyword: '', canonical: '', robots: '', og_title: '', og_description: '', og_image_url: '',
  twitter_title: '', twitter_description: '', twitter_image_url: '', twitter_card: 'summary_large_image', schema_type: 'Article', breadcrumb_title: '', sitemap_exclude: false,
};

const escapeXml = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const normalizePath = (value: string) => {
  const path = value.trim().split('?')[0].split('#')[0];
  if (!path) return '/';
  return `/${path.replace(/^\/+|\/+$/g, '')}`;
};
const absoluteUrl = (siteUrl: string, pathOrUrl: string) => /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${siteUrl.replace(/\/$/, '')}/${pathOrUrl.replace(/^\//, '')}`;

function metadataMap(entries: Array<{ key: string; value: unknown }>): SeoMetadata {
  const result: any = { ...defaults };
  for (const entry of entries) result[entry.key.replace(/^seo-suite\./, '')] = entry.value;
  return result;
}

function applyTemplate(template: string, values: { title: string; site: string; separator: string }) {
  return template
    .replace(/%title%/g, values.title)
    .replace(/%site%/g, values.site)
    .replace(/%sep%/g, values.separator)
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanPayload(payload: any) {
  const result: Record<string, unknown> = {};
  for (const definition of metadataDefinitions) {
    const value = payload?.[definition.key];
    if (definition.type === 'boolean') result[definition.key] = Boolean(value);
    else result[definition.key] = typeof value === 'string' ? value.trim() : '';
  }
  return result;
}

async function buildContribution(sdk: PluginRuntimeSdk, context: any): Promise<PublicDocumentContribution> {
  const content = context.content as (ContentRecord & { content?: string; url?: string }) | null;
  const metadata = content?.uuid ? metadataMap(await sdk.content.metadata.get(content.uuid, { visibility: 'admin' })) : { ...defaults };
  const siteUrl = String(context.site?.url || await sdk.settings.get('system.site_url', 'http://localhost:5174'));
  const siteName = String(context.site?.name || await sdk.settings.get('site.name', 'ModernCMS'));
  const separator = await sdk.settings.getWithFallback('seo.title_separator', '-');
  const template = await sdk.settings.getWithFallback('seo.title_template', '%title% %sep% %site%');
  const fallbackDescription = await sdk.settings.getWithFallback('seo.default_description', String(content?.excerpt || ''));
  const defaultRobots = await sdk.settings.getWithFallback('seo.default_robots', 'index,follow');
  const pageTitle = content?.title || siteName;
  const pageExcerpt = String(content?.excerpt || context.site?.description || fallbackDescription);
  const permalink = content?.permalink || content?.url || (content?.uuid ? await sdk.content.resolvePermalink(content.uuid) : null) || context.request?.path || '/';
  const canonical = metadata.canonical || absoluteUrl(siteUrl, permalink);
  const title = metadata.title || (content ? applyTemplate(template, { title: pageTitle, site: siteName, separator }) : siteName);
  const description = metadata.description || pageExcerpt.slice(0, 160);
  const robots = metadata.robots || defaultRobots;
  const image = metadata.og_image_url || metadata.twitter_image_url;
  const organizationName = await sdk.settings.getWithFallback('seo.organization_name', siteName);
  const organizationType = await sdk.settings.getWithFallback('seo.organization_type', 'Organization');
  const organizationLogo = await sdk.settings.getWithFallback('seo.organization_logo', '');
  let socialProfiles: string[] = [];
  try { socialProfiles = JSON.parse(await sdk.settings.getWithFallback('seo.social_profiles', '[]')); } catch { socialProfiles = []; }
  const pageId = `${canonical}#webpage`;
  const orgId = `${siteUrl.replace(/\/$/, '')}#organization`;
  const graph: any[] = [
    { '@type': organizationType, '@id': orgId, name: organizationName, url: siteUrl, ...(organizationLogo ? { logo: { '@type': 'ImageObject', url: organizationLogo } } : {}), ...(socialProfiles.length ? { sameAs: socialProfiles } : {}) },
    { '@type': 'WebSite', '@id': `${siteUrl.replace(/\/$/, '')}#website`, url: siteUrl, name: siteName, publisher: { '@id': orgId } },
    { '@type': 'WebPage', '@id': pageId, url: canonical, name: title, description, isPartOf: { '@id': `${siteUrl.replace(/\/$/, '')}#website` }, ...(content ? { breadcrumb: { '@id': `${canonical}#breadcrumb` } } : {}) },
  ];
  if (content) graph.push({ '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`, itemListElement: [{ '@type': 'ListItem', position: 1, name: siteName, item: siteUrl }, { '@type': 'ListItem', position: 2, name: metadata.breadcrumb_title || content.title, item: canonical }] });
  if (content && metadata.schema_type !== 'WebPage') graph.push({ '@type': metadata.schema_type || 'Article', '@id': `${canonical}#primary`, headline: title, description, mainEntityOfPage: { '@id': pageId }, datePublished: content.publishedAt || undefined, dateModified: content.updatedAt, publisher: { '@id': orgId }, ...(image ? { image: absoluteUrl(siteUrl, image) } : {}) });

  return {
    title,
    meta: [
      { key: 'description', name: 'description', content: description },
      { key: 'robots', name: 'robots', content: robots },
      { key: 'googlebot', name: 'googlebot', content: robots },
      { key: 'og:type', property: 'og:type', content: content && metadata.schema_type !== 'WebPage' ? 'article' : 'website' },
      { key: 'og:title', property: 'og:title', content: metadata.og_title || title },
      { key: 'og:description', property: 'og:description', content: metadata.og_description || description },
      { key: 'og:url', property: 'og:url', content: canonical },
      { key: 'og:site_name', property: 'og:site_name', content: siteName },
      ...(image ? [{ key: 'og:image', property: 'og:image', content: absoluteUrl(siteUrl, image) }] : []),
      { key: 'twitter:card', name: 'twitter:card', content: metadata.twitter_card || 'summary_large_image' },
      { key: 'twitter:title', name: 'twitter:title', content: metadata.twitter_title || metadata.og_title || title },
      { key: 'twitter:description', name: 'twitter:description', content: metadata.twitter_description || metadata.og_description || description },
      ...(image ? [{ key: 'twitter:image', name: 'twitter:image', content: absoluteUrl(siteUrl, metadata.twitter_image_url || image) }] : []),
    ],
    links: [{ key: 'canonical', rel: 'canonical', href: canonical }],
    scripts: [{ key: 'schema-graph', type: 'application/ld+json', data: { '@context': 'https://schema.org', '@graph': graph } }],
  };
}

export default async function seoRoutes(app: FastifyInstance, options: { sdk: PluginRuntimeSdk }) {
  const { sdk } = options;
  const db: any = sdk.database.orm;
  const requireAuth = sdk.auth.requireUser as any;
  app.addHook('onRequest', (request, reply) => sdk.requireActive(request, reply));

  for (const definition of metadataDefinitions) sdk.content.metadata.registerDefinition(definition as any);
  sdk.publicDocument.registerContributor({ id: 'search-appearance', priority: 100, contribute: (context) => buildContribution(sdk, context) });

  let sitemapCache: { expiresAt: number; xml: string } | null = null;
  const invalidateSitemap = () => { sitemapCache = null; };
  sdk.events.on('content.updated', invalidateSitemap);
  sdk.events.on('content.published', invalidateSitemap);
  sdk.events.on('content.deleted', invalidateSitemap);

  sdk.publicRoutes.register({
    id: 'sitemap', path: '/sitemap.xml',
    handler: async () => {
      if ((await sdk.settings.getWithFallback('seo.sitemap_enabled', 'true')) !== 'true') return { status: 404, contentType: 'text/plain', body: 'Sitemap disabled' };
      if (sitemapCache && sitemapCache.expiresAt > Date.now()) return { status: 200, headers: { 'cache-control': 'public, max-age=300' }, contentType: 'application/xml; charset=utf-8', body: sitemapCache.xml };
      const siteUrl = (await sdk.settings.getWithFallback('system.site_url', 'http://localhost:5174')).replace(/\/$/, '');
      const items: any[] = [];
      for (let page = 1; page <= 500; page += 1) {
        const result = await sdk.content.listPublished({ page, limit: 100, sort: 'updatedAt', order: 'desc' });
        for (const item of result.items) {
          const metadata = metadataMap(await sdk.content.metadata.get(item.uuid));
          if (!metadata.sitemap_exclude && !(metadata.robots || '').includes('noindex')) items.push(item);
        }
        if (page >= result.totalPages) break;
      }
      const urls = items.map((item) => `<url><loc>${escapeXml(absoluteUrl(siteUrl, item.permalink))}</loc><lastmod>${escapeXml(new Date(item.updatedAt).toISOString())}</lastmod></url>`).join('');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
      sitemapCache = { expiresAt: Date.now() + 300000, xml };
      return { status: 200, headers: { 'cache-control': 'public, max-age=300' }, contentType: 'application/xml; charset=utf-8', body: xml };
    },
  });

  sdk.publicRoutes.register({
    id: 'robots', path: '/robots.txt',
    handler: async () => {
      if ((await sdk.settings.getWithFallback('seo.robots_enabled', 'true')) !== 'true') return { status: 404, contentType: 'text/plain', body: 'Robots management disabled' };
      const siteUrl = (await sdk.settings.getWithFallback('system.site_url', 'http://localhost:5174')).replace(/\/$/, '');
      return { status: 200, contentType: 'text/plain; charset=utf-8', body: `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n` };
    },
  });

  sdk.publicRequests.registerInterceptor({
    id: 'redirect-manager', phase: 'beforeResolve', priority: 200,
    intercept: async (context) => {
      if (context.method !== 'GET' && context.method !== 'HEAD') return { action: 'continue' };
      const sourcePath = normalizePath(context.path);
      const rows = await db.select().from(seoRedirects).where(and(eq(seoRedirects.sourcePath, sourcePath), eq(seoRedirects.isActive, true))).limit(1);
      if (!rows[0]) return { action: 'continue' };
      await db.update(seoRedirects).set({ hitCount: sql`${seoRedirects.hitCount} + 1`, lastHitAt: new Date(), updatedAt: new Date() }).where(eq(seoRedirects.id, rows[0].id));
      await sdk.events.emit('seo.redirect.hit', { redirectId: rows[0].id, sourcePath, targetUrl: rows[0].targetUrl, statusCode: rows[0].statusCode }, 1);
      return { action: 'respond', response: { status: rows[0].statusCode, headers: { location: rows[0].targetUrl, 'cache-control': 'no-store' }, contentType: 'text/plain; charset=utf-8', body: `Redirecting to ${rows[0].targetUrl}` } };
    },
  });

  const requirePermission = (permission: string) => async (request: any, reply: FastifyReply) => {
    if (!request.user?.id) return reply.status(401).send({ error: 'Unauthorized' });
    if (!(await sdk.permissions.can(request.user.id, permission))) return reply.status(403).send({ error: 'Forbidden', permission });
  };

  app.get('/content/:uuid', { preHandler: [requireAuth, requirePermission('seo.read')] }, async (request: any, reply) => {
    const content = await sdk.content.getByUuid(request.params.uuid, { includeBody: true });
    if (!content) return reply.status(404).send({ error: 'Content not found' });
    const metadata = metadataMap(await sdk.content.metadata.get(content.uuid));
    return { content, metadata, analysis: analyzeSeo({ title: metadata.title || content.title, description: metadata.description || content.excerpt || '', focusKeyword: metadata.focus_keyword, slug: content.slug, bodyHtml: content.body || '', canonical: metadata.canonical, robots: metadata.robots }) };
  });

  app.put('/content/:uuid', { preHandler: [requireAuth, requirePermission('seo.edit')] }, async (request: any, reply) => {
    const content = await sdk.content.getByUuid(request.params.uuid, { includeBody: true });
    if (!content) return reply.status(404).send({ error: 'Content not found' });
    const metadata = cleanPayload(request.body);
    await sdk.content.metadata.set(content.uuid, Object.entries(metadata).map(([key, value]) => ({ key, value })));
    invalidateSitemap();
    const analysis = analyzeSeo({ title: String(metadata.title || content.title), description: String(metadata.description || content.excerpt || ''), focusKeyword: String(metadata.focus_keyword || ''), slug: content.slug, bodyHtml: content.body || '', canonical: String(metadata.canonical || ''), robots: String(metadata.robots || '') });
    await sdk.events.emit('seo.metadata.updated', { contentUuid: content.uuid, score: analysis.score, changedFields: Object.keys(metadata) }, 1);
    return { ok: true, metadata, analysis };
  });

  app.get('/admin/overview', { preHandler: [requireAuth, requirePermission('seo.read')] }, async () => {
    const result = await sdk.content.list({ page: 1, limit: 100, includeBody: true, sort: 'updatedAt', order: 'desc' });
    const rows = await Promise.all(result.items.map(async (item: any) => {
      const metadata = metadataMap(await sdk.content.metadata.get(item.uuid));
      const analysis = analyzeSeo({ title: metadata.title || item.title, description: metadata.description || item.excerpt || '', focusKeyword: metadata.focus_keyword, slug: item.slug, bodyHtml: item.body || '', canonical: metadata.canonical, robots: metadata.robots });
      return { uuid: item.uuid, title: item.title, type: item.type, status: item.status, permalink: item.permalink, score: analysis.score, grade: analysis.grade, focusKeyword: metadata.focus_keyword, robots: metadata.robots || 'default' };
    }));
    const redirects = await db.select({ value: sql<number>`count(*)` }).from(seoRedirects);
    return { items: rows, total: result.total, analyzed: rows.length, averageScore: rows.length ? Math.round(rows.reduce((sum, item) => sum + item.score, 0) / rows.length) : 0, redirects: Number(redirects[0]?.value || 0) };
  });

  app.get('/admin/settings', { preHandler: [requireAuth, requirePermission('seo.read')] }, async () => {
    const rows: any[] = await sdk.settings.getByScope('seo') as any[];
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  });

  app.put('/admin/settings', { preHandler: [requireAuth, requirePermission('seo.manage')] }, async (request: any) => {
    const allowed = new Set(['seo.title_template', 'seo.title_separator', 'seo.default_description', 'seo.default_robots', 'seo.sitemap_enabled', 'seo.robots_enabled', 'seo.organization_type', 'seo.organization_name', 'seo.organization_logo', 'seo.social_profiles']);
    for (const [key, value] of Object.entries(request.body || {})) if (allowed.has(key)) await sdk.settings.set(key, typeof value === 'string' ? value : JSON.stringify(value), { group: 'seo', isPublic: key.endsWith('_enabled'), type: key.endsWith('_enabled') ? 'boolean' : key === 'seo.social_profiles' ? 'json' : 'string' });
    invalidateSitemap();
    return { ok: true };
  });

  app.get('/admin/redirects', { preHandler: [requireAuth, requirePermission('seo.read')] }, async () => ({ items: await db.select().from(seoRedirects).orderBy(desc(seoRedirects.updatedAt)).limit(1000) }));

  app.post('/admin/redirects', { preHandler: [requireAuth, requirePermission('seo.manage')] }, async (request: any, reply) => {
    const sourcePath = normalizePath(request.body?.sourcePath || '');
    const targetUrl = String(request.body?.targetUrl || '').trim();
    const statusCode = [301, 302, 307, 308].includes(Number(request.body?.statusCode)) ? Number(request.body.statusCode) : 301;
    if (sourcePath === '/' || !targetUrl || sourcePath === normalizePath(targetUrl)) return reply.status(400).send({ error: 'Invalid or circular redirect' });
    try { await db.insert(seoRedirects).values({ sourcePath, targetUrl, statusCode, isActive: request.body?.isActive !== false, createdAt: new Date(), updatedAt: new Date() }); }
    catch { return reply.status(409).send({ error: 'Source path already exists' }); }
    return reply.status(201).send({ ok: true });
  });

  app.put('/admin/redirects/:id', { preHandler: [requireAuth, requirePermission('seo.manage')] }, async (request: any, reply) => {
    const sourcePath = normalizePath(request.body?.sourcePath || '');
    const targetUrl = String(request.body?.targetUrl || '').trim();
    if (!targetUrl) return reply.status(400).send({ error: 'Target URL is required' });
    await db.update(seoRedirects).set({ sourcePath, targetUrl, statusCode: [301, 302, 307, 308].includes(Number(request.body?.statusCode)) ? Number(request.body.statusCode) : 301, isActive: request.body?.isActive !== false, updatedAt: new Date() }).where(eq(seoRedirects.id, Number(request.params.id)));
    return { ok: true };
  });

  app.delete('/admin/redirects/:id', { preHandler: [requireAuth, requirePermission('seo.manage')] }, async (request: any) => {
    await db.delete(seoRedirects).where(eq(seoRedirects.id, Number(request.params.id)));
    return { ok: true };
  });
}
