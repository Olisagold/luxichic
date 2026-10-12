import 'server-only';
import { revalidateTag } from 'next/cache';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { AuthorizationError, requirePermission } from '@/lib/auth/session';
import type { AdminUser, Permission } from '@/types/admin';
import type { Result } from '@/types/user';

/**
 * The shape of every admin server action: check the permission on the server, run, turn refusals into a message
 * for the screen, and refresh caches the change affects. Use `audit` inside to record it in `audit_logs`.
 */

/** A reason an admin action can't go ahead, shown to the admin. Throwing it inside a transaction rolls it back. */
export class ActionError extends Error {}

export async function adminAction<T extends Result>(
  permission: Permission,
  fn: (admin: AdminUser) => Promise<T>,
  options: { revalidate?: string[] } = {},
): Promise<T | Result> {
  try {
    const result = await fn(await requirePermission(permission));
    if (result.ok) options.revalidate?.forEach((tag) => revalidateTag(tag));
    return result;
  } catch (e) {
    if (e instanceof AuthorizationError || e instanceof ActionError) return { ok: false, error: e.message };
    throw e;
  }
}

type Writer = Pick<typeof db, 'insert'>;

/** Records an admin action in the activity log (pass the transaction when inside one). */
export async function audit(
  writer: Writer,
  admin: AdminUser,
  entry: { section: string; action: string; target?: string; link?: string },
): Promise<void> {
  await writer.insert(auditLogs).values({ adminId: admin.id, adminName: admin.fullName, ...entry });
}
