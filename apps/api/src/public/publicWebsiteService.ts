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
  users,
} from '../database/schema.js';
import { getSetting } from '../settings/settingsService.js';
import { getSettings as getThemeSettingsValues } from '../themes/themeSettingsService.js';
import { renderRegionWidgetsHtml } from '../widgets/widgetService.js';
import { themeSlotRegistry } from '../plugins/ThemeSlotRegistry.js';
import { publicDocumentContributors, publicContentCompositionPipeline } from './PublicExtensionRegistries.js';
import type { PublicDocumentContribution, CompositionContext, PublicRouteContext } from '@modern-cms/plugin-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const themesDir = path.resolve(__dirname, '../../../../themes');

interface ThemeManifest {
  id?: string;
  name: string;
  version: string;
  templates?: Record<string, string>;
  regions?: Record<string, any>;
}

interface PublicContent {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  excerpt: string | null;
  body: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorId: number | null;
  featuredImageUrl: string | null;
  featuredImageAssetUuid: string | null;
  featuredImageAlt: string | null;
  featuredImageSource: string | null;
}

function publicContentCondition() {
  // Add a 5-minute future buffer to account for server/database clock drift
  const futureBuffer = new Date(Date.now() + 5 * 60 * 1000);
  return and(
    eq(contents.status, 'published'),
    isNull(contents.deletedAt),
    lte(contents.publishedAt, futureBuffer)
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
  const withConditionals = template.replace(/\{\{#if\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, token, content) => {
    return getByPath(data, token) ? content : '';
  });
  return withConditionals.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, token) => {
    const value = getByPath(data, token);
    return value === undefined || value === null ? '' : String(value);
  });
}

