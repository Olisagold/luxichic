import 'server-only';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import type { AdminTeam } from '@/components/admin/AdminTeamProvider';
import type { ActivityEntry, ActivitySection, AdminRole, AdminUser, Permission } from '@/types/admin';

/** Every admin with their role and permissions, owner first. */
export async function listAdmins(): Promise<AdminUser[]> {
  const rows = await db
    .select({
      a: s.admins,
      roleName: s.roles.name,
      specialistId: s.specialistAccounts.specialistId,
      specialistName: s.specialists.name,
    })
    .from(s.admins)
    .leftJoin(s.roles, eq(s.roles.id, s.admins.roleId))
    .leftJoin(s.specialistAccounts, eq(s.specialistAccounts.adminId, s.admins.id))
    .leftJoin(s.specialists, eq(s.specialists.id, s.specialistAccounts.specialistId))
    .orderBy(desc(s.admins.isOwner), asc(s.admins.createdAt));
  const perms = await db.select().from(s.adminPermissions);
  return rows.map(({ a, roleName, specialistId, specialistName }) => ({
    id: a.id,
    fullName: a.fullName,
    email: a.email,
    username: a.username ?? undefined,
    role: (roleName ?? 'Custom') as AdminRole,
    isOwner: a.isOwner,
    status: a.status,
    permissions: perms.filter((p) => p.adminId === a.id).map((p) => p.permissionKey as Permission),
    createdAt: a.createdAt.toISOString(),
    lastLoginAt: a.lastLoginAt?.toISOString(),
    specialistId: specialistId ?? undefined,
    specialistName: specialistName ?? undefined,
  }));
}

/** Specialists an admin login can be linked to (not archived). */
async function linkableSpecialists() {
  const rows = await db
    .select({
      id: s.specialists.id,
      name: s.specialists.name,
      title: s.specialists.title,
      status: s.specialists.status,
    })
    .from(s.specialists)
    .orderBy(asc(s.specialists.name));
  return rows.filter((r) => r.status !== 'archived').map(({ id, name, title }) => ({ id, name, title }));
}

/** The latest activity-log entries, newest first. */
async function recentActivity(limit = 2000): Promise<ActivityEntry[]> {
  const rows = await db.select().from(s.auditLogs).orderBy(desc(s.auditLogs.createdAt)).limit(limit);
  return rows.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    adminId: r.adminId ?? '',
    adminName: r.adminName,
    section: r.section as ActivitySection,
    action: r.action,
    target: r.target ?? undefined,
    link: r.link ?? undefined,
  }));
}

/**
 * Data for an administration page, or null when the admin lacks `permission` (the page explains). The admin list
 * is needed everywhere (names, role counts); the activity log only where asked.
 */
export async function teamFor(permission: Permission, options: { activity?: boolean } = {}): Promise<AdminTeam | null> {
  const admin = await getAdmin();
  if (!admin || !hasPermission(admin, permission)) return null;
  return {
    admins: await listAdmins(),
    activity: options.activity ? await recentActivity() : [],
    specialists: await linkableSpecialists(),
  };
}
