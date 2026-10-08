import { boolean, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt } from './_shared';
import { permissions } from './permissions';

/** Role presets (Super Admin, Order Manager, …). Applying one copies its permissions to the admin. */
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  /** Built-in roles can't be deleted. */
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: createdAt(),
}).enableRLS();

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionKey: text('permission_key')
      .notNull()
      .references(() => permissions.key, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })],
).enableRLS();
