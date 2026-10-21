/**
 * Writes Supabase Auth's emails (confirm sign-up, reset password, change email) to supabase/templates, in the
 * site's email layout, with the footer's contact details from the database's business settings. Local Supabase
 * uses them (supabase/config.toml); for the hosted project, paste each file under Authentication → Emails →
 * Templates (docs/auth/README.md).
 *
 *   corepack pnpm auth:email-templates -- --env-file apps/web/.env.prod.local
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as s from '../../apps/web/db/schema';
import { renderAuthEmails } from '../../apps/web/lib/email/auth-templates';
import { resolveTarget } from '../database/connect';

async function main() {
  const target = resolveTarget();
  const client = postgres(target.databaseUrl, { prepare: false, max: 1 });
  const db = drizzle(client, { schema: s });
  const [row] = await db
    .select({ value: s.settings.value })
    .from(s.settings)
    .where(inArray(s.settings.key, ['business']));
  await client.end();
  const business = (row?.value ?? {}) as Partial<{ name: string; email: string; phone: string; whatsapp: string }>;

  const emails = await renderAuthEmails({
    businessName: business.name || 'LUXICHIC',
    email: business.email ?? '',
    phone: business.phone ?? '',
    whatsapp: business.whatsapp ?? '',
  });
  for (const [key, { subject, html }] of Object.entries(emails)) {
    const path = resolve(process.cwd(), `supabase/templates/${key}.html`);
    writeFileSync(path, html + '\n');
    console.log(`${key}.html  subject: "${subject}"`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
