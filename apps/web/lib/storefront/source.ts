import 'server-only';
import { asc, getTableColumns } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import type { AdminProduct, AdminService, SiteContent, SocialLink, Specialist, StoreSettings } from '@/types/admin';
import type { Category, VariantGroup } from '@/types/product';
import type { StorefrontSource } from '@/lib/storefront/derive';

const orUndefined = <T>(v: T | null): T | undefined => (v === null ? undefined : v);
const hhmm = (t: string) => t.slice(0, 5);

/** Policies have no sort column; these lead, in this order, and any others follow alphabetically. */
const POLICY_ORDER = ['privacy', 'terms', 'shipping', 'returns'];
const policyRank = (slug: string) => {
  const i = POLICY_ORDER.indexOf(slug);
  return i === -1 ? POLICY_ORDER.length : i;
};

function groupBy<T, K>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = out.get(k);
    if (list) list.push(r);
    else out.set(k, [r]);
  }
  return out;
}

async function loadProducts(categoryById: Map<string, { slug: string }>): Promise<AdminProduct[]> {
  // The search document is only used inside the database (lib/storefront/search.ts).
  const { searchDocument: _search, ...productColumns } = getTableColumns(s.products);
  const rows = await db
    .select(productColumns)
    .from(s.products)
    .orderBy(asc(s.products.division), asc(s.products.featuredRank), asc(s.products.createdAt));
  const stock = await db.select().from(s.inventory);
  const images = await db.select().from(s.productImages).orderBy(asc(s.productImages.sortOrder));
  const links = await db.select().from(s.productCategories);
  const options = await db.select().from(s.productOptions).orderBy(asc(s.productOptions.sortOrder));
  const values = await db.select().from(s.productOptionValues).orderBy(asc(s.productOptionValues.sortOrder));
  const stockBy = new Map(stock.map((r) => [r.productId, r]));
  const imagesBy = groupBy(images, (r) => r.productId);
  const linksBy = groupBy(links, (r) => r.productId);
  const optionsBy = groupBy(options, (r) => r.productId);
  const valuesBy = groupBy(values, (r) => r.optionId);

  return rows.map((p) => {
    const inv = stockBy.get(p.id);
    const variantMeta: AdminProduct['variantMeta'] = {};
    const variants: VariantGroup[] = (optionsBy.get(p.id) ?? []).map((o) => ({
      key: o.key,
      name: o.name,
      values: (valuesBy.get(o.id) ?? []).map((v) => {
        if (v.sku || !v.enabled) variantMeta[`${o.key}::${v.label}`] = { sku: orUndefined(v.sku), enabled: v.enabled };
        return {
          label: v.label,
          ...(v.priceDelta ? { priceDelta: v.priceDelta } : {}),
          ...(v.stock !== null ? { stock: v.stock } : {}),
        };
      }),
    }));
    return {
      id: p.id,
      slug: p.slug,
      division: p.division,
      name: p.name,
      shortDescription: p.shortDescription,
      description: p.description,
      price: p.price,
      originalPrice: orUndefined(p.compareAtPrice),
      images: (imagesBy.get(p.id) ?? []).map((i) => i.url),
      rating: p.rating,
      reviewCount: p.reviewCount,
      stock: inv?.stock ?? 0,
      categories: (linksBy.get(p.id) ?? [])
        .map((l) => categoryById.get(l.categoryId)?.slug)
        .filter((x): x is string => !!x),
      attributes: p.attributes,
      variants,
      specs: p.specs,
      usage: orUndefined(p.usage),
      isBestseller: p.isBestseller,
      isNew: p.isNew,
      featuredRank: p.featuredRank,
      salesCount: p.salesCount,
      createdAt: p.createdAt.toISOString(),
      sku: p.sku,
      status: p.status,
      lowStockThreshold: inv?.lowStockThreshold ?? 5,
      trackInventory: inv?.trackInventory ?? true,
      outOfStockBehaviour: inv?.outOfStockBehaviour === 'hide' ? 'hide' : 'show-sold-out',
      isFeatured: p.isFeatured,
      isSale: !!p.compareAtPrice && p.compareAtPrice > p.price,
      discountMode: p.discountMode,
      discountPercent: orUndefined(p.discountPercent),
      discountStart: orUndefined(p.discountStartsOn),
      discountEnd: orUndefined(p.discountEndsOn),
      benefits: orUndefined(p.benefits),
      care: orUndefined(p.care),
      shipping: p.shipping ?? { estimate: '', method: '', pickup: false, notes: '', handling: '' },
      variantMeta,
      updatedAt: p.updatedAt.toISOString(),
    };
  });
}

