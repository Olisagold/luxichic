/**
 * Writes the approved launch content (scripts/content/launch-content.ts) to a database: the four policies, the
 * About page's story, mission, vision and values, three FAQ answers and the delivery estimate. Everything else is
 * left as the admin set it. One transaction; `--dry-run` only reports what would change.
 *
 *   corepack pnpm content:load -- --dry-run                                  # local Supabase
 *   corepack pnpm content:load -- --env-file apps/web/.env.prod.local        # production, after approval
 *
 * The live site shows it after the next deploy (each build reads fresh data), or within the hour.
 */
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as s from '../../apps/web/db/schema';
import { resolveTarget } from '../database/connect';
import { ABOUT, DELIVERY_ESTIMATE, FAQ_ANSWERS, POLICIES } from './launch-content';

const dryRun = process.argv.includes('--dry-run');

class DryRun extends Error {}

async function main() {
  const target = resolveTarget();
  const client = postgres(target.databaseUrl, { prepare: false, max: 1 });
  const db = drizzle(client, { schema: s });
  try {
    await db.transaction(async (tx) => {
      for (const [slug, policy] of Object.entries(POLICIES)) {
        const rows = await tx
          .insert(s.policies)
          .values({ slug, title: policy.title, sections: policy.sections })
          .onConflictDoUpdate({ target: s.policies.slug, set: { title: policy.title, sections: policy.sections } })
          .returning({ slug: s.policies.slug });
        console.log(`policy ${slug}: ${policy.sections.length} sections${rows.length ? '' : ' (not written)'}`);
      }

      const [about] = await tx.select().from(s.siteContent).where(eq(s.siteContent.key, 'about'));
      const value = { ...((about?.value as Record<string, unknown>) ?? {}), ...ABOUT };
      await tx
        .insert(s.siteContent)
        .values({ key: 'about', value })
        .onConflictDoUpdate({ target: s.siteContent.key, set: { value } });
      console.log(`about: story, mission, vision and ${ABOUT.values.length} values`);

      for (const [question, answer] of Object.entries(FAQ_ANSWERS)) {
        const rows = await tx
          .update(s.faqs)
          .set({ answer })
          .where(eq(s.faqs.question, question))
          .returning({ id: s.faqs.id });
        console.log(`faq "${question}": ${rows.length ? 'updated' : 'NOT FOUND'}`);
      }

      await tx
        .insert(s.settings)
        .values({ key: 'delivery_estimate', value: { text: DELIVERY_ESTIMATE } })
        .onConflictDoUpdate({ target: s.settings.key, set: { value: { text: DELIVERY_ESTIMATE } } });
      console.log('delivery estimate updated');

      const [left] = await tx.execute<{ n: number }>(sql`
        select (select count(*) from policies where sections::text ilike '%placeholder%')
             + (select count(*) from faqs where answer ilike '%placeholder%')
             + (select count(*) from site_content where key = 'about' and value::text ilike '%[editable%')::int as n`);
      console.log(`placeholders left in policies, FAQs and About: ${left?.n ?? '?'}`);
      if (dryRun) throw new DryRun();
    });
    console.log('Saved.');
  } catch (e) {
    if (!(e instanceof DryRun)) throw e;
    console.log('Dry run: nothing was saved.');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
