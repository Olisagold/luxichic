import type {
  AdminProduct,
  AdminService,
  DeliveryRate,
  SiteContent,
  SocialLink,
  Specialist,
  StoreSettings,
} from '@/types/admin';
import type { Category, Product } from '@/types/product';
import type { SalonService } from '@/types/salon';
import { initials } from '@/lib/utils/text';

/** The catalog, content and public settings the storefront is built from (database or prototype data). */
export interface StorefrontSource {
  products: AdminProduct[];
  categories: { hairs: Category[]; tools: Category[] };
  services: AdminService[];
  specialists: Specialist[];
  content: SiteContent;
  /** The latest real 4–5★ reviews with something to say, shown with the admin's testimonials on the homepage. */
  reviewQuotes: { authorName: string; rating: number; body: string; productName: string }[];
  settings: Pick<
    StoreSettings,
    'business' | 'instagram' | 'instagramHandles' | 'tiktok' | 'socialLinks' | 'payOnDeliveryEnabled'
  > & {
    delivery: { estimate: string; rates: DeliveryRate[] };
    whatsapp: { businessNumber: string; adminNumber: string };
    /** Bank account for transfers; null until one is set. */
    bank: StoreSettings['bank'] | null;
  };
}

type Handle = { handle: string; url: string };

/** Shortens text to at most `max` characters, at a word break where there's one near the end. */
function clip(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const space = t.lastIndexOf(' ', max - 1);
  const cut = space > max * 0.6 ? space : max - 1;
  return t.slice(0, cut).replace(/[,.;:!?]+$/, '') + '…';
}

/** Everything a storefront page can show, already filtered to what customers may see. */
export interface StorefrontData {
  /** Published products, with the price customers pay today. */
  products: Product[];
  categories: { hairs: Category[]; tools: Category[] };
  /** Published salon services, with the active specialists who perform them. */
  services: SalonService[];
  content: {
    /** Enabled homepage sections, in order. */
    sections: string[];
    announcements: string[];
    hero: SiteContent['hero'];
    intro: SiteContent['intro'];
    divisions: SiteContent['divisions'];
    featuredCollectionSlugs: string[];
    featuredProductIds: string[];
    featuredServiceSlugs: string[];
    salonSection: SiteContent['salonSection'];
    why: SiteContent['why'];
    testimonials: { name: string; initials: string; rating: number; item: string; text: string }[];
    about: SiteContent['about'];
    contact: SiteContent['contact'];
    faqs: SiteContent['faqs'];
    policies: SiteContent['policies'];
  };
  business: {
    name: string;
    contact: { email: string; phone: string; address: string; hours: string };
    whatsapp: { general: string; orders: string };
    instagram: { hairs: Handle; salon: Handle; tools: Handle };
    tiktok?: Handle;
    socialLinks: SocialLink[];
    payOnDeliveryEnabled: boolean;
    deliveryEstimate: string;
  };
  /** What checkout shows. `placeOrder` re-reads all of it from the database. */
  checkout: {
    bank: StoreSettings['bank'] | null;
    /** Delivery fee per state we deliver to (free states are 0). Other states can't be chosen. */
    deliveryFees: Record<string, number>;
  };
}

/** The fee per state customers can choose: free states are 0, states switched off are left out. */
export function deliveryFeesFrom(rates: StoreSettings['delivery']['rates']): Record<string, number> {
  return Object.fromEntries(rates.filter((r) => r.enabled).map((r) => [r.state, r.free ? 0 : r.fee]));
}

function activeDiscount(p: AdminProduct, today: string): boolean {
  if (p.discountStart && today < p.discountStart) return false;
  if (p.discountEnd && today > p.discountEnd) return false;
  return p.discountMode !== 'none';
}