async function loadSalon(): Promise<{ services: AdminService[]; specialists: Specialist[] }> {
  const serviceRows = await db.select().from(s.services).orderBy(asc(s.services.sortOrder));
  const specialistRows = await db.select().from(s.specialists).orderBy(asc(s.specialists.createdAt));
  const links = await db.select().from(s.specialistServices);
  const hours = await db.select().from(s.availability).orderBy(asc(s.availability.weekday));
  const slugById = new Map(serviceRows.map((r) => [r.id, r.slug]));
  const linksBy = groupBy(links, (r) => r.specialistId);
  const hoursBy = groupBy(hours, (r) => r.specialistId);

  const services: AdminService[] = serviceRows.map((r) => ({
    slug: r.slug,
    name: r.name,
    category: r.category,
    shortDescription: r.shortDescription,
    description: r.description,
    includes: r.includes,
    startingPrice: r.startingPrice,
    duration: r.durationLabel,
    image: r.imageUrl ?? '',
    personnel: [],
    whatsapp: r.whatsapp ?? '',
    status: r.status,
    durationMinutes: r.durationMinutes,
    bookable: r.bookable,
  }));

  const specialists: Specialist[] = specialistRows.map((r) => {
    const days = hoursBy.get(r.id) ?? [];
    return {
      id: r.id,
      name: r.name,
      title: r.title,
      image: r.imageUrl ?? '',
      bio: r.bio,
      specialties: r.specialties,
      serviceSlugs: (linksBy.get(r.id) ?? []).map((l) => slugById.get(l.serviceId)).filter((x): x is string => !!x),
      workingDays: days.map((d) => d.weekday),
      hours: days.length
        ? { start: hhmm(days[0].startTime), end: hhmm(days[0].endTime) }
        : { start: '09:00', end: '18:00' },
      status: r.status === 'on_leave' ? 'on-leave' : r.status,
    };
  });
  return { services, specialists };
}

async function loadContent(): Promise<SiteContent> {
  const blocks = await db.select().from(s.siteContent);
  const faqRows = await db.select().from(s.faqs).orderBy(asc(s.faqs.sortOrder));
  const policyRows = await db.select().from(s.policies).orderBy(asc(s.policies.slug));
  const announcementRows = await db.select().from(s.announcements).orderBy(asc(s.announcements.sortOrder));
  const testimonialRows = await db.select().from(s.testimonials).orderBy(asc(s.testimonials.sortOrder));
  const block = <T>(key: string, fallback: T): T =>
    (blocks.find((b) => b.key === key)?.value as T | undefined) ?? fallback;
  const featured = block<{ collectionSlugs: string[]; productIds: string[]; serviceSlugs: string[] }>('featured', {
    collectionSlugs: [],
    productIds: [],
    serviceSlugs: [],
  });

  const faqs: SiteContent['faqs'] = [];
  for (const f of faqRows) {
    let group = faqs.find((g) => g.category === f.category);
    if (!group) faqs.push((group = { category: f.category, items: [] }));
    group.items.push({ q: f.question, a: f.answer });
  }

  return {
    announcements: announcementRows.map((a) => ({ id: a.id, text: a.text, enabled: a.enabled })),
    sections: block<SiteContent['sections']>('sections', []),
    hero: block<SiteContent['hero']>('hero', {
      eyebrow: '',
      line1: '',
      line2: '',
      accent: '',
      text: '',
      primaryCta: '',
      secondaryCta: '',
      image: '',
    }),
    intro: block<SiteContent['intro']>('intro', { heading: '', accent: '', text: '' }),
    divisions: block<SiteContent['divisions']>('divisions', []),
    featuredCollectionSlugs: featured.collectionSlugs,
    featuredProductIds: featured.productIds,
    featuredServiceSlugs: featured.serviceSlugs,
    salonSection: block<SiteContent['salonSection']>('salon_section', { heading: '', text: '' }),
    why: block<SiteContent['why']>('why', { heading: '', items: [] }),
    testimonials: testimonialRows.map((t) => ({
      id: t.id,
      name: t.name,
      initials: t.initials,
      rating: t.rating,
      item: t.item,
      text: t.text,
      status: t.status,
    })),
    about: block<SiteContent['about']>('about', {
      title: '',
      intro: '',
      description: '',
      mission: '',
      vision: '',
      values: [],
      image: '',
      cta: '',
    }),
    contact: block<SiteContent['contact']>('contact', { heading: '', text: '' }),
    faqs,
    policies: Object.fromEntries(
      [...policyRows]
        .sort((a, b) => policyRank(a.slug) - policyRank(b.slug) || a.slug.localeCompare(b.slug))
        .map((p) => [p.slug, { title: p.title, sections: p.sections }]),
    ),
  };
}

