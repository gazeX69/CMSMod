import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { and, desc, eq, isNull, like, lte, or, sql } from 'drizzle-orm';
import { db } from '../database/client.js';
import {
  contentCategories,
  contents,
  contentTags,
  navigationItems,
  settings,
  tags,
  categories,
} from '../database/schema.js';
import { getSetting } from '../settings/settingsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const themesDir = path.resolve(__dirname, '../../../../themes');

interface ThemeManifest {
  id?: string;
  name: string;
  version: string;
  templates?: Record<string, string>;
}

interface PublicContent {
  id: number;
  title: string;
  slug: string;
  type: string;
  status: string;
  excerpt: string | null;
  body: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function publicContentCondition() {
  return and(
    eq(contents.status, 'published'),
    isNull(contents.deletedAt),
    lte(contents.publishedAt, new Date())
  );
}

function normalizeSlug(slug: string) {
  return slug.replace(/^\/+/, '').replace(/\/+$/, '') || 'home';
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getByPath(data: any, token: string) {
  return token.split('.').reduce((current, key) => current?.[key], data);
}

function renderNavigation(items: Array<{ label: string; url: string; target: string }>) {
  return items
    .map((item) => `<a href="${escapeHtml(item.url)}" target="${escapeHtml(item.target)}">${escapeHtml(item.label)}</a>`)
    .join('');
}

function renderTemplate(template: string, data: Record<string, any>) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, token) => {
    const value = getByPath(data, token);
    return value === undefined || value === null ? '' : String(value);
  });
}

export function resolveMediaInHtml(html: string) {
  return html.replace(
    /<img([^>]*?)data-media-uuid=["']([^"']+)["']([^>]*?)>/g,
    (_match, before, uuid, after) => {
      const hasSrc = /\ssrc=["'][^"']*["']/.test(`${before} ${after}`);
      const cleanedBefore = hasSrc ? before.replace(/\ssrc=["'][^"']*["']/, '') : before;
      return `<img${cleanedBefore}src="/api/media/resolve/${uuid}" data-media-uuid="${uuid}"${after}>`;
    }
  );
}

async function getActiveThemeId() {
  return (await getSetting('theme.active', 'default')) || 'default';
}

