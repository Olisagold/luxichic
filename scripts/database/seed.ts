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
import { buildInitialDb } from '../../apps/web/lib/mock-db/db';
import { seedAppointments, seedOrders, seedReviews, seedUsers } from '../../apps/web/data/seed';
import {
  generatedAppointments,
  generatedOrders,
  generatedReviews,
  permissionGroups,
  rolePresets,
  seedCustomers,
} from '../../apps/web/data/adminSeed';
import type { PaymentStatus } from '../../apps/web/types/order';

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

const snake = (v: string) => v.toLowerCase().replace(/[\s-]+/g, '_');
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
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: kind === 'admin' ? { kind } : {},
  });
  if (error || !data.user) throw new Error(`Could not create login for ${email}: ${error?.message}`);
  return data.user.id;
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
  await db
    .insert(s.permissions)
    .values(
      permissionGroups.flatMap((g, gi) =>
        g.items.map((p, i) => ({ key: p.key, label: p.label, groupLabel: g.label, sortOrder: gi * 100 + i })),
      ),
    );
  const roleIds = new Map<string, string>();
  for (const [name, perms] of Object.entries(rolePresets)) {
    const [role] = await db.insert(s.roles).values({ name, isSystem: true }).returning({ id: s.roles.id });
    roleIds.set(name, role.id);
    if (perms.length)
      await db.insert(s.rolePermissions).values(perms.map((p) => ({ roleId: role.id, permissionKey: p })));
  }

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
    const perms = a.isOwner ? permissionGroups.flatMap((g) => g.items.map((i) => i.key)) : a.permissions;
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

  /* Categories */
  const categoryIds = new Map<string, string>(); // `${division}:${slug}` → id
  for (const [divisionName, list] of Object.entries(store.categories) as [
    'hairs' | 'tools',
    typeof store.categories.hairs,
  ][]) {
    for (const [i, c] of list.entries()) {
      const [row] = await db
        .insert(s.categories)
        .values({
          division: divisionName,
          slug: c.slug,
          name: c.name,
          description: c.description,
          groupName: c.group,
          imageUrl: c.image,
          sortOrder: i,
        })
        .returning({ id: s.categories.id });
      categoryIds.set(`${divisionName}:${c.slug}`, row.id);
    }
  }

  /* Products */
  const productIds = new Map<string, string>(); // prototype id → uuid
  for (const p of store.products) {
    const [row] = await db
      .insert(s.products)
      .values({
        division: p.division,
        slug: p.slug,
        sku: p.sku,
        name: p.name,
        shortDescription: p.shortDescription,
        description: p.description,
        price: p.price,
        compareAtPrice: p.originalPrice ?? null,
        status: p.status,
        discountMode: p.discountMode,
        discountPercent: p.discountPercent ?? null,
        discountStartsOn: p.discountStart ?? null,
        discountEndsOn: p.discountEnd ?? null,
        attributes: p.attributes,
        specs: p.specs,
        usage: p.usage,
        benefits: p.benefits,
        care: p.care,
        shipping: p.shipping,
        isFeatured: p.isFeatured,
        featuredRank: p.featuredRank,
        isBestseller: p.isBestseller ?? false,
        isNew: p.isNew ?? false,
        rating: p.rating,
        reviewCount: p.reviewCount,
        salesCount: p.salesCount,
        createdAt: new Date(p.createdAt),
      })
      .returning({ id: s.products.id });
    productIds.set(p.id, row.id);

    await db.insert(s.inventory).values({
      productId: row.id,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      trackInventory: p.trackInventory,
      outOfStockBehaviour: p.outOfStockBehaviour === 'hide' ? 'hide' : 'show_sold_out',
    });
    if (p.images.length) {
      await db.insert(s.productImages).values(p.images.map((url, i) => ({ productId: row.id, url, sortOrder: i })));
    }
    const cats = p.categories.map((slug) => categoryIds.get(`${p.division}:${slug}`)).filter((x): x is string => !!x);
    if (cats.length)
      await db.insert(s.productCategories).values(cats.map((categoryId) => ({ productId: row.id, categoryId })));

    for (const [gi, g] of p.variants.entries()) {
      const [opt] = await db
        .insert(s.productOptions)
        .values({ productId: row.id, key: g.key, name: g.name, sortOrder: gi })
        .returning({ id: s.productOptions.id });
      if (g.values.length) {
        await db.insert(s.productOptionValues).values(
          g.values.map((v, vi) => {
            const meta = p.variantMeta[`${g.key}::${v.label}`];
            return {
              optionId: opt.id,
              productId: row.id,
              label: v.label,
              priceDelta: v.priceDelta ?? 0,
              stock: v.stock ?? null,
              sku: meta?.sku ?? null,
              enabled: meta?.enabled ?? true,
              sortOrder: vi,
            };
          }),
        );
      }
    }
  }
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
  await db
    .insert(s.deliveryRates)
    .values(
      store.settings.delivery.rates.map((r) => ({ state: r.state, fee: r.fee, isFree: r.free, enabled: r.enabled })),
    );

  /* Salon */
  const serviceIds = new Map<string, string>(); // slug → uuid
  for (const [i, sv] of store.services.entries()) {
    const [row] = await db
      .insert(s.services)
      .values({
        slug: sv.slug,
        name: sv.name,
        category: sv.category,
        shortDescription: sv.shortDescription,
        description: sv.description,
        includes: sv.includes,
        startingPrice: sv.startingPrice,
        durationLabel: sv.duration,
        durationMinutes: sv.durationMinutes,
        imageUrl: sv.image,
        whatsapp: sv.whatsapp,
        status: sv.status,
        bookable: sv.bookable,
        sortOrder: i,
      })
      .returning({ id: s.services.id });
    serviceIds.set(sv.slug, row.id);
  }

  const specialistIds = new Map<string, string>(); // prototype id → uuid
  for (const sp of store.specialists) {
    const [row] = await db
      .insert(s.specialists)
      .values({
        name: sp.name,
        title: sp.title,
        imageUrl: sp.image,
        bio: sp.bio,
        specialties: sp.specialties,
        status: snake(sp.status) as (typeof s.specialistStatus.enumValues)[number],
      })
      .returning({ id: s.specialists.id });
    specialistIds.set(sp.id, row.id);
    const links = sp.serviceSlugs.map((slug) => serviceIds.get(slug)).filter((x): x is string => !!x);
    if (links.length)
      await db.insert(s.specialistServices).values(links.map((serviceId) => ({ specialistId: row.id, serviceId })));
    if (sp.workingDays.length) {
      await db.insert(s.availability).values(
        sp.workingDays.map((weekday) => ({
          specialistId: row.id,
          weekday,
          startTime: sp.hours.start,
          endTime: sp.hours.end,
        })),
      );
    }
  }

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

  /* Content */
  const c = store.content;
  await db.insert(s.siteContent).values([
    { key: 'sections', value: c.sections },
    { key: 'hero', value: c.hero },
    { key: 'intro', value: c.intro },
    { key: 'divisions', value: c.divisions },
    {
      key: 'featured',
      value: {
        collectionSlugs: c.featuredCollectionSlugs,
        productIds: c.featuredProductIds.map(productRef).filter(Boolean),
        serviceSlugs: c.featuredServiceSlugs,
      },
    },
    { key: 'salon_section', value: c.salonSection },
    { key: 'why', value: c.why },
    { key: 'about', value: c.about },
    { key: 'contact', value: c.contact },
  ]);
  await db
    .insert(s.faqs)
    .values(
      c.faqs.flatMap((group, gi) =>
        group.items.map((f, i) => ({ category: group.category, question: f.q, answer: f.a, sortOrder: gi * 100 + i })),
      ),
    );
  await db
    .insert(s.policies)
    .values(Object.entries(c.policies).map(([slug, p]) => ({ slug, title: p.title, sections: p.sections })));
  if (c.announcements.length) {
    await db
      .insert(s.announcements)
      .values(c.announcements.map((a, i) => ({ text: a.text, enabled: a.enabled, sortOrder: i })));
  }
  if (c.testimonials.length) {
    await db.insert(s.testimonials).values(
      c.testimonials.map((t, i) => ({
        name: t.name,
        initials: t.initials,
        rating: t.rating,
        item: t.item,
        text: t.text,
        status: t.status,
        sortOrder: i,
      })),
    );
  }
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
  const links = store.settings.socialLinks ?? [];
  if (links.length) {
    await db.insert(s.socialLinks).values(
      links.map((l, i) => ({
        platform: l.platform,
        division: l.division,
        handle: l.handle,
        url: l.url,
        enabled: l.enabled,
        sortOrder: i,
      })),
    );
  }

  /* Settings (no secrets: the prototype only stores "is set" flags) */
  const st = store.settings;
  await db.insert(s.settings).values([
    { key: 'business', value: st.business },
    { key: 'instagram', value: { urls: st.instagram, handles: st.instagramHandles } },
    { key: 'tiktok', value: st.tiktok ?? null },
    { key: 'pay_on_delivery', value: { enabled: st.payOnDeliveryEnabled } },
    { key: 'bank', value: st.bank },
    { key: 'delivery_estimate', value: { text: st.delivery.estimate } },
    { key: 'whatsapp', value: st.whatsapp },
    { key: 'email', value: st.smtp },
    { key: 'notifications', value: st.notifications },
    { key: 'security', value: st.security },
  ]);
  if (store.emailTemplates.length) {
    await db.insert(s.emailTemplates).values(
      store.emailTemplates.map((t) => ({
        key: t.id,
        name: t.name,
        subject: t.subject,
        body: t.body,
        variables: t.variables,
        enabled: t.enabled,
      })),
    );
  }

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
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
