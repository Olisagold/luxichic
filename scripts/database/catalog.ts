/**
 * The storefront catalog and content from the prototype (apps/web/data): what the shop displays.
 * Used by the dev seed and by `pnpm db:load-catalog`, which gives production the same starting catalog.
 *
 * Deliberately NOT here (demo-only, see seed.ts): customers, orders, appointments, reviews, promo codes, the
 * demo bank account, the media library, closed days, notifications and activity logs.
 */
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import * as s from '../../apps/web/db/schema';
import type { buildInitialDb } from '../../apps/web/data/prototype-store';
import { productValues, writeProductDetails } from '../../apps/web/lib/catalog/product-rows';

/** The database or a transaction on it. */
type Db = PgDatabase<PostgresJsQueryResultHKT, typeof s>;
type Store = ReturnType<typeof buildInitialDb>;

export const snake = (v: string) => v.toLowerCase().replace(/[\s-]+/g, '_');

export interface CatalogRefs {
  /** `${division}:${slug}` → id */
  categoryIds: Map<string, string>;
  /** prototype product id → uuid */
  productIds: Map<string, string>;
  /** service slug → uuid */
  serviceIds: Map<string, string>;
  /** prototype specialist id → uuid */
  specialistIds: Map<string, string>;
}

export async function loadCatalog(db: Db, store: Store): Promise<CatalogRefs> {
  /* Categories */
  const categoryIds = new Map<string, string>();
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

  /* Products (stored the same way the admin editor saves them: lib/catalog/product-rows.ts) */
  const productIds = new Map<string, string>();
  for (const p of store.products) {
    const [row] = await db
      .insert(s.products)
      .values({
        ...productValues(p),
        rating: p.rating,
        reviewCount: p.reviewCount,
        salesCount: p.salesCount,
        createdAt: new Date(p.createdAt),
      })
      .returning({ id: s.products.id });
    productIds.set(p.id, row.id);
    await writeProductDetails(db, row.id, p, (slug) => categoryIds.get(`${p.division}:${slug}`));
  }
  const productRef = (legacyId: string) => productIds.get(legacyId) ?? null;

  /* Delivery fees per state */
  await db
    .insert(s.deliveryRates)
    .values(
      store.settings.delivery.rates.map((r) => ({ state: r.state, fee: r.fee, isFree: r.free, enabled: r.enabled })),
    );

  /* Salon */
  const serviceIds = new Map<string, string>();
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

  const specialistIds = new Map<string, string>();
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

  /* Public business settings the storefront displays (no bank details, no secrets) */
  const st = store.settings;
  await db.insert(s.settings).values([
    { key: 'business', value: st.business },
    { key: 'instagram', value: { urls: st.instagram, handles: st.instagramHandles } },
    { key: 'tiktok', value: st.tiktok ?? null },
    { key: 'pay_on_delivery', value: { enabled: st.payOnDeliveryEnabled } },
    { key: 'delivery_estimate', value: { text: st.delivery.estimate } },
    { key: 'whatsapp', value: st.whatsapp },
  ]);

  /* Email templates (LUXICHIC wording, used from Phase 9) */
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

  return { categoryIds, productIds, serviceIds, specialistIds };
}
