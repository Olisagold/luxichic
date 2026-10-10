/**
 * Loads the prototype's storefront catalog and content into an EMPTY database: categories, products, delivery
 * fees, salon services and specialists, homepage and page content, FAQs, policies, testimonials, social links,
 * public business settings and email templates. See catalog.ts for what is (and isn't) included.
 *
 *   corepack pnpm db:load-catalog                                              → local Supabase
 *   corepack pnpm db:load-catalog -- --env-file apps/web/.env.prod.local       → that hosted project
 *
 * Refuses if the database already has products, categories or services, so it can never duplicate or overwrite
 * a live catalog. No customers, orders, reviews, logins or bank details are created.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as s from '../../apps/web/db/schema';
import { buildInitialDb } from '../../apps/web/lib/mock-db/initial';
import { loadCatalog } from './catalog';
import { resolveTarget } from './connect';
import { syncReferenceData } from './reference-data';

const target = resolveTarget();
const client = postgres(target.databaseUrl, { prepare: false, max: 1 });
const db = drizzle(client, { schema: s });

async function main() {
  console.log(`Target: ${target.supabaseUrl}`);

  const [existing] = await db.execute<{ products: number; categories: number; services: number }>(sql`
    select (select count(*)::int from products) products,
           (select count(*)::int from categories) categories,
           (select count(*)::int from services) services`);
  if (existing.products || existing.categories || existing.services) {
    throw new Error(
      `This database already has a catalog (${existing.products} products, ${existing.categories} categories, ` +
        `${existing.services} services). Nothing was changed.`,
    );
  }

  await db.transaction(async (tx) => {
    await syncReferenceData(tx);
    await loadCatalog(tx, buildInitialDb());
  });

  const [counts] = await db.execute<Record<string, number>>(sql`
    select (select count(*)::int from products) products,
           (select count(*)::int from categories) categories,
           (select count(*)::int from services) services,
           (select count(*)::int from specialists) specialists,
           (select count(*)::int from faqs) faqs,
           (select count(*)::int from policies) policies,
           (select count(*)::int from delivery_rates) delivery_rates`);
  console.log('Catalog loaded:', counts);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
