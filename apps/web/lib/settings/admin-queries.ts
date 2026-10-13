import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { loadEmailTemplates, loadNotifications, loadStoreSettings } from '@/lib/settings/store';
import { botInfo, telegramConfigured } from '@/lib/telegram/client';
import type { AdminSettings } from '@/components/admin/AdminSettingsProvider';
import type { AdminUser, LoginEntry, Permission } from '@/types/admin';

/**
 * Data for an admin operations/settings page, or null when the admin lacks `permission` (the page explains).
 * Pass `permission: null` for pages every admin may open (notifications, security). `telegram` checks the bot
 * connection; `logins` adds the recent sign-ins.
 */
export async function settingsFor(
  permission: Permission | null,
  options: { telegram?: boolean; logins?: boolean } = {},
): Promise<AdminSettings | null> {
  const admin = await getAdmin();
  if (!admin || (permission && !hasPermission(admin, permission))) return null;
  const { settings, email, telegram } = await loadStoreSettings();
  let status: AdminSettings['telegram']['status'] = {
    connected: false,
    reason: 'Add TELEGRAM_BOT_TOKEN to the environment (Vercel) to connect the bot.',
  };
  if (options.telegram && telegramConfigured()) {
    const info = await botInfo();
    status = info.ok ? { connected: true, username: info.username } : { connected: false, reason: info.error };
  }
  return {
    settings,
    email,
    resendConfigured: !!env.RESEND_API_KEY,
    templates: await loadEmailTemplates(),
    notifications: await loadNotifications(),
    telegram: { ...telegram, status, envChatId: !!env.TELEGRAM_ADMIN_CHAT_ID },
    logins: options.logins ? await recentLogins(admin) : [],
  };
}

/** The admin's own recent sign-ins; the owner and admins with `admins.manage` see everyone's. */
async function recentLogins(admin: AdminUser): Promise<LoginEntry[]> {
  const everyone = admin.isOwner || hasPermission(admin, 'admins.manage');
  const rows = await db
    .select({ l: s.loginHistory, name: s.admins.fullName, email: s.admins.email })
    .from(s.loginHistory)
    .innerJoin(s.admins, eq(s.admins.id, s.loginHistory.adminId))
    .where(everyone ? undefined : eq(s.loginHistory.adminId, admin.id))
    .orderBy(desc(s.loginHistory.at))
    .limit(30);
  return rows.map(({ l, name, email }) => ({
    id: l.id,
    adminId: l.adminId,
    adminName: name,
    email,
    at: l.at.toISOString(),
    browser: l.browser ?? 'Unknown browser',
    device: l.device ?? 'unknown device',
    location: l.location ?? 'Unknown location',
  }));
}
