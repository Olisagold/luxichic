/**
 * Loads the prototype's demo data (apps/web/data + lib/mock-db) into a Supabase database,
 * so dev and preview environments look like the current site.
 *
 *   corepack pnpm db:seed                 # local Supabase (pnpm db:start first)
 *   corepack pnpm db:seed -- --remote     # a hosted DEV project (needs env vars, see below)
 *
 * Env vars (only needed for --remote; read from the shell or apps/web/.env.local):
 *   DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 *   SEED_PASSWORD  password for every seeded login (random and printed when unset)
 *
 * It WIPES all store data and the seeded logins, then re-inserts everything. --remote only accepts the
 * projects in SEEDABLE_PROJECT_REFS, so production can never be seeded.
 */
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as s from '../../apps/web/db/schema';
import { buildInitialDb } from '../../apps/web/lib/mock-db/initial';
import { seedAppointments, seedOrders, seedReviews, seedUsers } from '../../apps/web/data/seed';
import { generatedAppointments, generatedOrders, generatedReviews, seedCustomers } from '../../apps/web/data/adminSeed';
import type { PaymentStatus } from '../../apps/web/types/order';
import { loadCatalog, snake } from './catalog';
import { allPermissionKeys, syncReferenceData } from './reference-data';

/* ------------------------------------------------------------------ */
/* Connection and safety checks                                        */
/* ------------------------------------------------------------------ */

const remote = process.argv.includes('--remote');

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

function localSupabaseEnv(): Record<string, string> {
  const out = execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return Object.fromEntries(
    out
      .split('\n')
      .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1], m[2]]),
  );
}

let databaseUrl: string;
let supabaseUrl: string;
let secretKey: string;

