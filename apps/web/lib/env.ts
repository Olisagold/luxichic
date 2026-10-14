import { z } from 'zod';

/*
 * Typed, validated environment variables. Import `env` instead of reading `process.env`.
 *
 * Integrations that aren't wired up yet are optional, so local dev and CI work without them.
 * Make a variable required in the phase that starts depending on it (see plan.md).
 */

// `KEY=` in a .env file means "not set", not an empty string.
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Supabase (Phase 1–2)
  DATABASE_URL: optional(z.string().url()),
  SUPABASE_SECRET_KEY: optional(z.string().min(1)),
  // Telegram bot (Phase 9)
  TELEGRAM_BOT_TOKEN: optional(z.string().min(1)),
  TELEGRAM_WEBHOOK_SECRET: optional(z.string().min(16, 'Use at least 16 characters')),
  TELEGRAM_ADMIN_CHAT_ID: optional(z.string().min(1)),
  // Resend (Phase 9)
  RESEND_API_KEY: optional(z.string().startsWith('re_')),
  // Vercel Cron sends it as a Bearer token to /api/cron/* (Phase 9)
  CRON_SECRET: optional(z.string().min(16, 'Use at least 16 characters')),
});

const clientSchema = z
  .object({
    NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
    NEXT_PUBLIC_SUPABASE_URL: optional(z.string().url()),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optional(z.string().min(1)),
    NEXT_PUBLIC_SENTRY_DSN: optional(z.string().url()),
  })
  .refine((e) => !e.NEXT_PUBLIC_SUPABASE_URL === !e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    message: 'Set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or neither',
    path: ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
  });

// NEXT_PUBLIC_* must be read by their full names so Next.js can inline them into the browser bundle.
const clientValues = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
};

function parse<T extends z.ZodTypeAny>(schema: T, values: unknown): z.infer<T> {
  const result = schema.safeParse(values);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}

const isServer = typeof window === 'undefined';

type Env = z.infer<typeof serverSchema> & z.infer<typeof clientSchema>;

export const env: Env = isServer
  ? { ...parse(serverSchema, process.env), ...parse(clientSchema, clientValues) }
  : // Server-only keys are undefined in the browser; reading them there is a bug.
    (parse(clientSchema, clientValues) as Env);

export const isSupabaseConfigured = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

/** Returns a variable that a feature can't run without, with a clear error if it isn't set. */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (value === undefined) throw new Error(`${String(key)} is not set. Add it to apps/web/.env.local.`);
  return value as NonNullable<Env[K]>;
}
