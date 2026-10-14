import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { handleTelegramUpdate } from '@/lib/telegram/messages';

/** Telegram's webhook (registered with `pnpm telegram:webhook`). Only Telegram knows the secret. */
export async function POST(request: Request) {
  // Reject everything until a secret is configured, so an unset secret can't match a missing header.
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const update = await request.json().catch(() => null);
  try {
    await handleTelegramUpdate(update);
  } catch (e) {
    // Always answer 200, or Telegram keeps retrying the same update.
    console.error('[telegram] webhook update failed:', e);
  }
  return NextResponse.json({ ok: true });
}
