/**
 * Creates the main administrator (owner) for a LUXICHIC database, plus the permission list and role presets.
 * The owner has every permission and can't be suspended or removed.
 *
 *   corepack pnpm db:create-owner -- --email you@example.com --name "Your Name"
 *       → local Supabase (pnpm db:start first)
 *   corepack pnpm db:create-owner -- --email you@example.com --name "Your Name" --env-file apps/web/.env.prod.local
 *       → the hosted project in that file (DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY)
 *
 * A temporary password is printed once. Sign in at /admin/login and change it under Settings → Security.
 * Refuses if the database already has an owner, or if the email already belongs to a login.
 */
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as s from '../../apps/web/db/schema';
import { arg, resolveTarget } from './connect';
import { allPermissionKeys, syncReferenceData } from './reference-data';

const email = arg('email')?.trim().toLowerCase();
const fullName = arg('name')?.trim();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !fullName) {
  throw new Error('Usage: pnpm db:create-owner -- --email <email> --name "<full name>" [--env-file <path>]');
}

const { databaseUrl, supabaseUrl, secretKey } = resolveTarget();
const client = postgres(databaseUrl, { prepare: false, max: 1 });
const db = drizzle(client, { schema: s });
const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  console.log(`Target: ${supabaseUrl}`);

  const [existingOwner] = await db.select({ email: s.admins.email }).from(s.admins).where(eq(s.admins.isOwner, true));
  if (existingOwner) throw new Error(`This database already has an owner (${existingOwner.email}).`);

  const roleIds = await syncReferenceData(db);

  // A login can't be both a customer and the owner.
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    if (data.users.some((u) => u.email?.toLowerCase() === email)) {
      throw new Error(`${email} already has a login. Use a different email for the owner account.`);
    }
    if (data.users.length < 1000) break;
  }

  const password = randomBytes(12).toString('base64url');
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { kind: 'admin' },
  });
  if (error || !data.user) throw new Error(`Could not create the login: ${error?.message}`);
  const id = data.user.id;

  try {
    await db.transaction(async (tx) => {
      // Inserting the admin row also removes the customer profile the auth trigger created.
      await tx.insert(s.admins).values({
        id,
        fullName: fullName!,
        email: email!,
        roleId: roleIds.get('Super Admin') ?? null,
        isOwner: true,
        status: 'active',
      });
      await tx.insert(s.adminPermissions).values(allPermissionKeys.map((p) => ({ adminId: id, permissionKey: p })));
      await tx.insert(s.auditLogs).values({
        adminId: id,
        adminName: fullName!,
        section: 'Admin Users',
        action: 'Owner account created',
        target: email,
      });
    });
  } catch (e) {
    // Don't leave a login without its admin row.
    await supabase.auth.admin.deleteUser(id);
    throw e;
  }

  console.log(`\nOwner created: ${fullName} <${email}>`);
  console.log(`Temporary password (shown once): ${password}`);
  console.log('Sign in at /admin/login, then change it under Settings → Security.');
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
