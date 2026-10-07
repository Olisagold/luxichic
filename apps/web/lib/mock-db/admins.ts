import type { AdminUser, Permission } from '@/types/admin';
import type { Result } from '@/types/user';
import { getDb, logActivity, updateDb } from '@/lib/mock-db/db';
import { generateId } from '@/lib/utils/references';

/**
 * Admin users service. The main administrator sets sub-admin credentials.
 * PROTOTYPE: passwords live in the mock store; production must hash them server-side
 * and never return them to the browser.
 */

export function createAdmin(
  actor: AdminUser,
  data: {
    fullName: string;
    email: string;
    username?: string;
    password: string;
    role: AdminUser['role'];
    status: AdminUser['status'];
    permissions: Permission[];
  },
): Result {
  if (!actor.isOwner && !actor.permissions.includes('admins.manage'))
    return { ok: false, error: 'You do not have permission to manage admin users.' };
  if (getDb().admins.some((a) => a.email.toLowerCase() === data.email.trim().toLowerCase()))
    return { ok: false, error: 'An admin with this email already exists.' };
  updateDb((d) => {
    d.admins.push({
      id: generateId('adm'),
      fullName: data.fullName.trim(),
      email: data.email.trim(),
      username: data.username?.trim() || undefined,
      password: data.password,
      role: data.role,
      isOwner: false,
      status: data.status,
      permissions: data.permissions,
      createdAt: new Date().toISOString(),
    });
    logActivity(d, actor, 'Admin Users', 'Created sub-admin', `${data.fullName} · ${data.role}`, '/admin/admin-users');
  });
  return { ok: true };
}

export function updateAdmin(
  actor: AdminUser,
  id: string,
  patch: Partial<Pick<AdminUser, 'fullName' | 'email' | 'username' | 'role' | 'status' | 'permissions'>>,
) {
  updateDb((d) => {
    const a = d.admins.find((x) => x.id === id);
    if (!a || a.isOwner) return;
    const permsChanged = patch.permissions && patch.permissions.join() !== a.permissions.join();
    Object.assign(a, patch);
    logActivity(
      d,
      actor,
      'Admin Users',
      permsChanged ? 'Changed permissions' : 'Edited admin user',
      `${a.fullName}${patch.status ? ` · ${patch.status}` : ''}`,
    );
  });
}

export function resetAdminPassword(actor: AdminUser, id: string, password: string) {
  updateDb((d) => {
    const a = d.admins.find((x) => x.id === id);
    if (!a || a.isOwner) return;
    a.password = password;
    logActivity(d, actor, 'Admin Users', 'Reset sub-admin password', a.fullName);
  });
}

export function deleteAdmin(actor: AdminUser, id: string) {
  updateDb((d) => {
    const a = d.admins.find((x) => x.id === id);
    if (!a || a.isOwner) return;
    d.admins = d.admins.filter((x) => x.id !== id);
    logActivity(d, actor, 'Admin Users', 'Deleted admin user', a.fullName);
  });
}
