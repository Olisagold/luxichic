'use server';

import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { ActionError, adminAction, audit } from '@/lib/auth/admin-action';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUuid, isValidEmail, passwordError } from '@/lib/utils/validation';
import type { AdminUser, Permission } from '@/types/admin';
import type { Result } from '@/types/user';

/**
 * Admin users (`admins.manage`). Logins live in Supabase Auth; the database triggers keep `admins` in step and
 * remove the customer profile a new login would otherwise get. Rules, checked here on the server:
 * - the owner can't be edited, suspended or deleted;
 * - nobody changes their own permissions or status, or deletes themselves;
 * - only the owner can grant `admins.manage`, so an admin can't hand themselves full control.
 *
 * Until the email setup at launch (Phase 11), a new admin gets a temporary password from the person adding them;
 * they change it under Settings → Security. Invitation emails replace this then.
 */

const LINK = '/admin/admin-users';

type Draft = {
  fullName: string;
  email: string;
  username?: string;
  role: AdminUser['role'];
  status: AdminUser['status'];
  permissions: Permission[];
};

async function target(id: string) {
  if (!isUuid(id)) throw new ActionError('Admin not found.');
  const [row] = await db.select().from(s.admins).where(eq(s.admins.id, id));
  if (!row) throw new ActionError('Admin not found.');
  if (row.isOwner) throw new ActionError('The owner account can’t be changed here.');
  return row;
}

/** Validates a draft against the real role and permission lists, and the escalation rule. */
async function checkDraft(me: AdminUser, d: Draft) {
  const fullName = String(d?.fullName ?? '').trim();
  const email = String(d?.email ?? '').trim();
  const username = String(d?.username ?? '').trim() || null;
  if (fullName.length < 2) throw new ActionError('Enter the admin’s name.');
  if (!isValidEmail(email)) throw new ActionError('Enter a valid email address.');
  if (!['active', 'suspended'].includes(d?.status)) throw new ActionError('Choose a status.');
  const [role] = await db
    .select({ id: s.roles.id })
    .from(s.roles)
    .where(eq(s.roles.name, String(d?.role)));
  const wanted = [...new Set(Array.isArray(d?.permissions) ? d.permissions : [])];
  const known = wanted.length
    ? await db.select({ key: s.permissions.key }).from(s.permissions).where(inArray(s.permissions.key, wanted))
    : [];
  const permissions = known.map((k) => k.key as Permission);
  if (permissions.includes('admins.manage') && !me.isOwner) {
    throw new ActionError('Only the owner can let another admin manage admin users.');
  }
  return { fullName, email, username, roleId: role?.id ?? null, status: d.status, permissions };
}

const authError = (message: string | undefined, fallback: string) =>
  /already|exists|registered/i.test(message ?? '')
    ? 'This email already has a LUXICHIC login (perhaps a customer account). Use another email.'
    : fallback;

/** Adds an admin with a temporary password and the chosen role and permissions. */
export async function createAdmin(data: Draft & { password: string }): Promise<Result & { id?: string }> {
  return adminAction('admins.manage', async (me) => {
    const d = await checkDraft(me, data);
    const pw = passwordError(String(data?.password ?? ''));
    if (pw) throw new ActionError(pw);
    const [taken] = await db
      .select({ id: s.admins.id })
      .from(s.admins)
      .where(sql`lower(${s.admins.email}) = lower(${d.email})`);
    if (taken) throw new ActionError('An admin with this email already exists.');

    const { data: created, error } = await createAdminClient().auth.admin.createUser({
      email: d.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: d.fullName },
    });
    if (error || !created.user) throw new ActionError(authError(error?.message, 'Could not create the login.'));
    const id = created.user.id;
    try {
      await db.transaction(async (tx) => {
        await tx.insert(s.admins).values({
          id,
          fullName: d.fullName,
          email: d.email,
          username: d.username,
          roleId: d.roleId,
          status: d.status,
        });
        if (d.permissions.length) {
          await tx
            .insert(s.adminPermissions)
            .values(d.permissions.map((permissionKey) => ({ adminId: id, permissionKey })));
        }
        await audit(tx, me, {
          section: 'Admin Users',
          action: 'Created sub-admin',
          target: `${d.fullName} · ${data.role}`,
          link: LINK,
        });
      });
    } catch (e) {
      // Don't leave a login without an admin record behind.
      await createAdminClient().auth.admin.deleteUser(id);
      throw e;
    }
    return { ok: true, id };
  });
}

