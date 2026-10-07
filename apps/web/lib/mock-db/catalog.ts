import type { AdminProduct, AdminUser, Discount, ProductStatus } from '@/types/admin';
import type { Category, Division } from '@/types/product';
import { getDb, logActivity, pushNotification, updateDb } from '@/lib/mock-db/db';
import { generateId } from '@/lib/utils/references';
import { formatNaira } from '@/lib/utils/currency';
import { slugify } from '@/lib/utils/text';

/**
 * Catalog service — products, inventory, categories and discounts.
 * Replace each function body with an API call when the backend is ready.
 */

export function emptyProduct(division: Division): AdminProduct {
  const now = new Date().toISOString();
  return {
    id: generateId(division === 'hairs' ? 'h' : 't'),
    slug: '',
    division,
    name: '',
    shortDescription: '',
    description: '',
    price: 0,
    images: [],
    rating: 0,
    reviewCount: 0,
    stock: 0,
    categories: [],
    attributes: {},
    variants: [],
    specs: [],
    featuredRank: 50,
    salesCount: 0,
    createdAt: now,
    sku: '',
    status: 'draft',
    lowStockThreshold: 5,
    trackInventory: true,
    outOfStockBehaviour: 'show-sold-out',
    isFeatured: false,
    isSale: false,
    discountMode: 'none',
    shipping: { estimate: '1–3 working days in Lagos · 3–7 elsewhere', method: 'Door delivery', pickup: true, notes: '', handling: '' },
    variantMeta: {},
    updatedAt: now
  };
}

export function saveProduct(actor: AdminUser, p: AdminProduct) {
  const existing = getDb().products.find((x) => x.id === p.id);
  const now = new Date().toISOString();
  const next: AdminProduct = { ...p, slug: p.slug || slugify(p.name), updatedAt: now };
  updateDb((d) => {
    if (existing) {
      d.products = d.products.map((x) => x.id === p.id ? next : x);
      if (existing.price !== next.price || existing.originalPrice !== next.originalPrice) {
        logActivity(d, actor, 'Products', 'Changed price', `${next.name} · ${formatNaira(existing.price)} → ${formatNaira(next.price)}`, `/admin/products/${next.id}`);
      }
      if (existing.stock !== next.stock) {
        d.stockMoves.unshift({ id: generateId('mv'), productId: next.id, productName: next.name, change: next.stock - existing.stock, resultingStock: next.stock, reason: 'Edited in product editor', by: actor.fullName, at: now });
      }
      logActivity(d, actor, 'Products', 'Edited product', next.name, `/admin/products/${next.id}`);
    } else {
      d.products = [next, ...d.products];
      logActivity(d, actor, 'Products', 'Created product', next.name, `/admin/products/${next.id}`);
    }
  });
  return next;
}

