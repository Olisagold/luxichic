import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function POST(request: Request) {
  // Reject everything until a secret is configured, so an unset secret can't match a missing header.
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const update = await request.json();
  // TODO: handle Telegram update
  void update;

  return NextResponse.json({ ok: true });
}
