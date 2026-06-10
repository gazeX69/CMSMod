import { mysqlTable, varchar, text, int, bigint, datetime, timestamp, boolean, primaryKey, index, uniqueIndex, AnyMySqlColumn } from 'drizzle-orm/mysql-core';


export const mediaFiles = mysqlTable('media_files', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  uuid: varchar('uuid', { length: 36 }).unique(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  extension: varchar('extension', { length: 50 }),
  size: bigint('size', { mode: 'number' }).notNull(),
  path: varchar('path', { length: 255 }).notNull(),
  publicUrl: varchar('public_url', { length: 255 }),
  disk: varchar('disk', { length: 50 }).notNull().default('local'),
  uploadedBy: bigint('uploaded_by', { mode: 'number' }),
  altText: text('alt_text'),
  caption: text('caption'),
  metadataJson: text('metadata_json'),
  deletedAt: datetime('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});