async function loadActiveTheme() {
  const themeId = await getActiveThemeId();
  const themePath = path.resolve(themesDir, themeId);
  const manifestPath = path.join(themePath, 'theme.json');

  if (!themePath.startsWith(themesDir) || !fs.existsSync(manifestPath)) {
    throw new Error(`Active theme not found: ${themeId}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as ThemeManifest;
  return {
    id: themeId,
    path: themePath,
    manifest,
  };
}

async function readThemeTemplate(templateName: string) {
  const theme = await loadActiveTheme();
  const templates = theme.manifest.templates || {};
  const templatePath =
    templates[templateName] ||
    templates.content ||
    templates.error ||
    `templates/${templateName}.html`;
  const resolvedPath = path.resolve(theme.path, templatePath);

  if (!resolvedPath.startsWith(theme.path) || !fs.existsSync(resolvedPath)) {
    if (templateName !== 'error') {
      return readThemeTemplate('error');
    }

    return {
      theme,
      template: '<section class="cms-error"><h1>{{ page.title }}</h1><div>{{ page.content }}</div></section>',
      templateName: 'error',
    };
  }

  return {
    theme,
    template: fs.readFileSync(resolvedPath, 'utf-8'),
    templateName,
  };
}

export async function getPublicNavigation(location: string) {
  return db
    .select()
    .from(navigationItems)
    .where(and(eq(navigationItems.location, location), eq(navigationItems.isActive, true)))
    .orderBy(navigationItems.sortOrder);
}

export async function findPublicContentBySlug(slug: string) {
  const rows = await db
    .select()
    .from(contents)
    .where(and(publicContentCondition(), eq(contents.slug, normalizeSlug(slug))))
    .limit(1);

  return (rows[0] || null) as PublicContent | null;
}

export async function findPublicHomeContent() {
  const homeSlug = (await getSetting('public.homepage_slug', 'home')) || 'home';
  return findPublicContentBySlug(homeSlug);
}

export async function listPublicContent(type?: string, limit = 20, offset = 0) {
  const condition = type
    ? and(publicContentCondition(), eq(contents.type, type))
    : publicContentCondition();

  return db
    .select()
    .from(contents)
    .where(condition)
    .orderBy(desc(contents.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function searchPublicContent(query: string) {
  const q = `%${query.trim()}%`;
  if (!query.trim()) return [];

  return db
    .selectDistinct({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
      type: contents.type,
      excerpt: contents.excerpt,
      publishedAt: contents.publishedAt,
    })
    .from(contents)
    .leftJoin(contentTags, eq(contentTags.contentId, contents.id))
    .leftJoin(tags, eq(contentTags.tagId, tags.id))
    .leftJoin(contentCategories, eq(contentCategories.contentId, contents.id))
    .leftJoin(categories, eq(contentCategories.categoryId, categories.id))
    .where(and(
      publicContentCondition(),
      or(
        like(contents.title, q),
        like(contents.excerpt, q),
        like(contents.body, q),
        like(tags.name, q),
        like(categories.name, q)
      )
    ))
    .orderBy(desc(contents.publishedAt))
    .limit(20);
}

async function getSiteContext() {
  const rows = await db.select().from(settings).where(eq(settings.isPublic, true));
  const settingMap = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const primaryNavigation = await getPublicNavigation('primary');
  const footerNavigation = await getPublicNavigation('footer');

  return {
    name: settingMap['system.site_name'] || settingMap.site_name || 'Modern CMS',
    title: settingMap['system.site_name'] || settingMap.site_name || 'Modern CMS',
    description: settingMap['system.site_description'] || settingMap.site_description || '',
    url: settingMap['system.site_url'] || settingMap.site_url || '',
    year: new Date().getFullYear(),
    navigation: {
      primary: primaryNavigation,
      footer: footerNavigation,
    },
    navigationHtml: {
      primary: renderNavigation(primaryNavigation),
      footer: renderNavigation(footerNavigation),
    },
  };
}

function toPublicContent(content: PublicContent) {
  return {
    id: content.id,
    uuid: String(content.id),
    type: content.type,
    title: content.title,
    slug: content.slug,
    content: resolveMediaInHtml(content.body || ''),
    excerpt: content.excerpt || '',
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
    url: content.slug === 'home' ? '/' : `/${content.slug}`,
    metadata: {},
  };
}

function buildSeo(content: ReturnType<typeof toPublicContent> | null, site: Awaited<ReturnType<typeof getSiteContext>>) {
  return {
    title: content ? `${content.title} - ${site.name}` : site.name,
    description: content?.excerpt || site.description,
    canonicalUrl: content ? `${site.url}${content.url}` : site.url,
    robots: content ? 'index,follow' : 'noindex,follow',
  };
}

async function renderWithTheme(templateName: string, page: any, contentHtml: string) {
  const site = await getSiteContext();
  const seo = buildSeo(page?.rawContent || null, site);
  const pageTemplate = await readThemeTemplate(templateName);
  const layoutTemplate = await readThemeTemplate('layout');

  const pageHtml = renderTemplate(pageTemplate.template, {
    site,
    page,
    content: contentHtml,
    seo,
  });

  const html = renderTemplate(layoutTemplate.template, {
    site,
    page,
    content: pageHtml,
    seo,
  });

  return {
    success: true,
    theme: {
      id: pageTemplate.theme.id,
      name: pageTemplate.theme.manifest.name,
      template: pageTemplate.templateName,
    },
    seo,
    html: resolveMediaInHtml(html),
  };
}

export async function renderHomePage() {
  const content = await findPublicHomeContent();
  if (!content) {
    return renderErrorPage(404, 'Homepage Not Found', 'No published homepage content is configured.');
  }

  const publicContent = toPublicContent(content);
  return renderWithTheme('home', {
    ...publicContent,
    rawContent: publicContent,
  }, publicContent.content);
}

export async function renderContentPage(slug: string) {
  const content = await findPublicContentBySlug(slug);
  if (!content) {
    return renderErrorPage(404, 'Page Not Found', 'The requested public content is not available.');
  }

  const publicContent = toPublicContent(content);
  const template = content.type === 'page' ? 'page' : content.type;
  return renderWithTheme(template, {
    ...publicContent,
    rawContent: publicContent,
  }, publicContent.content);
}

export async function renderSearchPage(query: string) {
  const site = await getSiteContext();
  const results = await searchPublicContent(query);
  const itemsHtml = results
    .map((item) => {
      const url = item.slug === 'home' ? '/' : `/${item.slug}`;
      return `<article class="search-result"><h2><a href="${escapeHtml(url)}">${escapeHtml(item.title)}</a></h2><p>${escapeHtml(item.excerpt || '')}</p></article>`;
    })
    .join('');

  return renderWithTheme('search', {
    title: query ? `Search: ${query}` : 'Search',
    content: itemsHtml || '<p>No published content matched your search.</p>',
    query,
    results,
    rawContent: null,
    site,
  }, itemsHtml || '<p>No published content matched your search.</p>');
}

export async function renderErrorPage(statusCode: number, title: string, message: string) {
  const rendered = await renderWithTheme('error', {
    title,
    content: `<p>${escapeHtml(message)}</p>`,
    statusCode,
    rawContent: null,
  }, `<p>${escapeHtml(message)}</p>`);

  return {
    ...rendered,
    statusCode,
  };
}

export async function resolvePublicRoute(urlPath: string) {
  const cleanPath = urlPath.split('?')[0] || '/';

  if (cleanPath === '/') {
    return { id: 'core.home', owner: 'core', pattern: '/', resolver: 'home', template: 'home' };
  }

  if (cleanPath === '/search') {
    return { id: 'core.search', owner: 'core', pattern: '/search', resolver: 'search', template: 'search' };
  }

  return {
    id: 'content.page',
    owner: 'core',
    pattern: '/:slug',
    resolver: 'contentBySlug',
    template: 'page',
    params: {
      slug: normalizeSlug(cleanPath),
    },
  };
}

export async function renderPublicRoute(urlPath: string, query: Record<string, any> = {}) {
  const route = await resolvePublicRoute(urlPath);

  if (route.resolver === 'home') return renderHomePage();
  if (route.resolver === 'search') return renderSearchPage(String(query.q || ''));
  if (route.resolver === 'contentBySlug') return renderContentPage((route as any).params.slug);

  return renderErrorPage(404, 'Route Not Found', 'No public route matched this path.');
}

export function publicContentResponse(content: PublicContent | null) {
  return {
    success: Boolean(content),
    data: content ? toPublicContent(content) : null,
  };
}
