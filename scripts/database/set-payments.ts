/**
 * Sets the checkout payment settings: the bank account shown for bank transfers, and whether Pay on Delivery is
 * offered. Until the admin Payments page saves to the database (Phase 8), this is how they get into a project.
 * Only the options given are changed.
 *
 *   corepack pnpm db:set-payments -- --env-file apps/web/.env.prod.local \
 *     --bank-name "MONIE POINT" --account-name "LUXICHIC HAIRS" --account-number 5108508288 \
 *     --pay-on-delivery off
 *
 * Also: --instructions "…" (shown under the bank details). Without --env-file it targets local Supabase.
 */
import { inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as s from '../../apps/web/db/schema';
import { arg, resolveTarget } from './connect';

const DEFAULT_INSTRUCTIONS = 'Use your 8-digit LUXICHIC transaction reference as the narration.';

interface Bank {
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
}

const target = resolveTarget();
const client = postgres(target.databaseUrl, { prepare: false, max: 1 });
const db = drizzle(client, { schema: s });

async function main() {
  console.log(`Target: ${target.supabaseUrl}`);
  const read = () =>
    db
      .select({ key: s.settings.key, value: s.settings.value })
      .from(s.settings)
      .where(inArray(s.settings.key, ['bank', 'pay_on_delivery']));
  const before = await read();
  const current = before.find((r) => r.key === 'bank')?.value as Partial<Bank> | undefined;

  const rows: { key: string; value: unknown }[] = [];
  const bankName = arg('bank-name')?.trim();
  const accountName = arg('account-name')?.trim();
  const accountNumber = arg('account-number')?.trim();
  const instructions = arg('instructions')?.trim();
  if (bankName || accountName || accountNumber || instructions) {
    const bank: Bank = {
      bankName: bankName ?? current?.bankName ?? '',
      accountName: accountName ?? current?.accountName ?? '',
      accountNumber: accountNumber ?? current?.accountNumber ?? '',
      instructions: instructions ?? current?.instructions ?? DEFAULT_INSTRUCTIONS,
    };
    if (!bank.bankName || !bank.accountName) throw new Error('Give both --bank-name and --account-name.');
    // Nigerian account numbers (NUBAN) are 10 digits.
    if (!/^\d{10}$/.test(bank.accountNumber)) throw new Error('--account-number must be 10 digits.');
    rows.push({ key: 'bank', value: bank });
  }

  const pod = arg('pay-on-delivery');
  if (pod !== undefined) {
    if (pod !== 'on' && pod !== 'off') throw new Error('--pay-on-delivery must be "on" or "off".');
    rows.push({ key: 'pay_on_delivery', value: { enabled: pod === 'on' } });
  }

  if (!rows.length) {
    console.log('Current:', JSON.stringify(before, null, 2));
    console.log('Nothing to change. See the options at the top of this script.');
    return;
  }

  // One statement: the pooler closes long transactions.
  await db
    .insert(s.settings)
    .values(rows)
    .onConflictDoUpdate({ target: s.settings.key, set: { value: sql`excluded.value`, updatedAt: new Date() } });

  console.log('Before:', JSON.stringify(before, null, 2));
  console.log('Now:', JSON.stringify(await read(), null, 2));
  console.log('The storefront picks this up within the hour (cached), or at once after a redeploy.');
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
