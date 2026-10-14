/**
 * Registers the site's Telegram webhook, so the bot answers /start and /chatid in the team chat. Alerts are sent
 * without it; this is only for replies. Reads TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET from the env file,
 * which must match the deployed site's values.
 *
 *   corepack pnpm telegram:webhook -- --env-file apps/web/.env.local --url https://luxichic.vercel.app
 *   corepack pnpm telegram:webhook -- --env-file apps/web/.env.local --info
 *   corepack pnpm telegram:webhook -- --env-file apps/web/.env.local --delete
 */
import { arg, readEnvFile } from '../database/connect';

const env = readEnvFile(arg('env-file') ?? 'apps/web/.env.local');
const token = env.TELEGRAM_BOT_TOKEN;
const secret = env.TELEGRAM_WEBHOOK_SECRET;

async function call(method: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { ok: boolean; result?: unknown; description?: string };
}

async function main() {
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set in the env file.');
  if (process.argv.includes('--delete')) {
    console.log(await call('deleteWebhook'));
    return;
  }
  if (!process.argv.includes('--info')) {
    const site = (arg('url') ?? 'https://luxichic.vercel.app').replace(/\/$/, '');
    if (!secret || secret.length < 16) throw new Error('TELEGRAM_WEBHOOK_SECRET must be at least 16 characters.');
    const res = await call('setWebhook', {
      url: `${site}/api/webhooks/telegram`,
      secret_token: secret,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    });
    console.log(res.ok ? `Webhook set to ${site}/api/webhooks/telegram` : `Failed: ${res.description}`);
  }
  const info = (await call('getWebhookInfo')).result as Record<string, unknown>;
  console.log({
    url: info.url,
    pending: info.pending_update_count,
    lastError: info.last_error_message ?? null,
  });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