if (remote) {
  loadEnvFile(resolve(__dirname, '../../apps/web/.env.local'));
  databaseUrl = process.env.DATABASE_URL ?? '';
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  secretKey = process.env.SUPABASE_SECRET_KEY ?? '';
  const missing = Object.entries({
    DATABASE_URL: databaseUrl,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    SUPABASE_SECRET_KEY: secretKey,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) throw new Error(`--remote needs ${missing.join(', ')} (set in apps/web/.env.local).`);
} else {
  const local = localSupabaseEnv();
  databaseUrl = local.DB_URL;
  supabaseUrl = local.API_URL;
  secretKey = local.SECRET_KEY ?? local.SERVICE_ROLE_KEY;
  if (!databaseUrl || !supabaseUrl || !secretKey) throw new Error('Local Supabase is not running. Run: pnpm db:start');
}

// Hosted projects that may be seeded. Production is deliberately not listed.
const SEEDABLE_PROJECT_REFS = ['ldpdudssjlvyafyvemhm']; // luxichic-dev

const isLocalHost = /@(127\.0\.0\.1|localhost)[:/]/.test(databaseUrl);
if (!remote && !isLocalHost) throw new Error(`Refusing to seed a non-local database without --remote.`);
if (remote && !SEEDABLE_PROJECT_REFS.some((ref) => databaseUrl.includes(ref) && supabaseUrl.includes(ref))) {
  throw new Error('Refusing to seed: DATABASE_URL and NEXT_PUBLIC_SUPABASE_URL must both point at luxichic-dev.');
}

const password = process.env.SEED_PASSWORD ?? randomBytes(9).toString('base64url');

const client = postgres(databaseUrl, { prepare: false, max: 1 });
const db = drizzle(client, { schema: s });
const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

/* ------------------------------------------------------------------ */
/* Mappings from prototype values to database values                   */
/* ------------------------------------------------------------------ */

const paymentStatusMap: Record<PaymentStatus, (typeof s.paymentStatus.enumValues)[number]> = {
  'Pending Verification': 'pending_verification',
  'Payment Confirmed': 'payment_confirmed',
  'Pay on Delivery': 'pay_on_delivery',
  Paid: 'paid',
};
const mediaFolderMap = {
  Homepage: 'homepage',
  Hairs: 'hairs',
  'Hair Tools': 'hair_tools',
  Salon: 'salon',
  Products: 'products',
  Services: 'services',
} as const;
const ts = (v?: string | null) => (v ? new Date(v) : undefined);

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

// Admin logins are marked with app_metadata.kind = 'admin'; inserting their admins row removes the
// customer profile the auth trigger created.
async function createLogin(email: string, fullName: string, kind: 'customer' | 'admin'): Promise<string> {
  // Retry dropped connections (flaky networks); a real error such as a duplicate email fails straight away.
  for (let attempt = 1; ; attempt++) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: kind === 'admin' ? { kind } : {},
    });
    if (data.user) return data.user.id;
    const network = error?.name === 'AuthRetryableFetchError' || /fetch failed/i.test(error?.message ?? '');
    if (!network || attempt === 3) throw new Error(`Could not create login for ${email}: ${error?.message}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

async function wipe(emails: string[]) {
  const tables = await client<{ tablename: string }[]>`
    select tablename from pg_tables where schemaname = 'public'`;
  if (tables.length) {
    await client.unsafe(
      `truncate ${tables.map((t) => `"public"."${t.tablename}"`).join(', ')} restart identity cascade`,
    );
  }
  // Remove only the logins this script creates.
  const wanted = new Set(emails.map((e) => e.toLowerCase()));
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email && wanted.has(u.email.toLowerCase())) await supabase.auth.admin.deleteUser(u.id);
    }
    if (data.users.length < 1000) break;
  }
}

async function main() {
  const store = buildInitialDb();
  const customers = [...seedUsers, ...seedCustomers];
  const orders = [...seedOrders, ...generatedOrders];
  const appointments = [...seedAppointments, ...generatedAppointments];
  const reviews = [...generatedReviews, ...seedReviews];

  console.log(`Seeding ${remote ? 'REMOTE' : 'local'} database…`);
  await wipe([...customers.map((c) => c.email), ...store.admins.map((a) => a.email)]);

  /* Permissions and roles */
  const roleIds = await syncReferenceData(db);

  /* Admins */
  const adminIds = new Map<string, string>();
  const adminIdByName = new Map<string, string>();
  for (const a of store.admins) {
    const id = await createLogin(a.email, a.fullName, 'admin');
    adminIds.set(a.id, id);
    adminIdByName.set(a.fullName, id);
    await db.insert(s.admins).values({
      id,
      fullName: a.fullName,
      email: a.email,
      username: a.username,
      roleId: a.role === 'Custom' ? null : (roleIds.get(a.role) ?? null),
      isOwner: a.isOwner,
      status: a.status,
      lastLoginAt: ts(a.lastLoginAt),
      createdAt: new Date(a.createdAt),
    });
    const perms = a.isOwner ? allPermissionKeys : a.permissions;
    if (perms.length) await db.insert(s.adminPermissions).values(perms.map((p) => ({ adminId: id, permissionKey: p })));
  }
  const adminRef = (legacyIdOrName?: string) =>
    legacyIdOrName ? (adminIds.get(legacyIdOrName) ?? adminIdByName.get(legacyIdOrName) ?? null) : null;

  if (store.loginHistory.length) {
    await db.insert(s.loginHistory).values(
      store.loginHistory
        .filter((l) => adminIds.has(l.adminId))
        .map((l) => ({
          adminId: adminIds.get(l.adminId)!,
          browser: l.browser,
          device: l.device,
          location: l.location,
          at: new Date(l.at),
        })),
    );
  }

  /* Customers */
  const userIdByEmail = new Map<string, string>();
  for (const c of customers) {
    const id = await createLogin(c.email, c.fullName, 'customer');
    userIdByEmail.set(c.email.toLowerCase(), id);
    // The auth trigger has already created a bare profile; fill in the prototype's details.
    const profile = {
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      status: c.status ?? 'active',
      pendingSetup: c.pendingSetup ?? false,
      lastActiveAt: ts(c.lastActiveAt),
      createdAt: new Date(c.createdAt),
    } as const;
    await db
      .insert(s.profiles)
      .values({ id, ...profile })
      .onConflictDoUpdate({ target: s.profiles.id, set: profile });
    if (c.addresses.length) {
      await db.insert(s.addresses).values(
        c.addresses.map((ad, i) => ({
          userId: id,
          label: ad.label,
          country: ad.country,
          state: ad.state,
          city: ad.city,
          street: ad.street,
          houseNumber: ad.houseNumber,
          landmark: ad.landmark,
          instructions: ad.instructions,
          isDefault: ad.isDefault ?? i === 0,
        })),
      );
    }
  }
  const userRef = (email?: string) => (email ? (userIdByEmail.get(email.toLowerCase()) ?? null) : null);

  /* Catalog and content (shared with pnpm db:load-catalog) */
  const { productIds, serviceIds, specialistIds } = await loadCatalog(db, store);
  const productRef = (legacyId: string) => productIds.get(legacyId) ?? null;

  if (store.stockMoves.length) {
    await db.insert(s.stockMovements).values(
      store.stockMoves
        .filter((m) => productIds.has(m.productId))
        .map((m) => ({
          productId: productIds.get(m.productId)!,
          variant: m.variant,
          change: m.change,
          resultingStock: m.resultingStock,
          reason: m.reason,
          adminId: adminRef(m.by),
          createdAt: new Date(m.at),
        })),
    );
  }

  /* Discounts and delivery */
  if (store.discounts.length) {
    await db.insert(s.discounts).values(
      store.discounts.map((d) => ({
        code: d.code,
        type: d.type,
        value: d.value,
        minSpend: d.minSpend,
        startsOn: d.startsAt.slice(0, 10),
        endsOn: d.endsAt.slice(0, 10),
        usageLimit: d.usageLimit,
        usedCount: d.used,
        active: d.active,
        scope: d.scope,
      })),
    );
  }
  /* Salon (demo closed days) */
  if (store.blocks.length) {
    await db.insert(s.blocks).values(
      store.blocks.map((b) => ({
        date: b.date,
        startTime: b.start,
        endTime: b.end,
        serviceId: b.serviceSlug ? (serviceIds.get(b.serviceSlug) ?? null) : null,
        specialistId: b.specialistId ? (specialistIds.get(b.specialistId) ?? null) : null,
        reason: b.reason,
        createdByAdminId: adminRef(b.createdBy),
        createdAt: new Date(b.createdAt),
      })),
    );
  }

  for (const a of appointments) {
    const [row] = await db
      .insert(s.appointments)
      .values({
        reference: a.reference,
        serviceId: serviceIds.get(a.serviceSlug) ?? null,
        serviceName: a.serviceName,
        specialistId: a.personnelId ? (specialistIds.get(a.personnelId) ?? null) : null,
        specialistName: a.personnelName,
        date: a.date,
        time: a.time,
        userId: userRef(a.accountEmail),
        customerName: a.customer.fullName,
        customerEmail: a.customer.email,
        customerPhone: a.customer.phone,
        notes: a.notes,
        status: snake(a.status) as (typeof s.appointmentStatus.enumValues)[number],
        reason: a.reason,
        originalDate: a.original?.date,
        originalTime: a.original?.time,
        originalSpecialistName: a.original?.personnelName,
        createdAt: new Date(a.createdAt),
      })
      .returning({ id: s.appointments.id });
    if (a.history?.length) {
      await db.insert(s.appointmentEvents).values(
        a.history.map((e) => ({
          appointmentId: row.id,
          label: e.label,
          note: e.note,
          adminId: adminRef(e.by),
          createdAt: new Date(e.at),
        })),
      );
    }
  }

  /* Orders */
  for (const o of orders) {
    const [row] = await db
      .insert(s.orders)
      .values({
        orderNumber: o.orderNumber,
        transactionReference: o.reference,
        userId: userRef(o.accountEmail),
        customerName: o.customer.fullName,
        customerEmail: o.customer.email,
        customerPhone: o.customer.phone,
        shipCountry: o.address.country,
        shipState: o.address.state,
        shipCity: o.address.city,
        shipStreet: o.address.street,
        shipHouseNumber: o.address.houseNumber,
        shipLandmark: o.address.landmark,
        shipInstructions: o.address.instructions,
        subtotal: o.subtotal,
        deliveryFee: o.deliveryFee,
        discountAmount: o.discount,
        total: o.total,
        paymentMethod: o.paymentMethod,
        status: snake(o.status) as (typeof s.orderStatus.enumValues)[number],
        cancelReason: o.cancelReason,
        createdAt: new Date(o.createdAt),
      })
      .returning({ id: s.orders.id });

    await db.insert(s.orderItems).values(
      o.items.map((it) => ({
        orderId: row.id,
        productId: productRef(it.productId),
        productSlug: it.slug,
        productName: it.name,
        division: it.division,
        imageUrl: it.image,
        variants: it.variants,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      })),
    );

    const status = paymentStatusMap[o.paymentStatus];
    const confirmedEvent = o.timeline.find((t) => t.step === 'Payment Confirmed' && t.at);
    const confirmed = status === 'payment_confirmed' || status === 'paid';
    await db.insert(s.payments).values({
      orderId: row.id,
      method: o.paymentMethod,
      status,
      amount: o.total,
      confirmedByAdminId: confirmed ? adminRef(o.confirmedBy) : null,
      confirmedAt: confirmed ? (ts(confirmedEvent?.at) ?? new Date(o.createdAt)) : null,
    });

    const events = o.timeline.filter((t) => t.at);
    if (events.length) {
      await db.insert(s.orderEvents).values(
        events.map((t) => ({
          orderId: row.id,
          step: snake(t.step) as (typeof s.orderEventStep.enumValues)[number],
          createdAt: new Date(t.at!),
        })),
      );
    }
  }

  /* Reviews */
  const reviewRows = reviews
    .filter((r) => productIds.has(r.productId))
    .map((r) => ({
      productId: productIds.get(r.productId)!,
      userId: userRef(r.authorEmail),
      authorName: r.authorName,
      authorEmail: r.authorEmail,
      rating: r.rating,
      title: r.title,
      body: r.body,
      images: r.images ?? [],
      verified: r.verified,
      status: r.status ?? 'visible',
      createdAt: new Date(r.date),
    }));
  if (reviewRows.length) await db.insert(s.reviews).values(reviewRows);

  /* Media library */
  if (store.media.length) {
    await db.insert(s.media).values(
      store.media.map((m) => ({
        url: m.url,
        name: m.name,
        folder: mediaFolderMap[m.folder],
        width: m.width,
        height: m.height,
        sizeKb: m.sizeKb,
        createdAt: new Date(m.uploadedAt),
      })),
    );
  }
  /* Demo-only settings: the prototype's bank account and notification/security toggles */
  const st = store.settings;
  await db.insert(s.settings).values([
    { key: 'bank', value: st.bank },
    { key: 'email', value: st.smtp },
    { key: 'notifications', value: st.notifications },
    { key: 'security', value: st.security },
  ]);

  /* Operations */
  if (store.notifications.length) {
    await db.insert(s.notifications).values(
      store.notifications.map((n) => ({
        kind: n.kind,
        title: n.title,
        body: n.body,
        link: n.link,
        readAt: n.read ? new Date(n.at) : null,
        createdAt: new Date(n.at),
      })),
    );
  }
  if (store.activity.length) {
    await db.insert(s.auditLogs).values(
      store.activity.map((e) => ({
        adminId: adminRef(e.adminId),
        adminName: e.adminName,
        section: e.section,
        action: e.action,
        target: e.target,
        link: e.link,
        createdAt: new Date(e.at),
      })),
    );
  }

  const counts = await db.execute<{ t: string; n: number }>(sql`
    select 'products' t, count(*)::int n from products union all
    select 'orders', count(*)::int from orders union all
    select 'appointments', count(*)::int from appointments union all
    select 'customers', count(*)::int from profiles union all
    select 'admins', count(*)::int from admins union all
    select 'reviews', count(*)::int from reviews`);
  console.log('Done:', Object.fromEntries(counts.map((r) => [r.t, r.n])));
  console.log(
    process.env.SEED_PASSWORD
      ? 'Seeded logins use SEED_PASSWORD.'
      : `Seeded logins (customers and admins) use this password: ${password}`,
  );
  console.log(
    `Images still point at /images. Next: corepack pnpm db:media${remote ? ' -- --env-file apps/web/.env.local' : ''}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
