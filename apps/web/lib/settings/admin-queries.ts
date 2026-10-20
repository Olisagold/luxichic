import 'server-only';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { notificationsFor } from '@/lib/notifications/for-admin';
import { DEFAULT_TELEGRAM, loadEmailTemplates, loadStoreSettings } from '@/lib/settings/store';
import { botInfo, telegramConfigured } from '@/lib/telegram/client';
import type { AdminSettings, TelegramSpecialist } from '@/components/admin/AdminSettingsProvider';
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
  // Pages every admin can open (Notifications, Security) don't need the store's settings unless the admin manages
  // them: a specialist's browser gets no email templates, sender or Telegram chats.
  const limited = !permission && !hasPermission(admin, 'settings.general');
  let status: AdminSettings['telegram']['status'] = {
    connected: false,
    reason: 'Add TELEGRAM_BOT_TOKEN to the environment (Vercel) to connect the bot.',
  };
  if (options.telegram && telegramConfigured()) {
    const info = await botInfo();
    status = info.ok ? { connected: true, username: info.username } : { connected: false, reason: info.error };
  }
  return {
    settings: limited ? { ...settings, smtp: { ...settings.smtp, senderEmail: '', username: '' } } : settings,
    email: limited ? { senderName: '', senderEmail: '', replyTo: '' } : email,
    resendConfigured: !!env.RESEND_API_KEY,
    templates: limited ? [] : await loadEmailTemplates(),
    notifications: await notificationsFor(admin),
    telegram: {
      ...(limited ? DEFAULT_TELEGRAM : telegram),
      status,
      envChatId: !!env.TELEGRAM_ADMIN_CHAT_ID,
      specialists: options.telegram ? await telegramSpecialists() : [],
    },
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

/** Specialists (not archived) with their Telegram connection and linked admin login. */
async function telegramSpecialists(): Promise<TelegramSpecialist[]> {
  const rows = await db
    .select({ sp: s.specialists, acc: s.specialistAccounts, adminName: s.admins.fullName })
    .from(s.specialists)
    .leftJoin(s.specialistAccounts, eq(s.specialistAccounts.specialistId, s.specialists.id))
    .leftJoin(s.admins, eq(s.admins.id, s.specialistAccounts.adminId))
    .orderBy(asc(s.specialists.name));
  return rows
    .filter((r) => r.sp.status !== 'archived')
    .map(({ sp, acc, adminName }) => ({
      id: sp.id,
      name: sp.name,
      title: sp.title,
      status: sp.status,
      telegram:
        acc?.telegramChatId && acc.telegramConnectedAt
          ? { name: acc.telegramName ?? 'Telegram', connectedAt: acc.telegramConnectedAt.toISOString() }
          : null,
      adminName: adminName ?? null,
    }));
}
