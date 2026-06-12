import { and, asc, count, desc, eq, like, or, sql } from 'drizzle-orm';
import type { ContentMetadataDefinition, ContentQuery, ContentRecord, ContentSummary, PageResult } from '@modern-cms/plugin-sdk';
import { db } from '../database/client.js';
import { contentMetadata, contents } from '../database/schema.js';
import { getSetting } from '../settings/settingsService.js';

const metadataDefinitions = new Map<string, Map<string, ContentMetadataDefinition>>();

function clampPage(query: ContentQuery = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

export async function resolveContentPermalink(input: { type: string; slug: string }) {
  if (input.slug === 'home') return '/';
  const structure = (await getSetting('site.permalink_structure', '/%postname%/')) || '/%postname%/';
  if (input.type === 'article') {
    if (structure === '/posts/%postname%/') return `/posts/${input.slug}`;
    if (structure === '/article/%postname%/') return `/article/${input.slug}`;
  }
  return `/${input.slug}`;
}

async function mapContent(row: typeof contents.$inferSelect, includeBody = false, includeMetadata = false): Promise<ContentSummary | ContentRecord> {
  const base: ContentSummary = {
    uuid: row.uuid,
    type: row.type,
    title: row.title,
    slug: row.slug,
    status: row.status,
    excerpt: row.excerpt,
    authorId: row.authorId,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    permalink: await resolveContentPermalink(row),
    featuredImage: row.featuredImageUrl ? {
      url: row.featuredImageUrl,
      assetUuid: row.featuredImageAssetUuid,
      alt: row.featuredImageAlt || '',
      source: row.featuredImageSource || 'external',
    } : null,
  };
  if (!includeBody) return base;
  return {
    ...base,
    body: row.body,
    metadata: includeMetadata ? Object.fromEntries((await getContentMetadata('*', row.uuid, 'public')).map((entry) => [entry.key, entry.value])) : undefined,
  };
}

export async function getContentByUuid(uuid: string, options: { includeBody?: boolean; includeMetadata?: boolean; publishedOnly?: boolean } = {}) {
  const filters = [eq(contents.uuid, uuid), sql`${contents.deletedAt} is null`];
  if (options.publishedOnly) filters.push(eq(contents.status, 'published'));
  const rows = await db.select().from(contents).where(and(...filters)).limit(1);
  if (!rows[0]) return null;
  return mapContent(rows[0], options.includeBody, options.includeMetadata) as Promise<ContentRecord>;
}

export async function listContent(query: ContentQuery = {}, publishedOnly = false): Promise<PageResult<ContentSummary | ContentRecord>> {
  const { page, limit, offset } = clampPage(query);
  const filters: any[] = [sql`${contents.deletedAt} is null`];
  if (publishedOnly) filters.push(eq(contents.status, 'published'));
  else if (query.status) filters.push(eq(contents.status, query.status));
  if (query.type) filters.push(eq(contents.type, query.type));
  if (query.authorId) filters.push(eq(contents.authorId, query.authorId));
  if (query.search) filters.push(or(like(contents.title, `%${query.search}%`), like(contents.excerpt, `%${query.search}%`), like(contents.body, `%${query.search}%`))!);
  const where = and(...filters);
  const sortColumn = query.sort === 'title' ? contents.title : query.sort === 'publishedAt' ? contents.publishedAt : query.sort === 'createdAt' ? contents.createdAt : contents.updatedAt;
  const orderBy = query.order === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const [rows, totals] = await Promise.all([
    db.select().from(contents).where(where).orderBy(orderBy).limit(limit).offset(offset),
    db.select({ value: count() }).from(contents).where(where),
  ]);
  const items = await Promise.all(rows.map((row) => mapContent(row, query.includeBody, false)));
  const total = Number(totals[0]?.value || 0);
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export function registerContentMetadataDefinition(owner: string, definition: ContentMetadataDefinition) {
  if (!definition.key || definition.key.includes('.')) throw new Error('Metadata definition key must be an unqualified key');
  const definitions = metadataDefinitions.get(owner) || new Map<string, ContentMetadataDefinition>();
  definitions.set(definition.key, definition);
  metadataDefinitions.set(owner, definitions);
  return { dispose: () => definitions.delete(definition.key) };
}

function validateMetadata(definition: ContentMetadataDefinition, value: unknown) {
  if (definition.type === 'string' && typeof value !== 'string') throw new Error(`Metadata ${definition.key} must be a string`);
  if (definition.type === 'number' && typeof value !== 'number') throw new Error(`Metadata ${definition.key} must be a number`);
  if (definition.type === 'boolean' && typeof value !== 'boolean') throw new Error(`Metadata ${definition.key} must be a boolean`);
  const serialized = JSON.stringify(value);
  if (serialized.length > (definition.maxLength || 65535)) throw new Error(`Metadata ${definition.key} exceeds size limit`);
  return serialized;
}

export async function setContentMetadata(owner: string, contentUuid: string, entries: Array<{ key: string; value: unknown }>) {
  const content = await getContentByUuid(contentUuid);
  if (!content) throw new Error('Content not found');
  const definitions = metadataDefinitions.get(owner);
  for (const entry of entries) {
    const definition = definitions?.get(entry.key);
    if (!definition) throw new Error(`Metadata definition not registered: ${owner}.${entry.key}`);
    const valueJson = validateMetadata(definition, entry.value);
    const existing = await db.select().from(contentMetadata).where(and(eq(contentMetadata.contentUuid, contentUuid), eq(contentMetadata.ownerPlugin, owner), eq(contentMetadata.metaKey, entry.key))).limit(1);
    const values = { valueJson, valueType: definition.type, visibility: definition.visibility || 'private', revisionPolicy: definition.revisionPolicy || 'none', updatedAt: new Date() };
    if (existing[0]) await db.update(contentMetadata).set(values).where(eq(contentMetadata.id, existing[0].id));
    else await db.insert(contentMetadata).values({ contentUuid, ownerPlugin: owner, metaKey: entry.key, ...values, createdAt: new Date() });
  }
}

export async function getContentMetadata(owner: string, contentUuid: string, visibility?: 'private' | 'admin' | 'public') {
  const filters: any[] = [eq(contentMetadata.contentUuid, contentUuid)];
  if (owner !== '*') filters.push(eq(contentMetadata.ownerPlugin, owner));
  if (visibility === 'public') filters.push(eq(contentMetadata.visibility, 'public'));
  else if (visibility === 'admin') filters.push(or(eq(contentMetadata.visibility, 'admin'), eq(contentMetadata.visibility, 'public'))!);
  const rows = await db.select().from(contentMetadata).where(and(...filters));
  return rows.map((row) => ({ key: `${row.ownerPlugin}.${row.metaKey}`, value: JSON.parse(row.valueJson), visibility: row.visibility as 'private' | 'admin' | 'public', updatedAt: row.updatedAt }));
}

export async function deleteContentMetadata(owner: string, contentUuid: string, keys: string[]) {
  for (const key of keys) {
    await db.delete(contentMetadata).where(and(eq(contentMetadata.contentUuid, contentUuid), eq(contentMetadata.ownerPlugin, owner), eq(contentMetadata.metaKey, key)));
  }
}
