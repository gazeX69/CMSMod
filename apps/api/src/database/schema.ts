import { mysqlTable, varchar, text, int, bigint, datetime, timestamp, boolean, primaryKey, index, uniqueIndex, AnyMySqlColumn } from 'drizzle-orm/mysql-core';

export const settings = mysqlTable('settings', {
  key: varchar('key', { length: 255 }).primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  group: varchar('group', { length: 100 }).notNull().default('general'),
  type: varchar('type', { length: 50 }).notNull().default('string'),
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = mysqlTable('users', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const roles = mysqlTable('roles', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const permissions = mysqlTable('permissions', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  description: text('description'),
  source: varchar('source', { length: 50 }).notNull().default('core'),
  pluginKey: varchar('plugin_key', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index('permissions_source_idx').on(table.source),
  pluginKeyIdx: index('permissions_plugin_key_idx').on(table.pluginKey),
}));

export const userRoles = mysqlTable('user_roles', {
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: bigint('role_id', { mode: 'number' }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] }),
}));

export const rolePermissions = mysqlTable('role_permissions', {
  roleId: bigint('role_id', { mode: 'number' }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: bigint('permission_id', { mode: 'number' }).notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  permissionIdIdx: index('role_permissions_permission_id_idx').on(table.permissionId),
}));

export const sessions = mysqlTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  expiresAt: datetime('expires_at').notNull(),
  revokedAt: datetime('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const contents = mysqlTable('contents', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('page'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  authorId: bigint('author_id', { mode: 'number' }).references(() => users.id),
  excerpt: text('excerpt'),
  body: text('body'),
  publishedAt: datetime('published_at'),
  deletedAt: datetime('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  typeSlugIdx: uniqueIndex('type_slug_unique_idx').on(table.type, table.slug),
  typeIdx: index('contents_type_idx').on(table.type),
  statusIdx: index('contents_status_idx').on(table.status),
  publishedAtIdx: index('contents_published_at_idx').on(table.publishedAt),
  authorIdIdx: index('contents_author_id_idx').on(table.authorId),
  deletedAtIdx: index('contents_deleted_at_idx').on(table.deletedAt),
}));

export const contentRevisions = mysqlTable('content_revisions', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  contentId: bigint('content_id', { mode: 'number' }).notNull().references(() => contents.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  excerpt: text('excerpt'),
  body: text('body'),
  status: varchar('status', { length: 50 }),
  snapshotJson: text('snapshot_json'),
  revisionNumber: int('revision_number').notNull(),
  createdBy: bigint('created_by', { mode: 'number' }).references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  contentIdRevisionIdx: uniqueIndex('content_id_revision_unique_idx').on(table.contentId, table.revisionNumber),
  contentIdIdx: index('revisions_content_id_idx').on(table.contentId),
}));

export const categories = mysqlTable('categories', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  parentId: bigint('parent_id', { mode: 'number' }).references((): AnyMySqlColumn => categories.id),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  parentIdIdx: index('categories_parent_id_idx').on(table.parentId),
  sortOrderIdx: index('categories_sort_order_idx').on(table.sortOrder),
  slugIdx: index('categories_slug_idx').on(table.slug),
}));

export const tags = mysqlTable('tags', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('tags_slug_idx').on(table.slug),
}));

export const contentCategories = mysqlTable('content_categories', {
  contentId: bigint('content_id', { mode: 'number' }).notNull().references(() => contents.id, { onDelete: 'cascade' }),
  categoryId: bigint('category_id', { mode: 'number' }).notNull().references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.contentId, table.categoryId] }),
  categoryIdIdx: index('content_categories_category_id_idx').on(table.categoryId),
}));

export const contentTags = mysqlTable('content_tags', {
  contentId: bigint('content_id', { mode: 'number' }).notNull().references(() => contents.id, { onDelete: 'cascade' }),
  tagId: bigint('tag_id', { mode: 'number' }).notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.contentId, table.tagId] }),
  tagIdIdx: index('content_tags_tag_id_idx').on(table.tagId),
}));

export const navigationItems = mysqlTable('navigation_items', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  label: varchar('label', { length: 255 }).notNull(),
  url: varchar('url', { length: 255 }).notNull(),
  target: varchar('target', { length: 50 }).notNull().default('_self'),
  parentId: bigint('parent_id', { mode: 'number' }).references((): AnyMySqlColumn => navigationItems.id),
  sortOrder: int('sort_order').notNull().default(0),
  location: varchar('location', { length: 100 }).notNull().default('primary'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  locationIdx: index('navigation_items_location_idx').on(table.location),
  parentIdIdx: index('navigation_items_parent_id_idx').on(table.parentId),
  sortOrderIdx: index('navigation_items_sort_order_idx').on(table.sortOrder),
}));



export const plugins = mysqlTable('plugins', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  version: varchar('version', { length: 50 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('first-party-plugin'),
  status: varchar('status', { length: 50 }).notNull().default('DISCOVERED'),
  description: text('description'),
  manifestJson: text('manifest_json'),
  installedAt: datetime('installed_at').notNull(),
  activatedAt: datetime('activated_at'),
  deactivatedAt: datetime('deactivated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const pluginPermissions = mysqlTable('plugin_permissions', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  pluginKey: varchar('plugin_key', { length: 255 }).notNull(),
  permissionKey: varchar('permission_key', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pluginPermissionUniqueIdx: uniqueIndex('plugin_permission_unique_idx').on(table.pluginKey, table.permissionKey),
  pluginKeyIdx: index('plugin_permissions_plugin_key_idx').on(table.pluginKey),
}));

export const pluginEvents = mysqlTable('plugin_events', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  pluginKey: varchar('plugin_key', { length: 255 }).notNull(),
  eventName: varchar('event_name', { length: 255 }).notNull(),
  direction: varchar('direction', { length: 20 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pluginEventUniqueIdx: uniqueIndex('plugin_event_unique_idx').on(table.pluginKey, table.eventName, table.direction),
  eventNameIdx: index('plugin_events_event_name_idx').on(table.eventName),
}));

export const pluginMigrations = mysqlTable('plugin_migrations', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  pluginKey: varchar('plugin_key', { length: 255 }).notNull(),
  migration: varchar('migration', { length: 255 }).notNull(),
  checksum: varchar('checksum', { length: 64 }).notNull(),
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
}, (table) => ({
  pluginMigrationUniqueIdx: uniqueIndex('plugin_migration_unique_idx').on(table.pluginKey, table.migration),
  pluginKeyIdx: index('plugin_migrations_plugin_key_idx').on(table.pluginKey),
}));
