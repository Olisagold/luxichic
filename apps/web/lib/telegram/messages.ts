import 'server-only';
import { sendTelegramMessage } from '@/lib/telegram/client';
import { connectWithToken } from '@/lib/telegram/connect';

/**
 * Replies to messages the bot receives through the webhook (app/api/webhooks/telegram). The bot posts alerts
 * (lib/notify/team.ts); it answers:
 * - `/start <code>` from a connect link: connects a specialist's private chat or the appointments/orders group;
 * - `/start` or `/chatid`: the chat's ID, for entering it by hand in Admin → Telegram.
 */

interface Update {
  message?: {
    text?: string;
    chat: { id: number; type: string; title?: string; first_name?: string; last_name?: string; username?: string };
  };
}

export async function handleTelegramUpdate(update: Update) {
  const message = update?.message;
  // "/start@luxichic_alerts_bot code" in groups, "/start code" in private chats.
  const [first, payload] = (message?.text ?? '').trim().split(/\s+/);
  const command = first?.split('@')[0]?.toLowerCase();
  if (!message || (command !== '/start' && command !== '/chatid')) return;
  const chatId = String(message.chat.id);

  if (command === '/start' && payload) {
    const reply = await connectWithToken(message.chat, payload);
    if (reply) {
      await sendTelegramMessage(chatId, reply);
      return;
    }
  }

  const where = message.chat.type === 'private' ? 'this chat' : `“${message.chat.title ?? 'this group'}”`;
  await sendTelegramMessage(
    chatId,
    `👋 LUXICHIC Alerts here.\n\nThe chat ID for ${where} is:\n${message.chat.id}\n\nThe LUXICHIC admin connects chats from Admin → Telegram.`,
  );
}