/** Saves an admin's details, role, status and permissions. */
export async function updateAdmin(id: string, data: Draft): Promise<Result> {
  return adminAction('admins.manage', async (me) => {
    const row = await target(id);
    const d = await checkDraft(me, data);
    if (row.id === me.id) {
      const current = (await db.select().from(s.adminPermissions).where(eq(s.adminPermissions.adminId, row.id)))
        .map((p) => p.permissionKey)
        .sort()
        .join();
      if (current !== [...d.permissions].sort().join() || d.status !== row.status) {
        throw new ActionError('You can’t change your own permissions or status. Ask the owner.');
      }
    }
    if (d.email.toLowerCase() !== row.email.toLowerCase()) {
      // Changes the login; the email-change trigger copies it to `admins`.
      const { error } = await createAdminClient().auth.admin.updateUserById(row.id, {
        email: d.email,
        email_confirm: true,
      });
      if (error) throw new ActionError(authError(error.message, 'Could not change the email.'));
    }
    const permsChanged =
      (await db.select().from(s.adminPermissions).where(eq(s.adminPermissions.adminId, row.id)))
        .map((p) => p.permissionKey)
        .sort()
        .join() !== [...d.permissions].sort().join();
    await db.transaction(async (tx) => {
      await tx
        .update(s.admins)
        .set({ fullName: d.fullName, username: d.username, roleId: d.roleId, status: d.status, updatedAt: new Date() })
        .where(eq(s.admins.id, row.id));
      await tx.delete(s.adminPermissions).where(eq(s.adminPermissions.adminId, row.id));
      if (d.permissions.length) {
        await tx
          .insert(s.adminPermissions)
          .values(d.permissions.map((permissionKey) => ({ adminId: row.id, permissionKey })));
      }
      await audit(tx, me, {
        section: 'Admin Users',
        action: permsChanged
          ? 'Changed permissions'
          : d.status !== row.status
            ? `Set admin ${d.status}`
            : 'Edited admin user',
        target: d.fullName,
        link: LINK,
      });
    });
    return { ok: true };
  });
}

/** Sets a new temporary password for another admin (share it with them securely). */
export async function resetAdminPassword(id: string, password: string): Promise<Result> {
  return adminAction('admins.manage', async (me) => {
    const row = await target(id);
    if (row.id === me.id) throw new ActionError('Change your own password under Settings → Security.');
    const pw = passwordError(String(password ?? ''));
    if (pw) throw new ActionError(pw);
    const { error } = await createAdminClient().auth.admin.updateUserById(row.id, { password });
    if (error) throw new ActionError('Could not set the password.');
    await audit(db, me, {
      section: 'Admin Users',
      action: 'Reset sub-admin password',
      target: row.fullName,
      link: LINK,
    });
    return { ok: true };
  });
}

/** Removes an admin's login. Their past actions stay in the activity log under their name. */
export async function deleteAdmin(id: string): Promise<Result> {
  return adminAction('admins.manage', async (me) => {
    const row = await target(id);
    if (row.id === me.id) throw new ActionError('You can’t delete your own account.');
    const { error } = await createAdminClient().auth.admin.deleteUser(row.id);
    if (error) throw new ActionError('Could not delete the login.');
    await audit(db, me, { section: 'Admin Users', action: 'Deleted admin user', target: row.fullName, link: LINK });
    return { ok: true };
  });
}
