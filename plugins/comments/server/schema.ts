import { mysqlTable, varchar, text, bigint, timestamp, index } from 'drizzle-orm/mysql-core';

export const comments = mysqlTable('comments', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  uuid: varchar('uuid', { length: 36 }).notNull().unique(),
  targetType: varchar('target_type', { length: 50 }).notNull(),
  targetUuid: varchar('target_uuid', { length: 36 }).notNull(),
  parentCommentUuid: varchar('parent_comment_uuid', { length: 36 }),
  authorId: bigint('author_id', { mode: 'number' }),
  guestName: varchar('guest_name', { length: 100 }),
  guestEmail: varchar('guest_email', { length: 100 }),
  body: text('body').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    targetIdx: index('target_idx').on(table.targetType, table.targetUuid),
    parentIdx: index('parent_idx').on(table.parentCommentUuid),
    statusIdx: index('status_idx').on(table.status),
  };
});
