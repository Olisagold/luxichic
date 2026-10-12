import 'server-only';
import { env } from '@/lib/env';

/**
 * Minimal Telegram Bot API client. The bot token lives only in the environment (TELEGRAM_BOT_TOKEN); it is never
 * stored in the database or sent to the browser.
 */

const API = 'https://api.telegram.org';

export const telegramConfigured = () => !!env.TELEGRAM_BOT_TOKEN;

async function call<T>(
  method: string,
  body?: Record<string, unknown>,
): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, error: 'No bot token is set (TELEGRAM_BOT_TOKEN).' };
  try {
    const res = await fetch(`${API}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
    return json.ok
      ? { ok: true, result: json.result as T }
      : { ok: false, error: json.description ?? 'Telegram refused the request.' };
  } catch {
    return { ok: false, error: 'Could not reach Telegram.' };
  }
}

/** The bot's username when the token works. */
export async function botInfo(): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const res = await call<{ username: string }>('getMe');
  return res.ok ? { ok: true, username: res.result.username } : res;
}

/** Sends a plain-text message to a chat. */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await call('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true });
  return res.ok ? { ok: true } : res;
}
