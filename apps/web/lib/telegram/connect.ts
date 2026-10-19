import 'server-only';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { loadTelegramSettings } from '@/lib/settings/store';

/**
 * One-tap Telegram connections, so nobody copies chat IDs:
 * - a specialist opens `t.me/<bot>?start=<code>` and presses Start: the bot stores their private chat;
 * - the owner opens `t.me/<bot>?startgroup=<code>` and picks a group: the bot stores it as the appointments or
 *   orders group.
 * Codes are single-use and expire after 7 days. Telegram delivers both as `/start <code>` to the webhook.
 */

export type GroupKind = 'appointments' | 'orders';
type GroupLinks = Partial<Record<GroupKind, { token: string; createdAt: string }>>;

const LINKS_KEY = 'telegram_links';
const MAX_AGE_MS = 7 * 86_400_000;
const newToken = () => randomBytes(18).toString('base64url');
const fresh = (at: Date | string | null | undefined) => !!at && Date.now() - new Date(at).getTime() < MAX_AGE_MS;

async function loadGroupLinks(): Promise<GroupLinks> {
  const [row] = await db.select({ value: s.settings.value }).from(s.settings).where(eq(s.settings.key, LINKS_KEY));
  return (row?.value ?? {}) as GroupLinks;
}

async function saveSetting(key: string, value: unknown) {
  await db
    .insert(s.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: s.settings.key, set: { value, updatedAt: new Date() } });
}

/** A new code for connecting the appointments or orders group. */
export async function newGroupToken(kind: GroupKind): Promise<string> {
  const token = newToken();
  await saveSetting(LINKS_KEY, { ...(await loadGroupLinks()), [kind]: { token, createdAt: new Date().toISOString() } });
  return token;
}

/** A new code for a specialist to connect their own Telegram. */
export async function newSpecialistToken(specialistId: string): Promise<string> {
  const token = newToken();
  const now = new Date();
  await db
    .insert(s.specialistAccounts)
    .values({ specialistId, telegramToken: token, telegramTokenCreatedAt: now })
    .onConflictDoUpdate({
      target: s.specialistAccounts.specialistId,
      set: { telegramToken: token, telegramTokenCreatedAt: now },
    });
  return token;
}

interface Chat {
  id: number;
  type: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

/** Handles `/start <code>`. Returns the bot's reply, or null when the code isn't one of ours. */
export async function connectWithToken(chat: Chat, token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) return null;

  if (chat.type === 'private') {
    const [account] = await db
      .select({ a: s.specialistAccounts, name: s.specialists.name })
      .from(s.specialistAccounts)
      .innerJoin(s.specialists, eq(s.specialists.id, s.specialistAccounts.specialistId))
      .where(eq(s.specialistAccounts.telegramToken, token));
    if (!account) return null;
    if (!fresh(account.a.telegramTokenCreatedAt)) {
      return 'This link has expired. Ask the LUXICHIC admin for a new one.';
    }
    const who = [chat.first_name, chat.last_name].filter(Boolean).join(' ');
    await db
      .update(s.specialistAccounts)
      .set({
        telegramChatId: String(chat.id),
        telegramName: chat.username ? `${who} (@${chat.username})` : who || 'Telegram user',
        telegramConnectedAt: new Date(),
        telegramToken: null,
        telegramTokenCreatedAt: null,
      })
      .where(eq(s.specialistAccounts.specialistId, account.a.specialistId));
    return `✅ Connected, ${account.name}!\n\nYou’ll get a message here whenever a LUXICHIC booking is made for you, and when one of your bookings is confirmed, moved or cancelled.`;
  }

  // A group, added with the startgroup link.
  const links = await loadGroupLinks();
  const kind = (Object.keys(links) as GroupKind[]).find((k) => links[k]?.token === token);
  if (!kind) return null;
  if (!fresh(links[kind]?.createdAt)) return 'This link has expired. Create a new one in LUXICHIC Admin → Telegram.';
  const settings = await loadTelegramSettings();
  const title = chat.title ?? 'this group';
  const next =
    kind === 'orders'
      ? { ...settings, ordersChatId: String(chat.id), ordersChatTitle: title }
      : { ...settings, chatId: String(chat.id), chatTitle: title };
  await saveSetting('telegram', next);
  const rest = { ...links };
  delete rest[kind];
  await saveSetting(LINKS_KEY, rest);
  return kind === 'orders'
    ? `✅ “${title}” is now the LUXICHIC orders group. New orders will be posted here.`
    : `✅ “${title}” is now the LUXICHIC appointments group. Every new booking will be posted here.`;
}
