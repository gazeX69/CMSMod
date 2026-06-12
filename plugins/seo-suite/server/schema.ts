import { bigint, boolean, datetime, index, int, mysqlTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

export const seoRedirects = mysqlTable('seo_redirects', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  sourcePath: varchar('source_path', { length: 512 }).notNull(),
  targetUrl: varchar('target_url', { length: 2048 }).notNull(),
  statusCode: int('status_code').notNull().default(301),
  isActive: boolean('is_active').notNull().default(true),
  hitCount: bigint('hit_count', { mode: 'number' }).notNull().default(0),
  lastHitAt: datetime('last_hit_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sourceUnique: uniqueIndex('seo_redirects_source_unique').on(table.sourcePath),
  activeIndex: index('seo_redirects_active_idx').on(table.isActive),
}));
