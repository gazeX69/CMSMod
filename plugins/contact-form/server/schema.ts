import { mysqlTable, varchar, text, bigint, timestamp, index } from 'drizzle-orm/mysql-core';

export const contactForms = mysqlTable('contact_forms', {
  uuid: varchar('uuid', { length: 36 }).primaryKey().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  fieldsSchemaJson: text('fields_schema_json').notNull(),
  emailNotifications: varchar('email_notifications', { length: 255 }),
  successMessage: text('success_message'),
  submitButtonText: varchar('submit_button_text', { length: 100 }).notNull().default('Submit'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const contactSubmissions = mysqlTable('contact_submissions', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  uuid: varchar('uuid', { length: 36 }).notNull().unique(),
  formUuid: varchar('form_uuid', { length: 36 }).notNull(),
  submittedDataJson: text('submitted_data_json').notNull(),
  metadataJson: text('metadata_json'),
  status: varchar('status', { length: 50 }).notNull().default('new'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => {
  return {
    formUuidIdx: index('form_uuid_idx').on(table.formUuid),
    statusIdx: index('status_idx').on(table.status),
  };
});