/** The price and options a customer sees for one product. */
export function toStorefrontProduct(p: AdminProduct, today = new Date().toISOString().slice(0, 10)): Product {
  const regular = p.originalPrice && p.originalPrice > p.price ? p.originalPrice : p.price;
  const onSale = activeDiscount(p, today);
  const variants = p.variants
    .map((g) => ({ ...g, values: g.values.filter((v) => p.variantMeta[`${g.key}::${v.label}`]?.enabled !== false) }))
    .filter((g) => g.values.length > 0);
  return {
    id: p.id,
    slug: p.slug,
    division: p.division,
    name: p.name,
    shortDescription: p.shortDescription,
    description: p.description,
    price: onSale ? p.price : regular,
    originalPrice: onSale ? regular : undefined,
    images: p.images,
    rating: p.rating,
    reviewCount: p.reviewCount,
    stock: p.trackInventory ? p.stock : 999,
    categories: p.categories,
    attributes: p.attributes,
    variants,
    specs: p.specs,
    usage: p.usage,
    isBestseller: p.isBestseller,
    isNew: p.isNew,
    featuredRank: p.isFeatured ? p.featuredRank : p.featuredRank + 100,
    salesCount: p.salesCount,
    createdAt: p.createdAt,
  };
}

export function deriveStorefront(src: StorefrontSource, today = new Date().toISOString().slice(0, 10)): StorefrontData {
  const products = src.products
    .filter((p) => p.status === 'published' && !(p.outOfStockBehaviour === 'hide' && p.trackInventory && p.stock <= 0))
    .map((p) => toStorefrontProduct(p, today));

  const services: SalonService[] = src.services
    .filter((x) => x.status === 'published')
    .map((x) => ({
      slug: x.slug,
      name: x.name,
      category: x.category,
      shortDescription: x.shortDescription,
      description: x.description,
      includes: x.includes,
      startingPrice: x.startingPrice,
      duration: x.duration,
      image: x.image,
      whatsapp: x.whatsapp,
      personnel: src.specialists
        .filter((sp) => sp.status === 'active' && sp.serviceSlugs.includes(x.slug))
        .map((sp) => ({ id: sp.id, name: sp.name, role: sp.title })),
    }));

  const c = src.content;
  const st = src.settings;
  const instagram = {
    hairs: { handle: st.instagramHandles.hairs, url: st.instagram.hairs },
    salon: { handle: st.instagramHandles.salon, url: st.instagram.salon },
    tools: { handle: st.instagramHandles.tools, url: st.instagram.tools },
  };
  // Instagram galleries follow the first enabled Instagram link of each division.
  (['hairs', 'salon', 'tools'] as const).forEach((d) => {
    const ig = (st.socialLinks ?? []).find((l) => l.enabled && l.division === d && l.platform === 'instagram');
    if (ig) instagram[d] = { handle: ig.handle, url: ig.url };
  });

  return {
    products,
    categories: src.categories,
    services,
    content: {
      sections: c.sections.filter((x) => x.enabled).map((x) => x.id),
      announcements: c.announcements.filter((a) => a.enabled).map((a) => a.text),
      hero: c.hero,
      intro: c.intro,
      divisions: c.divisions,
      featuredCollectionSlugs: c.featuredCollectionSlugs,
      featuredProductIds: c.featuredProductIds,
      featuredServiceSlugs: c.featuredServiceSlugs,
      salonSection: c.salonSection,
      why: c.why,
      // The admin's own testimonials first, then real customer reviews; the section hides when there are none.
      testimonials: [
        ...c.testimonials
          .filter((t) => t.status === 'active')
          .map(({ name, initials, rating, item, text }) => ({ name, initials, rating, item, text })),
        ...src.reviewQuotes.map((r) => ({
          name: r.authorName,
          initials: initials(r.authorName),
          rating: r.rating,
          item: r.productName,
          text: clip(r.body, 240),
        })),
      ],
      about: c.about,
      contact: c.contact,
      faqs: c.faqs,
      policies: c.policies,
    },
    business: {
      name: st.business.name,
      contact: {
        email: st.business.email,
        phone: st.business.phone,
        address: st.business.address,
        hours: st.business.hours,
      },
      whatsapp: { general: st.business.whatsapp, orders: st.whatsapp.adminNumber },
      instagram,
      tiktok: st.tiktok,
      socialLinks: (st.socialLinks ?? []).filter((l) => l.enabled),
      payOnDeliveryEnabled: st.payOnDeliveryEnabled,
      deliveryEstimate: st.delivery.estimate,
    },
    checkout: {
      bank: st.bank,
      deliveryFees: deliveryFeesFrom(st.delivery.rates),
    },
  };
}
