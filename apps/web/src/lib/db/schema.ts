import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    status: text('status').notNull().default('draft'),
    themeManifest: jsonb('theme_manifest'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('projects_status_idx').on(table.status)],
);

export const captures = pgTable(
  'captures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    screenshotUrl: text('screenshot_url').notNull(),
    scrollPosition: integer('scroll_position').notNull().default(0),
    viewport: jsonb('viewport').notNull(),
    order: integer('order').notNull().default(0),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('captures_project_id_idx').on(table.projectId)],
);

export const storyboards = pgTable(
  'storyboards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    scenes: jsonb('scenes').notNull(),
    version: integer('version').notNull().default(1),
    status: text('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('storyboards_project_id_idx').on(table.projectId)],
);

export const providerKeys = pgTable(
  'provider_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    providerId: text('provider_id').notNull(),
    encryptedKey: text('encrypted_key').notNull(),
    keyHint: text('key_hint').notNull(),
    isValid: boolean('is_valid'),
    lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('provider_keys_provider_id_idx').on(table.providerId)],
);

export const taskRouting = pgTable(
  'task_routing',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskType: text('task_type').notNull().unique(),
    primaryProviderId: text('primary_provider_id').notNull(),
    primaryModel: text('primary_model'),
    fallbackProviderId: text('fallback_provider_id'),
    fallbackModel: text('fallback_model'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('task_routing_task_type_idx').on(table.taskType)],
);

export const usageLogs = pgTable(
  'usage_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id'),
    providerId: text('provider_id').notNull(),
    taskType: text('task_type').notNull(),
    tokensIn: integer('tokens_in').notNull().default(0),
    tokensOut: integer('tokens_out').notNull().default(0),
    estimatedCost: doublePrecision('estimated_cost').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('usage_logs_project_idx').on(table.projectId),
    index('usage_logs_provider_idx').on(table.providerId),
  ],
);

export type ProviderKey = typeof providerKeys.$inferSelect;
export type NewProviderKey = typeof providerKeys.$inferInsert;
export type TaskRoutingRow = typeof taskRouting.$inferSelect;
export type UsageLog = typeof usageLogs.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type CaptureRow = typeof captures.$inferSelect;
export type StoryboardRow = typeof storyboards.$inferSelect;
export type NewStoryboard = typeof storyboards.$inferInsert;
