import { db } from '../database/client.js';
import { widgets, contents } from '../database/schema.js';
import { eq, and, desc, isNull, lte } from 'drizzle-orm';
import { getSetting } from '../settings/settingsService.js';

export interface WidgetInstance {
  id: number;
  themeId: string;
  region: string;
  type: string;
  title: string;
  settingsJson: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ───────────────────────────────────────────────
// CRUD Operations
// ───────────────────────────────────────────────

export async function getWidgetsForTheme(themeId: string): Promise<WidgetInstance[]> {
  return db
    .select()
    .from(widgets)
    .where(eq(widgets.themeId, themeId))
    .orderBy(widgets.sortOrder);
}

export async function getWidgetsForRegion(themeId: string, region: string): Promise<WidgetInstance[]> {
  return db
    .select()
    .from(widgets)
    .where(and(eq(widgets.themeId, themeId), eq(widgets.region, region)))
    .orderBy(widgets.sortOrder);
}

export async function createWidget(input: {
  themeId: string;
  region: string;
  type: string;
  title: string;
  settings?: Record<string, any>;
  sortOrder?: number;
}): Promise<number> {
  const settingsJson = input.settings ? JSON.stringify(input.settings) : null;
  
  const [result] = await db.insert(widgets).values({
    themeId: input.themeId,
    region: input.region,
    type: input.type,
    title: input.title,
    settingsJson,
    sortOrder: input.sortOrder ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return (result as any).insertId;
}

export async function updateWidget(
  id: number,
  input: {
    title?: string;
    region?: string;
    settings?: Record<string, any>;
    sortOrder?: number;
  }
): Promise<void> {
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.region !== undefined) updateData.region = input.region;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
  if (input.settings !== undefined) {
    updateData.settingsJson = input.settings ? JSON.stringify(input.settings) : null;
  }

  await db.update(widgets).set(updateData).where(eq(widgets.id, id));
}

export async function deleteWidget(id: number): Promise<void> {
  await db.delete(widgets).where(eq(widgets.id, id));
}

// ───────────────────────────────────────────────
// Widget HTML Rendering
// ───────────────────────────────────────────────

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function renderRecentPostsWidget(widget: WidgetInstance): Promise<string> {
  let limit = 5;
  try {
    if (widget.settingsJson) {
      const parsed = JSON.parse(widget.settingsJson);
      if (typeof parsed.limit === 'number' && parsed.limit > 0) {
        limit = parsed.limit;
      }
    }
  } catch {
    // Ignore settings parsing errors
  }

  // Fetch recent posts
  const futureBuffer = new Date(Date.now() + 5 * 60 * 1000);
  const posts = await db
    .select({
      title: contents.title,
      slug: contents.slug,
      type: contents.type,
      publishedAt: contents.publishedAt,
    })
    .from(contents)
    .where(
      and(
        eq(contents.status, 'published'),
        eq(contents.type, 'article'),
        isNull(contents.deletedAt),
        lte(contents.publishedAt, futureBuffer)
      )
    )
    .orderBy(desc(contents.publishedAt))
    .limit(limit);

  const permalinkStructure = (await getSetting('site.permalink_structure', '/%postname%/')) || '/%postname%/';

  let listHtml = '';
  if (posts.length === 0) {
    listHtml = '<li>No recent posts found.</li>';
  } else {
    for (const post of posts) {
      let postUrl = `/${post.slug}`;
      if (permalinkStructure === '/posts/%postname%/') {
        postUrl = `/posts/${post.slug}`;
      } else if (permalinkStructure === '/article/%postname%/') {
        postUrl = `/article/${post.slug}`;
      }

      listHtml += `<li><a href="${escapeHtml(postUrl)}">${escapeHtml(post.title)}</a></li>`;
    }
  }

  return `
    <div class="widget widget-recent-posts" id="widget-${widget.id}">
      ${widget.title ? `<h4 class="widget-title">${escapeHtml(widget.title)}</h4>` : ''}
      <ul>
        ${listHtml}
      </ul>
    </div>
  `;
}

function renderSearchWidget(widget: WidgetInstance): Promise<string> {
  const html = `
    <div class="widget widget-search" id="widget-${widget.id}">
      ${widget.title ? `<h4 class="widget-title">${escapeHtml(widget.title)}</h4>` : ''}
      <form action="/search" method="GET" class="widget-search-form">
        <input type="text" name="q" placeholder="Search..." required style="width: 100%; padding: 8px; border: 1px solid rgba(0,0,0,0.15); border-radius: 4px; box-sizing: border-box; margin-bottom: 8px;" />
        <button type="submit" style="width: 100%; padding: 8px; background: var(--primary-color, #0f6b5f); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Search</button>
      </form>
    </div>
  `;
  return Promise.resolve(html);
}

function renderCustomHtmlWidget(widget: WidgetInstance): Promise<string> {
  let content = '';
  try {
    if (widget.settingsJson) {
      const parsed = JSON.parse(widget.settingsJson);
      content = parsed.content || '';
    }
  } catch {
    // Ignore
  }

  const html = `
    <div class="widget widget-custom-html" id="widget-${widget.id}">
      ${widget.title ? `<h4 class="widget-title">${escapeHtml(widget.title)}</h4>` : ''}
      <div class="widget-content">
        ${content}
      </div>
    </div>
  `;
  return Promise.resolve(html);
}

export async function renderWidget(widget: WidgetInstance): Promise<string> {
  if (widget.type === 'recent_posts') {
    return renderRecentPostsWidget(widget);
  }
  if (widget.type === 'search') {
    return renderSearchWidget(widget);
  }
  if (widget.type === 'html') {
    return renderCustomHtmlWidget(widget);
  }
  return `<!-- Unknown widget type: ${widget.type} -->`;
}

export async function renderRegionWidgetsHtml(themeId: string, region: string): Promise<string> {
  const widgetList = await getWidgetsForRegion(themeId, region);
  
  let html = '';
  for (const widget of widgetList) {
    html += await renderWidget(widget);
  }
  return html;
}
