import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * The local Supabase stack (`pnpm db:start`) the end-to-end tests run against, never dev or production. Its keys
 * come from `supabase status`, and every hosted service (email, Telegram, push, error tracking) is switched off.
 */
const root = `${resolve(__dirname, '../../..')}/`;

export function localSupabase() {
  const out = execFileSync(`${root}node_modules/.bin/supabase`, ['status', '-o', 'env'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const vars = Object.fromEntries(
    out
      .split('\n')
      .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1], m[2]]),
  );
  if (!vars.API_URL?.includes('127.0.0.1')) throw new Error('Local Supabase is not running. Run: pnpm db:start');
  return { apiUrl: vars.API_URL, dbUrl: vars.DB_URL, publishableKey: vars.PUBLISHABLE_KEY, secretKey: vars.SECRET_KEY };
}

export const PORT = 3100;
export const BASE_URL = `http://localhost:${PORT}`;

/** Environment for the app under test: local Supabase only, and nothing that sends messages. */
export function appEnv(): Record<string, string> {
  const sb = localSupabase();
  return {
    NEXT_PUBLIC_SUPABASE_URL: sb.apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb.publishableKey,
    SUPABASE_SECRET_KEY: sb.secretKey,
    DATABASE_URL: sb.dbUrl,
    NEXT_PUBLIC_SITE_URL: BASE_URL,
    // Off: an empty value wins over apps/web/.env.local, which Next.js never overrides.
    RESEND_API_KEY: '',
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_ADMIN_CHAT_ID: '',
    TELEGRAM_WEBHOOK_SECRET: '',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: '',
    VAPID_PRIVATE_KEY: '',
    VAPID_SUBJECT: '',
    CRON_SECRET: '',
    NEXT_PUBLIC_SENTRY_DSN: '',
    SENTRY_AUTH_TOKEN: '',
    NEXT_TELEMETRY_DISABLED: '1',
  };
}
