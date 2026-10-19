import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { admins } from './admins';
import { specialists } from './specialists';
import { createdAt, notificationKind } from './_shared';

/**
 * In-app notifications for the admin bell (new orders, low stock, …). Each admin sees the kinds their permissions
 * cover; an appointment notification with `specialistId` is also shown to that specialist's own admin login.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: notificationKind('kind').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    /** Admin page to open, e.g. /admin/orders/LXC-123456. */
    link: text('link'),
    /** Legacy shared read flag; reading is per admin (notification_reads). */
    readAt: timestamp('read_at', { withTimezone: true }),
    /** For appointment notifications: the specialist the booking belongs to. */
    specialistId: uuid('specialist_id').references(() => specialists.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('notifications_created_idx').on(t.createdAt)],
).enableRLS();

/** Which admin has read which notification. */
export const notificationReads = pgTable(
  'notification_reads',
  {
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.notificationId, t.adminId] }), index('notification_reads_admin_idx').on(t.adminId)],
).enableRLS();
