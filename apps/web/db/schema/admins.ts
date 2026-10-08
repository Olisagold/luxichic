import { boolean, index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authUsers } from 'drizzle-orm/supabase';
import { adminStatus, createdAt, updatedAt } from './_shared';
import { permissions } from './permissions';
import { roles } from './roles';

/** Back-office staff. Signs in through Supabase Auth; must have an active row here to use /admin. */
export const admins = pgTable('admins', {
  id: uuid('id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  /** The preset last applied; `null` means custom permissions. */
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
  /** The main administrator: has every permission and can't be suspended or removed. */
  isOwner: boolean('is_owner').notNull().default(false),
  status: adminStatus('status').notNull().default('active'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS();

/** Effective permissions per admin — what the server checks before every admin action. */
export const adminPermissions = pgTable(
  'admin_permissions',
  {
    adminId: uuid('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    permissionKey: text('permission_key')
      .notNull()
      .references(() => permissions.key, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.adminId, t.permissionKey] })],
).enableRLS();

export const loginHistory = pgTable(
  'login_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    browser: text('browser'),
    device: text('device'),
    location: text('location'),
    ipAddress: text('ip_address'),
    at: createdAt(),
  },
  (t) => [index('login_history_admin_at_idx').on(t.adminId, t.at)],
).enableRLS();
