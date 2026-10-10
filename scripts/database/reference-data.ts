/**
 * Reference data every environment needs (including production): the permission list and the built-in
 * role presets from apps/web/data/adminSeed.ts. Safe to run repeatedly; it only adds what's missing and
 * refreshes labels.
 */
import { sql } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import * as s from '../../apps/web/db/schema';
import { permissionGroups, rolePresets } from '../../apps/web/data/adminSeed';

/** The database or a transaction on it. */
type Db = PgDatabase<PostgresJsQueryResultHKT, typeof s>;

export const allPermissionKeys = permissionGroups.flatMap((g) => g.items.map((i) => i.key));

/** Returns the id of each system role by name. */
export async function syncReferenceData(db: Db): Promise<Map<string, string>> {
  await db
    .insert(s.permissions)
    .values(
      permissionGroups.flatMap((g, gi) =>
        g.items.map((p, i) => ({ key: p.key, label: p.label, groupLabel: g.label, sortOrder: gi * 100 + i })),
      ),
    )
    .onConflictDoUpdate({
      target: s.permissions.key,
      set: {
        label: sql`excluded.label`,
        groupLabel: sql`excluded.group_label`,
        sortOrder: sql`excluded.sort_order`,
      },
    });

  const roleIds = new Map<string, string>();
  for (const [name, perms] of Object.entries(rolePresets)) {
    const [role] = await db
      .insert(s.roles)
      .values({ name, isSystem: true })
      .onConflictDoUpdate({ target: s.roles.name, set: { isSystem: true } })
      .returning({ id: s.roles.id });
    roleIds.set(name, role.id);
    if (perms.length) {
      await db
        .insert(s.rolePermissions)
        .values(perms.map((p) => ({ roleId: role.id, permissionKey: p })))
        .onConflictDoNothing();
    }
  }
  return roleIds;
}
