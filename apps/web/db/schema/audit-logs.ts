import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { admins } from './admins';
import { createdAt } from './_shared';

/** Every admin action (who, what, when). Shown in Admin → Activity log. */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    /** Snapshot so entries stay readable after an admin is removed. */
    adminName: text('admin_name').notNull(),
    /** Admin area, e.g. "Orders", "Payments", "Settings". */
    section: text('section').notNull(),
    action: text('action').notNull(),
    target: text('target'),
    link: text('link'),
    createdAt: createdAt(),
  },
  (t) => [index('audit_logs_created_idx').on(t.createdAt), index('audit_logs_admin_idx').on(t.adminId)],
).enableRLS();
