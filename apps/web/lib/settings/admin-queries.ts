import 'server-only';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { loadEmailTemplates, loadNotifications, loadStoreSettings } from '@/lib/settings/store';
import { botInfo, telegramConfigured } from '@/lib/telegram/client';
import type { AdminSettings } from '@/components/admin/AdminSettingsProvider';
import type { Permission } from '@/types/admin';

/**
 * Data for an admin operations/settings page, or null when the admin lacks `permission` (the page explains).
 * Pass `permission: null` for pages every admin may open (notifications). `telegram` checks the bot connection.
 */
export async function settingsFor(
  permission: Permission | null,
  options: { telegram?: boolean } = {},
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
  };
}
