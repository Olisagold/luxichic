import 'server-only';
import { sendTelegramMessage } from '@/lib/telegram/client';

/**
 * Replies to messages the bot receives through the webhook (app/api/webhooks/telegram). The bot only posts
 * alerts (lib/notify/team.ts); the one thing it answers is `/start` or `/chatid`, with the chat's ID, which goes
 * in Admin → Telegram (or TELEGRAM_ADMIN_CHAT_ID) to send alerts there.
 */

interface Update {
  message?: { text?: string; chat: { id: number; type: string; title?: string } };
}

export async function handleTelegramUpdate(update: Update) {
  const message = update?.message;
  const command = message?.text?.trim().split(/[\s@]/)[0]?.toLowerCase();
  if (!message || (command !== '/start' && command !== '/chatid')) return;
  const where = message.chat.type === 'private' ? 'this chat' : `“${message.chat.title ?? 'this group'}”`;
  await sendTelegramMessage(
    String(message.chat.id),
    `👋 LUXICHIC Alerts here.\n\nThe chat ID for ${where} is:\n${message.chat.id}\n\nTo get new-order and appointment alerts here, put this ID in LUXICHIC Admin → Telegram → Chat ID.`,
  );
}