export function resolveMediaInHtml(html: string, lazyLoad = false) {
  const apiBase = (process.env.VITE_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');

  let resolved = html.replace(
    /<img([^>]*?)data-media-uuid=["']([^"']+)["']([^>]*?)>/g,
    (_match, before, uuid, after) => {
      const hasSrc = /\ssrc=["'][^"']*["']/.test(`${before} ${after}`);
      const cleanedBefore = hasSrc ? before.replace(/\ssrc=["'][^"']*["']/, '') : before;
      
      let lazyAttr = '';
      if (lazyLoad && !/loading=["']/.test(`${before} ${after}`)) {
        lazyAttr = ' loading="lazy"';
      }
      
      return `<img${cleanedBefore}src="${apiBase}/api/media/resolve/${uuid}" data-media-uuid="${uuid}"${lazyAttr}${after}>`;
    }
  );

  if (lazyLoad) {
    resolved = resolved.replace(/<img(?![^>]*\bloading\b)([^>\/]*?)(\s*\/)?>/gi, (_match, before, slash) => {
      const cleanedBefore = before.trimEnd();
      return `<img ${cleanedBefore} loading="lazy"${slash ? ' /' : ''}>`;
    });
  }

  // Also replace any remaining relative /api/media/resolve/ paths to ensure icons, favicons, logos etc. resolve correctly.
  resolved = resolved.replace(/(src|href|content)=["']\/api\/media\/resolve\/([^"']+)["']/g, `$1="${apiBase}/api/media/resolve/$2"`);

  return resolved;
}

async function getAuthorName(authorId: number | null): Promise<string> {
  if (!authorId) return 'Admin';
  try {
    const rows = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1);
    return rows[0]?.username || 'Admin';
  } catch {
    return 'Admin';
  }
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
  const homepageUuid = await getSetting('site.homepage_target');
  
  if (homepageUuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(homepageUuid)) {
    const rows = await db
      .select()
      .from(contents)
      .where(and(publicContentCondition(), eq(contents.uuid, homepageUuid)))
      .limit(1);
    if (rows.length > 0) return rows[0] as PublicContent;
  }

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

export async function toPublicContent(
  content: PublicContent,
  permalinkStructure = '/%postname%/',
  options?: {
    mode?: 'public' | 'preview' | 'headless';
    theme?: { id: string; name: string };
    request?: PublicRouteContext;
  }
) {
  let url = `/${content.slug}`;
  if (content.slug === 'home') {
    url = '/';
  } else if (content.type === 'article') {
    if (permalinkStructure === '/posts/%postname%/') {
      url = `/posts/${content.slug}`;
    } else if (permalinkStructure === '/article/%postname%/') {
      url = `/article/${content.slug}`;
    }
  }

  const mediaResolved = resolveMediaInHtml(content.body || '');

  let themeInfo = options?.theme;
  if (!themeInfo) {
    try {
      const activeTheme = await loadActiveTheme();
      themeInfo = {
        id: activeTheme.id,
        name: activeTheme.manifest.name,
      };
    } catch {
      themeInfo = {
        id: 'default',
        name: 'Default Theme',
      };
    }
  }

  const context: CompositionContext = {
    contentUuid: content.uuid,
    contentType: content.type,
    status: content.status,
    locale: 'en',
    theme: themeInfo,
    mode: options?.mode || 'public',
    request: options?.request,
    assets: {
      scripts: [],
      styles: [],
    },
  };

  const composedContent = await publicContentCompositionPipeline.compose(mediaResolved, context);
  const featuredImage = content.featuredImageUrl ? {
    url: resolvePublicMediaUrl(content.featuredImageUrl),
    assetUuid: content.featuredImageAssetUuid,
    alt: content.featuredImageAlt || '',
    source: content.featuredImageSource || 'external',
  } : null;

  return {
    id: content.id,
    uuid: content.uuid,
    type: content.type,
    title: content.title,
    slug: content.slug,
    content: composedContent,
    excerpt: content.excerpt || '',
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
    url,
    authorId: content.authorId,
    featuredImage,
    metadata: { featuredImage },
  };
}

function resolvePublicMediaUrl(url: string) {
  if (!url.startsWith('/')) return url;
  const apiBase = (process.env.VITE_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
  return `${apiBase}${url}`;
}

function buildSeo(content: Awaited<ReturnType<typeof toPublicContent>> | null, site: Awaited<ReturnType<typeof getSiteContext>>) {
  return {
    title: content ? `${content.title} - ${site.name}` : site.name,
    description: content?.excerpt || site.description,
    canonicalUrl: content ? `${site.url}${content.url}` : site.url,
    robots: content ? 'index,follow' : 'noindex,follow',
    image: content?.featuredImage?.url || '',
  };
}

function safeJsonForScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function serializeContributions(contributions: Array<{ owner: string; contribution: PublicDocumentContribution }>) {
  const meta = new Map<string, string>();
  const links = new Map<string, string>();
  const scripts = new Map<string, string>();
  const metaSelectors: Array<{ attribute: 'name' | 'property'; value: string }> = [];
  const linkRels: string[] = [];
  let title: string | null = null;
  for (const { contribution } of contributions) {
    if (contribution.title) title = contribution.title;
    for (const item of contribution.meta || []) {
      const identity = item.key;
      const attribute = item.name ? `name="${escapeHtml(item.name)}"` : item.property ? `property="${escapeHtml(item.property)}"` : '';
      if (attribute) {
        meta.set(identity, `<meta ${attribute} content="${escapeHtml(item.content)}" />`);
        metaSelectors.push({ attribute: item.name ? 'name' : 'property', value: item.name || item.property || '' });
      }
    }
    for (const item of contribution.links || []) {
      if (!/^https?:|^\//i.test(item.href)) continue;
      links.set(item.key, `<link rel="${escapeHtml(item.rel)}" href="${escapeHtml(item.href)}"${item.hreflang ? ` hreflang="${escapeHtml(item.hreflang)}"` : ''}${item.type ? ` type="${escapeHtml(item.type)}"` : ''} />`);
      linkRels.push(item.rel);
    }
    for (const item of contribution.scripts || []) {
      if (item.src && !/^https?:|^\//i.test(item.src)) continue;
      if (item.src) scripts.set(item.key, `<script src="${escapeHtml(item.src)}"${item.type ? ` type="${escapeHtml(item.type)}"` : ''}${item.async ? ' async' : ''}${item.defer ? ' defer' : ''}></script>`);
      else if (item.data !== undefined) scripts.set(item.key, `<script type="${escapeHtml(item.type || 'application/json')}">${safeJsonForScript(item.data)}</script>`);
    }
  }
  return { title, head: [...meta.values(), ...links.values(), ...scripts.values()].join('\n'), metaSelectors, linkRels };
}

function injectDocumentHead(html: string, seo: ReturnType<typeof buildSeo>, serialized: ReturnType<typeof serializeContributions>) {
  let output = html;
  const title = serialized.title || seo.title;
  output = output.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  for (const selector of serialized.metaSelectors) {
    const attribute = escapeRegExp(selector.attribute);
    const value = escapeRegExp(selector.value);
    output = output.replace(new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${value}["'])[^>]*>\\s*`, 'gi'), '');
  }
  for (const rel of serialized.linkRels) {
    output = output.replace(new RegExp(`<link\\b(?=[^>]*\\brel=["']${escapeRegExp(rel)}["'])[^>]*>\\s*`, 'gi'), '');
  }
  const contributesRobots = serialized.metaSelectors.some((selector) => selector.attribute === 'name' && selector.value.toLowerCase() === 'robots');
  const defaults = [
    contributesRobots ? '' : `<meta name="robots" content="${escapeHtml(seo.robots)}" />`,
    serialized.head,
  ].filter(Boolean).join('\n');
  return output.replace(/<\/head>/i, `${defaults}\n</head>`);
}



async function renderWithTheme(templateName: string, page: any, contentHtml: string, options?: { mode?: 'public' | 'preview' | 'headless'; request?: PublicRouteContext }) {
  const site = await getSiteContext();
  const seo = buildSeo(page?.rawContent || null, site);
  const pageTemplate = await readThemeTemplate(templateName);
  const layoutTemplate = await readThemeTemplate('layout');

  // Load theme settings via SDK (single source of truth)
  let themeSettingsObj: Record<string, any> = {};
  try {
    themeSettingsObj = await getThemeSettingsValues(pageTemplate.theme.id);
  } catch {
    // If schema is missing or broken, render without settings
  }

  // Preprocess author name
  let authorName = 'Admin';
  if (page && page.authorId) {
    authorName = await getAuthorName(page.authorId);
  }

  // Preprocess date formatting
  let formattedDate = '';
  if (page && page.publishedAt) {
    const dateObj = new Date(page.publishedAt);
    const format = themeSettingsObj.localization?.dateFormat || 'YYYY-MM-DD';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNameShort = monthsShort[dateObj.getMonth()];
    
    if (format === 'DD/MM/YYYY') {
      formattedDate = `${day}/${month}/${year}`;
    } else if (format === 'MM/DD/YYYY') {
      formattedDate = `${month}/${day}/${year}`;
    } else if (format === 'DD MMM YYYY') {
      formattedDate = `${day} ${monthNameShort} ${year}`;
    } else {
      formattedDate = `${year}-${month}-${day}`; // default YYYY-MM-DD
    }
  }

  // Bind properties to page object
  if (page) {
    page.author = authorName;
    page.date = formattedDate;
  }

  // Preprocess copyright placeholders
  if (themeSettingsObj.footer?.copyrightText) {
    themeSettingsObj.footer.copyrightText = themeSettingsObj.footer.copyrightText
      .replace(/\{year\}/g, String(site.year))
      .replace(/\{siteName\}/g, site.name);
  }

  // Preprocess thumbnailRatio format for CSS aspect-ratio
  if (themeSettingsObj.media?.thumbnailRatio) {
    themeSettingsObj.media.thumbnailRatio = themeSettingsObj.media.thumbnailRatio.replace(':', '/');
  }

  const themeContext = {
    id: pageTemplate.theme.id,
    name: pageTemplate.theme.manifest.name,
    settings: themeSettingsObj,
  };

  // Load and render theme regions/widgets
  const themeId = pageTemplate.theme.id;
  const themeRegions = pageTemplate.theme.manifest.regions || {};
  const widgetsData: Record<string, string> = {};
  
  for (const regionKey of Object.keys(themeRegions)) {
    try {
      widgetsData[regionKey] = await renderRegionWidgetsHtml(themeId, regionKey);
    } catch (err) {
      widgetsData[regionKey] = `<!-- Error rendering region ${regionKey} -->`;
    }
  }

  const pluginSlots = await themeSlotRegistry.resolveAll(page?.uuid || '');

  const pageHtml = renderTemplate(pageTemplate.template, {
    site,
    page,
    post: page, // Fallback context
    content: contentHtml,
    seo,
    theme: themeContext,
    widgets: widgetsData,
    ...pluginSlots,
  });

  const html = renderTemplate(layoutTemplate.template, {
    site,
    page,
    post: page, // Fallback context
    content: pageHtml,
    seo,
    theme: themeContext,
    widgets: widgetsData,
    ...pluginSlots,
  });

  let finalHtml = html;

  const lazyLoad = themeSettingsObj.content?.lazyLoad !== false && themeSettingsObj.performance?.lazyLoadImages !== false;

  const contributionContext = {
    request: options?.request || { method: 'GET', path: page?.url || '/', query: {}, headers: {} },
    route: page?.uuid ? { id: `content.${page.type || 'unknown'}`, owner: 'core', params: { uuid: page.uuid } } : null,
    site,
    content: page?.rawContent || null,
    theme: { id: pageTemplate.theme.id, name: pageTemplate.theme.manifest.name },
  };
  const contributions = await publicDocumentContributors.collect(contributionContext as any);
  const serializedContributions = serializeContributions(contributions);
  finalHtml = injectDocumentHead(finalHtml, seo, serializedContributions);

  return {
    success: true,
    theme: {
      id: pageTemplate.theme.id,
      name: pageTemplate.theme.manifest.name,
      template: pageTemplate.templateName,
    },
    seo,
    html: resolveMediaInHtml(finalHtml, lazyLoad),
  };
}

async function renderLatestPostsFeed(templateName: string, pageData: any, query: Record<string, any>, options?: { mode?: 'public' | 'preview' | 'headless'; request?: PublicRouteContext }) {
  const apiBase = (process.env.VITE_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
  // Load active theme settings
  const themeId = await getActiveThemeId();
  let themeSettingsObj: Record<string, any> = {};
  try {
    themeSettingsObj = await getThemeSettingsValues(themeId);
  } catch {
    // Ignore
  }

  const postsPerPageTheme = themeSettingsObj.content?.postsPerPage;
  const postsPerPageSetting = postsPerPageTheme !== undefined && postsPerPageTheme !== null
    ? String(postsPerPageTheme)
    : (await getSetting('site.posts_per_page', '10')) || '10';

  const limit = parseInt(postsPerPageSetting, 10) || 10;
  
  const pageParam = parseInt(query.page, 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const offset = (currentPage - 1) * limit;

  const countResult = await db
    .select({ count: sql`count(*)` })
    .from(contents)
    .where(and(publicContentCondition(), eq(contents.type, 'article')));
  
  const totalItems = Number(countResult[0]?.count || 0);
  const totalPages = Math.ceil(totalItems / limit) || 1;

  const posts = await db
    .select()
    .from(contents)
    .where(and(publicContentCondition(), eq(contents.type, 'article')))
    .orderBy(desc(contents.publishedAt))
    .limit(limit)
    .offset(offset);

  const permalinkStructure = (await getSetting('site.permalink_structure', '/%postname%/')) || '/%postname%/';

  let postsHtml = '';
  if (posts.length === 0) {
    postsHtml = '<p class="no-posts">No published posts found.</p>';
  } else {
    postsHtml = '<div class="posts-feed" style="display: flex; flex-direction: column; gap: 40px; margin-top: 20px;">';
    for (const post of posts) {
      const formattedDate = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : '';
      const authorName = await getAuthorName(post.authorId);
      
      let postUrl = `/${post.slug}`;
      if (permalinkStructure === '/posts/%postname%/') {
        postUrl = `/posts/${post.slug}`;
      } else if (permalinkStructure === '/article/%postname%/') {
        postUrl = `/article/${post.slug}`;
      }

      const excerptText = post.excerpt || (post.body ? post.body.replace(/<[^>]*>/g, '').substring(0, 160) + '...' : '');

      postsHtml += `
        <article class="post-card" style="border-bottom: 1px solid var(--border, #dde2ea); padding-bottom: 30px;">
          <h2 class="post-title" style="margin: 0 0 10px 0; font-size: 1.8rem;">
            <a href="${escapeHtml(postUrl)}" style="color: var(--text-color, #1d2733); text-decoration: none;">${escapeHtml(post.title)}</a>
          </h2>
          <div class="post-meta" style="font-size: 0.88rem; color: var(--text-muted, #586273); margin-bottom: 15px;">
            <span>Published on ${escapeHtml(formattedDate)}</span>
            <span> by ${escapeHtml(authorName)}</span>
          </div>
          <p class="post-excerpt" style="margin: 0 0 15px 0; line-height: 1.6; color: var(--text-muted, #586273);">${escapeHtml(excerptText)}</p>
          <a href="${escapeHtml(postUrl)}" class="read-more" style="font-weight: 700; color: var(--primary-color, #0f6b5f); text-decoration: none;">Read More &rarr;</a>
        </article>
      `;
    }
    postsHtml += '</div>';

    if (totalPages > 1) {
      const basePath = pageData.url === '/' ? '' : pageData.url;
      const qParams = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (k !== 'page' && v !== undefined) {
          qParams.set(k, String(v));
        }
      });
      const qStr = qParams.toString();
      const prefix = qStr ? `?${qStr}&` : '?';

      const paginationMode = themeSettingsObj.content?.paginationMode || 'pagination';

      if (paginationMode === 'load-more') {
        postsHtml += `
          <div class="posts-pagination-container load-more-mode" data-current-page="${currentPage}" data-total-pages="${totalPages}" data-base-url="${basePath}${prefix}" data-api-base="${apiBase}" style="display: flex; justify-content: center; margin-top: 40px; margin-bottom: 20px; width: 100%;">
            <button class="load-more-btn" style="padding: 12px 24px; background: var(--primary-color); color: white; border: none; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; transition: opacity var(--animation-speed), transform var(--animation-speed);">Load More</button>
          </div>
        `;
      } else if (paginationMode === 'infinite-scroll') {
        postsHtml += `
          <div class="posts-pagination-container infinite-scroll-mode" data-current-page="${currentPage}" data-total-pages="${totalPages}" data-base-url="${basePath}${prefix}" data-api-base="${apiBase}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 40px; margin-bottom: 20px; width: 100%;">
            <div class="infinite-scroll-trigger" style="height: 10px; width: 100%;"></div>
            <p class="infinite-scroll-loading" style="display: none; text-align: center; color: var(--text-muted, #586273); font-weight: 600; margin: 0;">Loading more posts...</p>
          </div>
        `;
      } else if (paginationMode === 'lazy-load') {
        postsHtml += `
          <div class="posts-pagination-container lazy-load-mode" data-current-page="${currentPage}" data-total-pages="${totalPages}" data-base-url="${basePath}${prefix}" data-api-base="${apiBase}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 40px; margin-bottom: 20px; width: 100%;">
            <div class="lazy-load-trigger" style="height: 10px; width: 100%;"></div>
            <div class="lazy-load-indicator" style="display: none; align-items: center; gap: 10px; justify-content: center; margin: 0;">
              <svg class="lazy-load-spinner" viewBox="0 0 50 50" style="width: 28px; height: 28px; animation: spin-loader 1s linear infinite;">
                <circle class="path" cx="25" cy="25" r="20" fill="none" stroke="var(--primary-color, #0f6b5f)" stroke-width="4" stroke-linecap="round" style="stroke-dasharray: 1, 150; stroke-dashoffset: 0; animation: dash-loader 1.5s ease-in-out infinite;"></circle>
              </svg>
              <span style="color: var(--text-muted, #586273); font-weight: 600; font-size: 0.95rem;">Loading more posts...</span>
            </div>
            <style>
              @keyframes spin-loader {
                100% { transform: rotate(360deg); }
              }
              @keyframes dash-loader {
                0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
                50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
                100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
              }
            </style>
          </div>
        `;
      } else {
        postsHtml += `
          <nav class="pagination" style="display: flex; gap: 8px; margin-top: 40px; align-items: center; justify-content: center; flex-wrap: wrap;">
        `;

        if (currentPage > 1) {
          postsHtml += `<a href="${basePath}${prefix}page=${currentPage - 1}" class="page-link prev" style="padding: 8px 16px; border: 1px solid var(--border, #cbd3df); border-radius: 6px; text-decoration: none; font-weight: 600; color: var(--link-color, #0f6b5f);">&larr; Newer</a>`;
        }

        // Generate page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        if (endPage - startPage < maxVisiblePages - 1) {
          startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
          postsHtml += `<a href="${basePath}${prefix}page=1" class="page-link" style="padding: 8px 16px; border: 1px solid var(--border, #cbd3df); border-radius: 6px; text-decoration: none; font-weight: 600; color: var(--link-color, #0f6b5f);">1</a>`;
          if (startPage > 2) {
            postsHtml += `<span class="page-info" style="color: var(--text-muted, #586273); font-weight: 600; padding: 0 4px;">...</span>`;
          }
        }

        for (let i = startPage; i <= endPage; i++) {
          if (i === currentPage) {
            postsHtml += `<span class="page-link active" style="padding: 8px 16px; border: 1px solid var(--primary-color, #0f6b5f); background: var(--primary-color, #0f6b5f); color: white; border-radius: 6px; font-weight: 600; pointer-events: none;">${i}</span>`;
          } else {
            postsHtml += `<a href="${basePath}${prefix}page=${i}" class="page-link" style="padding: 8px 16px; border: 1px solid var(--border, #cbd3df); border-radius: 6px; text-decoration: none; font-weight: 600; color: var(--link-color, #0f6b5f);">${i}</a>`;
          }
        }

        if (endPage < totalPages) {
          if (endPage < totalPages - 1) {
            postsHtml += `<span class="page-info" style="color: var(--text-muted, #586273); font-weight: 600; padding: 0 4px;">...</span>`;
          }
          postsHtml += `<a href="${basePath}${prefix}page=${totalPages}" class="page-link" style="padding: 8px 16px; border: 1px solid var(--border, #cbd3df); border-radius: 6px; text-decoration: none; font-weight: 600; color: var(--link-color, #0f6b5f);">${totalPages}</a>`;
        }

        if (currentPage < totalPages) {
          postsHtml += `<a href="${basePath}${prefix}page=${currentPage + 1}" class="page-link next" style="padding: 8px 16px; border: 1px solid var(--border, #cbd3df); border-radius: 6px; text-decoration: none; font-weight: 600; color: var(--link-color, #0f6b5f);">Older &rarr;</a>`;
        }

        postsHtml += `</nav>`;
      }
    }
  }

  return renderWithTheme(templateName, {
    ...pageData,
    content: postsHtml,
    rawContent: null,
  }, postsHtml, options);
}

export async function renderHomePage(query: Record<string, any> = {}, options?: { mode?: 'public' | 'preview' | 'headless'; request?: PublicRouteContext }) {
  const homepageMode = (await getSetting('site.homepage_mode', 'single')) || 'single';

  if (homepageMode === 'posts') {
    return renderLatestPostsFeed('home', {
      title: 'Latest Posts',
      url: '/',
    }, query, options);
  }

  const content = await findPublicHomeContent();
  if (!content) {
    return renderErrorPage(404, 'Homepage Not Found', 'No published homepage content is configured.', options);
  }

  const permalinkStructure = (await getSetting('site.permalink_structure', '/%postname%/')) || '/%postname%/';
  const publicContent = await toPublicContent(content, permalinkStructure, options);
  return renderWithTheme('home', {
    ...publicContent,
    rawContent: publicContent,
  }, publicContent.content, options);
}

export async function renderContentPage(slug: string, query: Record<string, any> = {}, options?: { mode?: 'public' | 'preview' | 'headless'; request?: PublicRouteContext }) {
  const content = await findPublicContentBySlug(slug);
  if (!content) {
    return renderErrorPage(404, 'Page Not Found', 'The requested public content is not available.', options);
  }

  const postsPageTargetUuid = await getSetting('site.posts_page_target');
  if (postsPageTargetUuid && content.uuid === postsPageTargetUuid) {
    return renderLatestPostsFeed('page', {
      id: content.id,
      uuid: content.uuid,
      type: content.type,
      title: content.title,
      slug: content.slug,
      url: `/${content.slug}`,
      authorId: content.authorId,
    }, query, options);
  }

  const permalinkStructure = (await getSetting('site.permalink_structure', '/%postname%/')) || '/%postname%/';
  const publicContent = await toPublicContent(content, permalinkStructure, options);
  const template = content.type === 'article' ? 'post' : content.type;
  return renderWithTheme(template, {
    ...publicContent,
    rawContent: publicContent,
  }, publicContent.content, options);
}

export async function renderSearchPage(query: string, options?: { mode?: 'public' | 'preview' | 'headless'; request?: PublicRouteContext }) {
  const site = await getSiteContext();
  const results = await searchPublicContent(query);
  const permalinkStructure = (await getSetting('site.permalink_structure', '/%postname%/')) || '/%postname%/';
  const itemsHtml = results
    .map((item) => {
      let url = `/${item.slug}`;
      if (item.slug === 'home') {
        url = '/';
      } else if (item.type === 'article') {
        if (permalinkStructure === '/posts/%postname%/') {
          url = `/posts/${item.slug}`;
        } else if (permalinkStructure === '/article/%postname%/') {
          url = `/article/${item.slug}`;
        }
      }
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
  }, itemsHtml || '<p>No published content matched your search.</p>', options);
}

export async function renderErrorPage(statusCode: number, title: string, message: string, options?: { mode?: 'public' | 'preview' | 'headless'; request?: PublicRouteContext }) {
  const rendered = await renderWithTheme('error', {
    title,
    content: `<p>${escapeHtml(message)}</p>`,
    statusCode,
    rawContent: null,
  }, `<p>${escapeHtml(message)}</p>`, options);

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

  const permalinkStructure = (await getSetting('site.permalink_structure', '/%postname%/')) || '/%postname%/';
  const normalized = normalizeSlug(cleanPath);

  if (permalinkStructure === '/posts/%postname%/') {
    if (normalized.startsWith('posts/')) {
      const slug = normalized.substring(6);
      return {
        id: 'content.post',
        owner: 'core',
        pattern: '/posts/:slug',
        resolver: 'contentBySlug',
        template: 'post',
        params: {
          slug,
        },
      };
    }
  } else if (permalinkStructure === '/article/%postname%/') {
    if (normalized.startsWith('article/')) {
      const slug = normalized.substring(8);
      return {
        id: 'content.post',
        owner: 'core',
        pattern: '/article/:slug',
        resolver: 'contentBySlug',
        template: 'post',
        params: {
          slug,
        },
      };
    }
  }

  return {
    id: 'content.page',
    owner: 'core',
    pattern: '/:slug',
    resolver: 'contentBySlug',
    template: 'page',
    params: {
      slug: normalized,
    },
  };
}

export async function renderPublicRoute(urlPath: string, query: Record<string, any> = {}, options?: { mode?: 'public' | 'preview' | 'headless'; request?: PublicRouteContext }) {
  const route = await resolvePublicRoute(urlPath);

  if (route.resolver === 'home') return renderHomePage(query, options);
  if (route.resolver === 'search') return renderSearchPage(String(query.q || ''), options);
  if (route.resolver === 'contentBySlug') return renderContentPage((route as any).params.slug, query, options);

  return renderErrorPage(404, 'Route Not Found', 'No public route matched this path.', options);
}

export async function publicContentResponse(content: PublicContent | null, options?: { mode?: 'public' | 'preview' | 'headless'; request?: PublicRouteContext }) {
  const permalinkStructure = (await getSetting('site.permalink_structure', '/%postname%/')) || '/%postname%/';
  return {
    success: Boolean(content),
    data: content ? await toPublicContent(content, permalinkStructure, options) : null,
  };
}
