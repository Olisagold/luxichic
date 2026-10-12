/**
 * Creates or updates a promo code. Until the admin Discounts page saves to the database (Phase 8), this is how
 * codes get into a project. Codes are case-insensitive; an existing code is updated with the options given.
 *
 *   corepack pnpm db:set-promo -- --env-file apps/web/.env.prod.local \
 *     --code LUXE10 --percent 10 --ends 2026-12-31
 *
 * Options: --percent N | --fixed NAIRA, --min-spend NAIRA (0), --scope all|hairs|tools (all),
 * --starts YYYY-MM-DD (today), --ends YYYY-MM-DD, --limit N (unlimited), --off to switch a code off.
 * Without --env-file it targets local Supabase.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as s from '../../apps/web/db/schema';
import { arg, resolveTarget } from './connect';

const target = resolveTarget();
const client = postgres(target.databaseUrl, { prepare: false, max: 1 });
const db = drizzle(client, { schema: s });

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const int = (name: string) => {
  const v = arg(name);
  if (v === undefined) return undefined;
  if (!/^\d+$/.test(v)) throw new Error(`--${name} must be a whole number.`);
  return Number(v);
};

async function main() {
  console.log(`Target: ${target.supabaseUrl}`);
  const code = arg('code')?.trim();
  if (!code || !/^[A-Za-z0-9_-]{2,40}$/.test(code)) throw new Error('Give --code (letters, digits, - or _).');
  const [existing] = await db
    .select()
    .from(s.discounts)
    .where(sql`lower(${s.discounts.code}) = lower(${code})`);

  const percent = int('percent');
  const fixed = int('fixed');
  if (percent !== undefined && fixed !== undefined) throw new Error('Give --percent or --fixed, not both.');
  if (percent !== undefined && (percent < 1 || percent > 100)) throw new Error('--percent must be 1 to 100.');
  const scope = arg('scope');
  if (scope && !['all', 'hairs', 'tools'].includes(scope)) throw new Error('--scope must be all, hairs or tools.');
  const startsOn = arg('starts') ?? existing?.startsOn ?? new Date().toISOString().slice(0, 10);
  const endsOn = arg('ends') ?? existing?.endsOn;
  if (!DATE.test(startsOn) || !endsOn || !DATE.test(endsOn)) throw new Error('Give --ends as YYYY-MM-DD.');

  const values = {
    code: existing?.code ?? code.toUpperCase(),
    type: fixed !== undefined ? ('fixed' as const) : percent !== undefined ? ('percent' as const) : existing?.type,
    value: fixed ?? percent ?? existing?.value,
    minSpend: int('min-spend') ?? existing?.minSpend ?? 0,
    scope: (scope as 'all' | 'hairs' | 'tools' | undefined) ?? existing?.scope ?? 'all',
    startsOn,
    endsOn,
    usageLimit: int('limit') ?? existing?.usageLimit ?? null,
    active: !process.argv.includes('--off'),
  };
  if (!values.type || !values.value) throw new Error('Give --percent or --fixed.');
  const row = { ...values, type: values.type, value: values.value };

  if (existing) {
    await db
      .update(s.discounts)
      .set({ ...row, updatedAt: new Date() })
      .where(sql`id = ${existing.id}`);
  } else {
    await db.insert(s.discounts).values(row);
  }
  const [saved] = await db
    .select()
    .from(s.discounts)
    .where(sql`lower(${s.discounts.code}) = lower(${code})`);
  console.log(existing ? 'Updated:' : 'Created:', saved);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
