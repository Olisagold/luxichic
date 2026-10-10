import { useSyncExternalStore } from 'react';
import type { Category, Product } from '@/types/product';
import type { SalonService } from '@/types/salon';
import type {
  ActivityEntry,
  ActivitySection,
  AdminNotification,
  AdminProduct,
  AdminUser,
  StoreDb,
} from '@/types/admin';
import { hairProducts } from '@/data/hairProducts';
import { toolProducts } from '@/data/toolProducts';
import { hairCategories, toolCategories } from '@/data/categories';
import { salonServices } from '@/data/services';
import { businessConfig } from '@/data/config';
import { announcements, brandValues, faqs, policies, siteContent, testimonials, whyChoose } from '@/data/content';
import { generateId } from '@/lib/utils/references';
import { buildInitialDb, clone, VERSION } from '@/lib/mock-db/initial';

export { buildInitialDb };

/**
 * PROTOTYPE DATA LAYER
 * ---------------------------------------------------------------
 * A single persisted store shared by the storefront and the admin.
 * Each admin service function (services/*.ts) reads and writes through
 * `updateDb`. To connect a backend, replace those functions with API calls
 * and hydrate this store from the server response — the UI stays the same.
 */

const STORAGE_KEY = 'lx_store_v1';

/** Reads the persisted store from the browser, if any. */
function readStored(): StoreDb | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreDb;
      if (parsed.version === VERSION) return parsed;
    }
  } catch {
    /* ignore corrupt or unavailable storage */
  }
  return null;
}

/*
 * Server render and the first client render both use the seed data so hydration
 * matches; `hydrateDb()` swaps in the browser's persisted copy after mount.
 */
const initialDb: StoreDb = buildInitialDb();
let db: StoreDb = initialDb;
let hydrated = false;
const listeners = new Set<() => void>();

/* ------------------------------------------------------------------ */
/* Storefront sync                                                      */
/* ------------------------------------------------------------------ */

function replaceArray<T>(target: T[], next: T[]) {
  target.splice(0, target.length, ...next);
}

function activeDiscount(p: AdminProduct): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (p.discountStart && today < p.discountStart) return false;
  if (p.discountEnd && today > p.discountEnd) return false;
  return p.discountMode !== 'none';
}

export function toStorefrontProduct(p: AdminProduct): Product {
  const regular = p.originalPrice && p.originalPrice > p.price ? p.originalPrice : p.price;
  const onSale = activeDiscount(p);
  const variants = p.variants
    .map((g) => ({ ...g, values: g.values.filter((v) => p.variantMeta[`${g.key}::${v.label}`]?.enabled !== false) }))
    .filter((g) => g.values.length > 0);
  return {
    ...p,
    price: onSale ? p.price : regular,
    originalPrice: onSale ? regular : undefined,
    variants,
    featuredRank: p.isFeatured ? p.featuredRank : p.featuredRank + 100,
    stock: p.trackInventory ? p.stock : 999,
  };
}