async function loadSettings(): Promise<StorefrontSource['settings']> {
  const rows = await db.select().from(s.settings);
  const rates = await db.select().from(s.deliveryRates).orderBy(asc(s.deliveryRates.state));
  const links = await db.select().from(s.socialLinks).orderBy(asc(s.socialLinks.sortOrder));
  const value = <T>(key: string): T | undefined => rows.find((r) => r.key === key)?.value as T | undefined;
  const business = value<StoreSettings['business']>('business') ?? {
    name: 'LUXICHIC',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    hours: '',
  };
  const instagram = value<{ urls: StoreSettings['instagram']; handles: StoreSettings['instagramHandles'] }>(
    'instagram',
  ) ?? { urls: { hairs: '', salon: '', tools: '' }, handles: { hairs: '', salon: '', tools: '' } };
  const whatsapp = value<StoreSettings['whatsapp']>('whatsapp');
  const socialLinks: SocialLink[] = links.map((l) => ({
    id: l.id,
    platform: l.platform,
    division: l.division,
    handle: l.handle,
    url: l.url,
    enabled: l.enabled,
  }));
  return {
    business,
    instagram: instagram.urls,
    instagramHandles: instagram.handles,
    tiktok: value<StoreSettings['tiktok']>('tiktok') ?? undefined,
    socialLinks,
    payOnDeliveryEnabled: value<{ enabled: boolean }>('pay_on_delivery')?.enabled ?? false,
    delivery: {
      estimate: value<{ text: string }>('delivery_estimate')?.text ?? '',
      rates: rates.map((r) => ({ state: r.state, fee: r.fee, free: r.isFree, enabled: r.enabled })),
    },
    bank: value<StoreSettings['bank']>('bank') ?? null,
    whatsapp: {
      businessNumber: whatsapp?.businessNumber ?? business.whatsapp,
      adminNumber: whatsapp?.adminNumber ?? business.whatsapp,
    },
  };
}

/** Reads the whole storefront source from the database (server code, bypasses RLS; filtering happens in derive). */
export async function loadStorefrontSource(): Promise<StorefrontSource> {
  const categoryRows = await db
    .select()
    .from(s.categories)
    .orderBy(asc(s.categories.division), asc(s.categories.sortOrder));
  const categoryById = new Map(categoryRows.map((c) => [c.id, c]));
  const toCategory = (c: (typeof categoryRows)[number]): Category => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    group: c.groupName,
    image: c.imageUrl ?? '',
  });

  // One query at a time: see the note on pipelining in db/index.ts.
  const products = await loadProducts(categoryById);
  const salon = await loadSalon();
  const content = await loadContent();
  const settings = await loadSettings();
  return {
    products,
    categories: {
      hairs: categoryRows.filter((c) => c.division === 'hairs').map(toCategory),
      tools: categoryRows.filter((c) => c.division === 'tools').map(toCategory),
    },
    services: salon.services,
    specialists: salon.specialists,
    content,
    settings,
  };
}
