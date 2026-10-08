import 'server-only';
import { cache } from 'react';
import { connection } from 'next/server';
import { asc, desc, eq } from 'drizzle-orm';
import type { User as AuthUser } from '@supabase/supabase-js';
import { db } from '@/db';
import { addresses, adminPermissions, admins, profiles, roles } from '@/db/schema';
import { authReady } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import type { AdminRole, AdminUser, Permission } from '@/types/admin';
import type { Address } from '@/types/order';
import type { User } from '@/types/user';

/** The signed-in Supabase Auth user, verified with the Auth server. Cached for the request. */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  // Always per request: a page that checks the session must never be prerendered at build time.
  await connection();
  if (!authReady()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export function toAddress(row: typeof addresses.$inferSelect): Address {
  return {
    id: row.id,
    label: row.label ?? undefined,
    country: row.country,
    state: row.state,
    city: row.city,
    street: row.street,
    houseNumber: row.houseNumber ?? undefined,
    landmark: row.landmark ?? undefined,
    instructions: row.instructions ?? undefined,
    isDefault: row.isDefault,
  };
}

/** The signed-in customer's account, or null for visitors, admins and blocked customers. */
export const getCustomer = cache(async (): Promise<User | null> => {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, authUser.id));
  if (!profile || profile.status === 'blocked') return null;
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, profile.id))
    .orderBy(desc(addresses.isDefault), asc(addresses.createdAt));
  return {
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone ?? '',
    addresses: rows.map(toAddress),
    createdAt: profile.createdAt.toISOString(),
    status: profile.status,
    lastActiveAt: profile.lastActiveAt?.toISOString(),
    pendingSetup: profile.pendingSetup,
  };
});

/** The signed-in administrator with their effective permissions, or null. Suspended admins are null. */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  const [row] = await db
    .select({ admin: admins, roleName: roles.name })
    .from(admins)
    .leftJoin(roles, eq(roles.id, admins.roleId))
    .where(eq(admins.id, authUser.id));
  if (!row || row.admin.status !== 'active') return null;
  const perms = await db
    .select({ key: adminPermissions.permissionKey })
    .from(adminPermissions)
    .where(eq(adminPermissions.adminId, row.admin.id));
  const a = row.admin;
  return {
    id: a.id,
    fullName: a.fullName,
    email: a.email,
    username: a.username ?? undefined,
    role: (row.roleName ?? 'Custom') as AdminRole,
    isOwner: a.isOwner,
    status: a.status,
    permissions: perms.map((p) => p.key as Permission),
    createdAt: a.createdAt.toISOString(),
    lastLoginAt: a.lastLoginAt?.toISOString(),
  };
});

export function hasPermission(admin: AdminUser, permission: Permission): boolean {
  return admin.isOwner || admin.permissions.includes(permission);
}

export class AuthorizationError extends Error {
  constructor(message = 'You do not have permission to do that.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Call first in every admin server action. Throws unless the caller is an active admin holding `permission`.
 * Hiding buttons in the UI is not security; this is.
 */
export async function requirePermission(permission?: Permission): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) throw new AuthorizationError('Please sign in as an administrator.');
  if (permission && !hasPermission(admin, permission)) throw new AuthorizationError();
  return admin;
}