export function duplicateProduct(actor: AdminUser, id: string) {
  const src = getDb().products.find((p) => p.id === id);
  if (!src) return null;
  const copy: AdminProduct = {
    ...JSON.parse(JSON.stringify(src)),
    id: generateId(src.division === 'hairs' ? 'h' : 't'),
    name: `${src.name} (Copy)`,
    slug: `${src.slug}-copy-${Math.random().toString(36).slice(2, 5)}`,
    sku: `${src.sku}-C`,
    status: 'draft',
    salesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  updateDb((d) => {
    d.products = [copy, ...d.products];
    logActivity(d, actor, 'Products', 'Duplicated product', `${src.name} → draft copy`, `/admin/products/${copy.id}`);
  });
  return copy;
}

export function setProductStatus(actor: AdminUser, ids: string[], status: ProductStatus) {
  updateDb((d) => {
    d.products.forEach((p) => {
      if (ids.includes(p.id)) {
        p.status = status;
        p.updatedAt = new Date().toISOString();
      }
    });
    const verb = status === 'published' ? 'Published' : status === 'archived' ? 'Archived' : 'Unpublished';
    logActivity(d, actor, 'Products', `${verb} ${ids.length} product${ids.length > 1 ? 's' : ''}`, names(d.products, ids));
  });
}

export function setProductFlag(actor: AdminUser, ids: string[], flag: 'isFeatured' | 'isBestseller' | 'isNew' | 'isSale', value: boolean) {
  const label = { isFeatured: 'Featured', isBestseller: 'Bestseller', isNew: 'New Arrival', isSale: 'Sale' }[flag];
  updateDb((d) => {
    d.products.forEach((p) => {
      if (ids.includes(p.id)) p[flag] = value;
    });
    logActivity(d, actor, 'Products', `${value ? 'Marked' : 'Removed'} ${label}`, names(d.products, ids));
  });
}

export function setProductCategory(actor: AdminUser, ids: string[], categorySlug: string) {
  updateDb((d) => {
    d.products.forEach((p) => {
      if (ids.includes(p.id) && !p.categories.includes(categorySlug)) p.categories = [...p.categories, categorySlug];
    });
    logActivity(d, actor, 'Products', `Added category “${categorySlug}”`, names(d.products, ids));
  });
}

export function deleteProducts(actor: AdminUser, ids: string[]) {
  updateDb((d) => {
    const label = names(d.products, ids);
    d.products = d.products.filter((p) => !ids.includes(p.id));
    logActivity(d, actor, 'Products', `Deleted ${ids.length} product${ids.length > 1 ? 's' : ''}`, label);
  });
}

function names(list: AdminProduct[], ids: string[]) {
  const n = list.filter((p) => ids.includes(p.id)).map((p) => p.name);
  return n.length > 2 ? `${n.slice(0, 2).join(', ')} +${n.length - 2} more` : n.join(', ');
}

/* ------------------------------ Inventory ------------------------------ */

export type StockMode = 'add' | 'remove' | 'set';

export function adjustStock(
actor: AdminUser, productId: string, mode: StockMode, amount: number, reason: string, variant?: {groupKey: string;label: string;})
{
  updateDb((d) => {
    const p = d.products.find((x) => x.id === productId);
    if (!p) return;
    const apply = (current: number) => Math.max(0, mode === 'set' ? amount : mode === 'add' ? current + amount : current - amount);
    let before: number;
    let after: number;
    let variantLabel: string | undefined;
    if (variant) {
      const g = p.variants.find((x) => x.key === variant.groupKey);
      const v = g?.values.find((x) => x.label === variant.label);
      if (!g || !v) return;
      before = v.stock ?? p.stock;
      after = apply(before);
      v.stock = after;
      variantLabel = `${g.name}: ${v.label}`;
    } else {
      before = p.stock;
      after = apply(before);
      p.stock = after;
    }
    p.updatedAt = new Date().toISOString();
    d.stockMoves.unshift({ id: generateId('mv'), productId, productName: p.name, variant: variantLabel, change: after - before, resultingStock: after, reason: reason || 'Manual adjustment', by: actor.fullName, at: p.updatedAt });
    logActivity(d, actor, 'Inventory', 'Changed stock', `${p.name}${variantLabel ? ` (${variantLabel})` : ''} · ${before} → ${after}`, `/admin/inventory?q=${encodeURIComponent(p.name)}`);
    if (after <= p.lowStockThreshold && after < before) {
      pushNotification(d, { kind: 'stock', title: 'Low stock', body: `${p.name}${variantLabel ? ` · ${variantLabel}` : ''} has ${after} left.`, link: `/admin/inventory?q=${encodeURIComponent(p.name)}` });
    }
  });
}

export function setThreshold(actor: AdminUser, productId: string, threshold: number) {
  updateDb((d) => {
    const p = d.products.find((x) => x.id === productId);
    if (!p) return;
    p.lowStockThreshold = Math.max(0, threshold);
    logActivity(d, actor, 'Inventory', 'Changed low-stock threshold', `${p.name} · ${threshold}`);
  });
}

/** Effective stock: lowest of product stock and any explicit variant stocks. */
export function effectiveStock(p: AdminProduct): number {
  return p.stock;
}

export function stockState(p: AdminProduct): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  if (!p.trackInventory) return 'In Stock';
  if (p.stock <= 0) return 'Out of Stock';
  if (p.stock <= p.lowStockThreshold) return 'Low Stock';
  return 'In Stock';
}

export function lowVariantCount(p: AdminProduct): number {
  return p.variants.reduce((n, g) => n + g.values.filter((v) => v.stock !== undefined && v.stock <= p.lowStockThreshold).length, 0);
}

/* ------------------------------ Categories ------------------------------ */

export function saveCategory(actor: AdminUser, division: Division, cat: Category, originalSlug?: string) {
  updateDb((d) => {
    const list = d.categories[division];
    const idx = list.findIndex((c) => c.slug === (originalSlug ?? cat.slug));
    if (idx >= 0) list[idx] = cat;else
    list.push(cat);
    logActivity(d, actor, 'Categories', idx >= 0 ? 'Edited category' : 'Created category', `${cat.name} (${division === 'hairs' ? 'Hairs' : 'Tools'})`);
  });
}

export function deleteCategory(actor: AdminUser, division: Division, slug: string) {
  updateDb((d) => {
    const cat = d.categories[division].find((c) => c.slug === slug);
    d.categories[division] = d.categories[division].filter((c) => c.slug !== slug);
    d.products.forEach((p) => {
      p.categories = p.categories.filter((c) => c !== slug);
    });
    logActivity(d, actor, 'Categories', 'Deleted category', cat?.name ?? slug);
  });
}

/* ------------------------------ Discounts ------------------------------ */

export function saveDiscount(actor: AdminUser, disc: Discount) {
  updateDb((d) => {
    const exists = d.discounts.some((x) => x.id === disc.id);
    d.discounts = exists ? d.discounts.map((x) => x.id === disc.id ? disc : x) : [disc, ...d.discounts];
    logActivity(d, actor, 'Discounts', exists ? 'Edited discount' : 'Created discount', disc.code);
  });
}

export function deleteDiscount(actor: AdminUser, id: string) {
  updateDb((d) => {
    const disc = d.discounts.find((x) => x.id === id);
    d.discounts = d.discounts.filter((x) => x.id !== id);
    logActivity(d, actor, 'Discounts', 'Deleted discount', disc?.code);
  });
}