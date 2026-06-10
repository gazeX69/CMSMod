import { mysqlTable, varchar, text, int, bigint, datetime, timestamp, boolean, primaryKey, index, uniqueIndex } from 'drizzle-orm/mysql-core';
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
export const userRoles = mysqlTable('user_roles', {
    userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    roleId: bigint('role_id', { mode: 'number' }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
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
    parentId: bigint('parent_id', { mode: 'number' }).references(() => categories.id),
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
export const plugins = mysqlTable('plugins', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    key: varchar('key', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    version: varchar('version', { length: 50 }).notNull(),
    type: varchar('type', { length: 50 }).notNull().default('first-party-plugin'),
    status: varchar('status', { length: 50 }).notNull().default('inactive'), // 'active' | 'inactive' | 'missing' | 'broken'
    description: text('description'),
    manifestJson: text('manifest_json'),
    installedAt: datetime('installed_at').notNull(),
    activatedAt: datetime('activated_at'),
    deactivatedAt: datetime('deactivated_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=schema.js.map