function applyToStorefront(s: StoreDb) {
  const visible = s.products
    .filter((p) => p.status === 'published' && !(p.outOfStockBehaviour === 'hide' && p.trackInventory && p.stock <= 0))
    .map(toStorefrontProduct);
  replaceArray(
    hairProducts,
    visible.filter((p) => p.division === 'hairs'),
  );
  replaceArray(
    toolProducts,
    visible.filter((p) => p.division === 'tools'),
  );
  replaceArray(hairCategories, s.categories.hairs as Category[]);
  replaceArray(toolCategories, s.categories.tools as Category[]);

  const services: SalonService[] = s.services
    .filter((x) => x.status === 'published')
    .map((x) => ({
      ...x,
      personnel: s.specialists
        .filter((sp) => sp.status === 'active' && sp.serviceSlugs.includes(x.slug))
        .map((sp) => ({ id: sp.id, name: sp.name, role: sp.title })),
    }));
  replaceArray(salonServices, services);

  const st = s.settings;
  businessConfig.payOnDeliveryEnabled = st.payOnDeliveryEnabled;
  businessConfig.bank = { ...st.bank };
  businessConfig.whatsapp = { general: st.business.whatsapp, orders: st.whatsapp.adminNumber };
  businessConfig.contact = {
    email: st.business.email,
    phone: st.business.phone,
    address: st.business.address,
    hours: st.business.hours,
  };
  businessConfig.instagram = {
    hairs: { handle: st.instagramHandles.hairs, url: st.instagram.hairs },
    salon: { handle: st.instagramHandles.salon, url: st.instagram.salon },
    tools: { handle: st.instagramHandles.tools, url: st.instagram.tools },
  };
  if (st.tiktok) businessConfig.tiktok = { ...st.tiktok };
  // Instagram galleries follow the first enabled Instagram link of each division.
  (['hairs', 'salon', 'tools'] as const).forEach((d) => {
    const ig = (st.socialLinks ?? []).find((l) => l.enabled && l.division === d && l.platform === 'instagram');
    if (ig) businessConfig.instagram[d] = { handle: ig.handle, url: ig.url };
  });
  businessConfig.delivery.fees = Object.fromEntries(st.delivery.rates.map((r) => [r.state, r.free ? 0 : r.fee]));
  businessConfig.delivery.disabled = st.delivery.rates.filter((r) => !r.enabled).map((r) => r.state);
  businessConfig.delivery.estimate = st.delivery.estimate;
  const today = new Date().toISOString().slice(0, 10);
  businessConfig.promoCodes = s.discounts
    .filter(
      (d) => d.active && d.startsAt <= today && d.endsAt >= today && (d.usageLimit === null || d.used < d.usageLimit),
    )
    .map((d) => ({
      code: d.code,
      percent: d.type === 'percent' ? d.value : 0,
      amount: d.type === 'fixed' ? d.value : undefined,
      minSpend: d.minSpend,
      label: d.type === 'percent' ? `${d.value}% off your order` : `₦${d.value.toLocaleString()} off your order`,
    }));
  businessConfig.salon.blocks = s.blocks;

  const c = s.content;
  replaceArray(
    announcements,
    c.announcements.filter((a) => a.enabled).map((a) => a.text),
  );
  replaceArray(
    whyChoose,
    c.why.items.map((w) => ({ ...w })),
  );
  replaceArray(
    testimonials,
    c.testimonials
      .filter((t) => t.status === 'active')
      .map(({ name, initials, rating, item, text }) => ({ name, initials, rating, item, text })),
  );
  replaceArray(faqs, clone(c.faqs));
  Object.keys(policies).forEach((k) => delete policies[k]);
  Object.assign(policies, clone(c.policies));
  replaceArray(
    brandValues,
    c.about.values.map((v) => ({ ...v })),
  );
  siteContent.sections = c.sections.filter((x) => x.enabled).map((x) => x.id);
  Object.assign(siteContent.hero, c.hero);
  Object.assign(siteContent.intro, c.intro);
  Object.assign(siteContent.about, {
    title: c.about.title,
    intro: c.about.intro,
    description: c.about.description,
    mission: c.about.mission,
    vision: c.about.vision,
    image: c.about.image,
    cta: c.about.cta,
  });
}

applyToStorefront(db);

/* ------------------------------------------------------------------ */
/* Store API                                                            */
/* ------------------------------------------------------------------ */

export function getDb(): StoreDb {
  return db;
}

function getServerDb(): StoreDb {
  return initialDb;
}

/** Loads the persisted store once on the client. Returns true if it replaced the seed data. */
export function hydrateDb(): boolean {
  if (hydrated) return false;
  hydrated = true;
  const stored = readStored();
  if (!stored) return false;
  db = stored;
  applyToStorefront(db);
  listeners.forEach((l) => l());
  return true;
}

export function updateDb(fn: (draft: StoreDb) => StoreDb | void) {
  const draft = clone(db);
  const result = fn(draft);
  db = result ?? draft;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* storage full */
  }
  applyToStorefront(db);
  listeners.forEach((l) => l());
}

export function resetDb() {
  db = buildInitialDb();
  window.localStorage.removeItem(STORAGE_KEY);
  applyToStorefront(db);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Subscribes to the whole store snapshot; the selector runs after, so it may derive freely. */
export function useDb<T>(selector: (s: StoreDb) => T): T {
  const snapshot = useSyncExternalStore(subscribe, getDb, getServerDb);
  return selector(snapshot);
}

/* ------------------------------------------------------------------ */
/* Audit + notifications                                                */
/* ------------------------------------------------------------------ */

export interface Actor {
  id: string;
  fullName: string;
}

export function logActivity(
  draft: StoreDb,
  actor: Actor,
  section: ActivitySection,
  action: string,
  target?: string,
  link?: string,
) {
  const entry: ActivityEntry = {
    id: generateId('act'),
    at: new Date().toISOString(),
    adminId: actor.id,
    adminName: actor.fullName,
    section,
    action,
    target,
    link,
  };
  draft.activity = [entry, ...draft.activity].slice(0, 500);
}

export function pushNotification(draft: StoreDb, n: Omit<AdminNotification, 'id' | 'at' | 'read'>) {
  draft.notifications = [
    { ...n, id: generateId('ntf'), at: new Date().toISOString(), read: false },
    ...draft.notifications,
  ].slice(0, 200);
}

export function findAdmin(email: string): AdminUser | undefined {
  return db.admins.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
}
