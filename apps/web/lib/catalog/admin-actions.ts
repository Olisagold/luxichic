'use server';

import { revalidateTag } from 'next/cache';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import * as s from '@/db/schema';
import { AuthorizationError, requirePermission } from '@/lib/auth/session';
import { productValues, writeProductDetails } from '@/lib/catalog/product-rows';
import { STOREFRONT_TAG } from '@/lib/storefront/data';
import { loadAdminCatalog } from '@/lib/storefront/source';
import { slugify } from '@/lib/utils/text';
import { isUuid } from '@/lib/utils/validation';
import type { AdminProduct, AdminUser, Permission, ProductStatus } from '@/types/admin';
import type { Result } from '@/types/user';

/**
 * Admin product and inventory actions. Each checks its permission on the server, writes to `audit_logs` and
 * refreshes the storefront cache so customers see the change at once.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

class ActionError extends Error {}

async function asAdmin<T extends Result>(
  permission: Permission,
  fn: (admin: AdminUser) => Promise<T>,
): Promise<T | Result> {
  try {
    const result = await fn(await requirePermission(permission));
    if (result.ok) revalidateTag(STOREFRONT_TAG);
    return result;
  } catch (e) {
    if (e instanceof AuthorizationError || e instanceof ActionError) return { ok: false, error: e.message };
    throw e;
  }
}

async function audit(
  tx: Tx | typeof db,
  admin: AdminUser,
  section: string,
  action: string,
  target: string,
  link?: string,
) {
  await tx.insert(s.auditLogs).values({ adminId: admin.id, adminName: admin.fullName, section, action, target, link });
}

/** "A, B +3 more" for the audit log. */
async function namesOf(ids: string[]): Promise<string> {
  const rows = await db.select({ name: s.products.name }).from(s.products).where(inArray(s.products.id, ids));
  const names = rows.map((r) => r.name);
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2} more` : names.join(', ');
}

const ids = (list: unknown): string[] => (Array.isArray(list) ? list.filter(isUuid).slice(0, 500) : []);
const plural = (n: number) => `${n} product${n === 1 ? '' : 's'}`;

/* ------------------------------------------------------------------ */
/* Product editor                                                      */
/* ------------------------------------------------------------------ */

const int = (min = 0) => z.number().int().min(min);
const productSchema = z
  .object({
    id: z.string(),
    division: z.enum(['hairs', 'tools']),
    name: z.string().trim().min(1, 'Enter a product name.').max(200),
    sku: z.string().trim().min(1, 'Enter a SKU.').max(60),
    slug: z.string().trim().max(120),
    price: int(1),
    originalPrice: int(1).optional(),
    status: z.enum(['draft', 'published', 'archived']),
    categories: z.array(z.string().max(100)).min(1, 'Choose at least one category.').max(50),
    images: z
      .array(
        z
          .string()
          .max(1000)
          .regex(/^(https:\/\/|\/)/),
      )
      .max(20),
    stock: int(),
    lowStockThreshold: int(),
    trackInventory: z.boolean(),
    discountMode: z.enum(['none', 'fixed', 'percent']),
    discountPercent: int(1).max(99).optional(),
    featuredRank: z.number().int(),
  })
  .passthrough();

function uniqueSlug(taken: Set<string>, base: string): string {
  let slug = base || 'product';
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/**
 * Creates or saves a product from the editor. SKU and URL slug must be unique; a published product needs an
 * image. Returns the product's id (new products get one here).
 */
export async function saveProduct(input: AdminProduct): Promise<Result & { id?: string; slug?: string }> {
  const existingId = isUuid(input?.id) ? input.id : null;
  const [existing] = existingId
    ? await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.id, existingId))
    : [];
  return asAdmin(existing ? 'products.edit' : 'products.create', async (admin) => {
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) {
      throw new ActionError(parsed.error.issues[0]?.message ?? 'Please check the highlighted fields.');
    }
    const p = { ...input, ...parsed.data } as AdminProduct;
    if (p.status === 'published' && !p.images.length)
      throw new ActionError('Add at least one image before publishing.');

    const others = await db
      .select({ sku: s.products.sku, slug: s.products.slug })
      .from(s.products)
      .where(existing ? ne(s.products.id, existing.id) : undefined);
    if (others.some((o) => o.sku.toLowerCase() === p.sku.toLowerCase())) {
      throw new ActionError('Another product already uses this SKU.');
    }
    const takenSlugs = new Set(others.map((o) => o.slug));
    const wanted = slugify(p.slug || p.name);
    if (existing && takenSlugs.has(wanted)) throw new ActionError('Another product already uses this URL.');
    const slug = uniqueSlug(takenSlugs, wanted);

    const categories = await db
      .select({ id: s.categories.id, slug: s.categories.slug })
      .from(s.categories)
      .where(eq(s.categories.division, p.division));
    const categoryId = (slugValue: string) => categories.find((c) => c.slug === slugValue)?.id;
    if (!p.categories.some(categoryId)) throw new ActionError('Choose at least one category.');

    const product = { ...p, slug };
    const id = await db.transaction(async (tx) => {
      let productId: string;
      let before: number | undefined;
      if (existing) {
        productId = existing.id;
        [{ stock: before }] = (await tx
          .select({ stock: s.inventory.stock })
          .from(s.inventory)
          .where(eq(s.inventory.productId, productId))) as [{ stock: number }];
        await tx
          .update(s.products)
          .set({ ...productValues(product), updatedAt: new Date() })
          .where(eq(s.products.id, productId));
      } else {
        const [row] = await tx.insert(s.products).values(productValues(product)).returning({ id: s.products.id });
        productId = row.id;
      }
      await writeProductDetails(tx, productId, product, categoryId);
      if (before !== product.stock) {
        await tx.insert(s.stockMovements).values({
          productId,
          change: product.stock - (before ?? 0),
          resultingStock: product.stock,
          reason: existing ? 'Edited in the product editor' : 'Opening stock',
          adminId: admin.id,
        });
      }
      await audit(
        tx,
        admin,
        'Products',
        existing ? 'Edited product' : 'Created product',
        product.name,
        `/admin/products/${productId}`,
      );
      return productId;
    });
    return { ok: true, id, slug };
  });
}

/** A draft copy of a product (new SKU and URL), to edit into a similar one. */
export async function duplicateProduct(id: string): Promise<Result & { id?: string }> {
  return asAdmin('products.create', async (admin) => {
    if (!isUuid(id)) throw new ActionError('Product not found.');
    const [src] = (await loadAdminCatalog([id])).products;
    if (!src) throw new ActionError('Product not found.');
    const others = await db.select({ sku: s.products.sku, slug: s.products.slug }).from(s.products);
    const skus = new Set(others.map((o) => o.sku.toLowerCase()));
    let sku = `${src.sku}-C`;
    for (let n = 2; skus.has(sku.toLowerCase()); n++) sku = `${src.sku}-C${n}`;
    const copy: AdminProduct = {
      ...src,
      name: `${src.name} (Copy)`,
      sku,
      slug: uniqueSlug(new Set(others.map((o) => o.slug)), `${src.slug}-copy`),
      status: 'draft',
    };
    const categories = await db
      .select({ id: s.categories.id, slug: s.categories.slug })
      .from(s.categories)
      .where(eq(s.categories.division, src.division));
    const newId = await db.transaction(async (tx) => {
      const [row] = await tx.insert(s.products).values(productValues(copy)).returning({ id: s.products.id });
      await writeProductDetails(tx, row.id, copy, (slug) => categories.find((c) => c.slug === slug)?.id);
      await audit(tx, admin, 'Products', 'Duplicated product', `${src.name} → draft copy`, `/admin/products/${row.id}`);
      return row.id;
    });
    return { ok: true, id: newId };
  });
}

/* ------------------------------------------------------------------ */
/* Product list (bulk)                                                 */
/* ------------------------------------------------------------------ */

/** Publish, unpublish (draft) or archive products. Products without images are left out of publishing. */
export async function setProductsStatus(
  productIds: string[],
  status: ProductStatus,
): Promise<Result & { skipped?: number }> {
  const list = ids(productIds);
  return asAdmin(status === 'archived' ? 'products.archive' : 'products.edit', async (admin) => {
    if (!['draft', 'published', 'archived'].includes(status)) throw new ActionError('Unknown status.');
    let targets = list;
    if (status === 'published') {
      const withImages = await db
        .selectDistinct({ id: s.productImages.productId })
        .from(s.productImages)
        .where(inArray(s.productImages.productId, list));
      targets = list.filter((id) => withImages.some((w) => w.id === id));
    }
    if (targets.length) {
      await db.update(s.products).set({ status, updatedAt: new Date() }).where(inArray(s.products.id, targets));
      const verb = status === 'published' ? 'Published' : status === 'archived' ? 'Archived' : 'Unpublished';
      await audit(db, admin, 'Products', `${verb} ${plural(targets.length)}`, await namesOf(targets));
    }
    return { ok: true, skipped: list.length - targets.length };
  });
}

const FLAGS = { isFeatured: 'Featured', isBestseller: 'Bestseller', isNew: 'New Arrival' } as const;

export async function setProductsFlag(productIds: string[], flag: keyof typeof FLAGS, value: boolean): Promise<Result> {
  const list = ids(productIds);
  return asAdmin('products.edit', async (admin) => {
    if (!(flag in FLAGS)) throw new ActionError('Unknown flag.');
    if (list.length) {
      await db
        .update(s.products)
        .set({ [flag]: !!value, updatedAt: new Date() })
        .where(inArray(s.products.id, list));
    }
    await audit(db, admin, 'Products', `${value ? 'Marked' : 'Removed'} ${FLAGS[flag]}`, await namesOf(list));
    return { ok: true };
  });
}

/** Adds a category to products of its store (others are left alone). */
export async function addProductsCategory(productIds: string[], categorySlug: string): Promise<Result> {
  const list = ids(productIds);
  return asAdmin('products.edit', async (admin) => {
    if (!list.length) return { ok: true };
    const cats = await db
      .select({ id: s.categories.id, division: s.categories.division, name: s.categories.name })
      .from(s.categories)
      .where(eq(s.categories.slug, String(categorySlug)));
    const products = await db
      .select({ id: s.products.id, division: s.products.division })
      .from(s.products)
      .where(inArray(s.products.id, list));
    const links = products
      .map((p) => ({ productId: p.id, categoryId: cats.find((c) => c.division === p.division)?.id }))
      .filter((l): l is { productId: string; categoryId: string } => !!l.categoryId);
    if (links.length) await db.insert(s.productCategories).values(links).onConflictDoNothing();
    await audit(db, admin, 'Products', `Added category “${cats[0]?.name ?? categorySlug}”`, await namesOf(list));
    return { ok: true };
  });
}

/** Deletes products for good. Past orders keep their own copy of the name, price and image. */
export async function deleteProducts(productIds: string[]): Promise<Result> {
  const list = ids(productIds);
  return asAdmin('products.delete', async (admin) => {
    if (!list.length) return { ok: true };
    const label = await namesOf(list);
    await db.transaction(async (tx) => {
      await tx.delete(s.products).where(inArray(s.products.id, list));
      await audit(tx, admin, 'Products', `Deleted ${plural(list.length)}`, label);
    });
    return { ok: true };
  });
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

export type StockMode = 'add' | 'remove' | 'set';

/** Changes a product's stock, or one option value's (e.g. Length 18"). Never below zero. */
export async function adjustStock(
  productId: string,
  mode: StockMode,
  amount: number,
  reason: string,
  variant?: { groupKey: string; label: string },
): Promise<Result> {
  return asAdmin('inventory.manage', async (admin) => {
    if (!isUuid(productId) || !['add', 'remove', 'set'].includes(mode)) throw new ActionError('Product not found.');
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    const why =
      String(reason ?? '')
        .trim()
        .slice(0, 200) || 'Manual adjustment';
    await db.transaction(async (tx) => {
      const [product] = await tx.select({ name: s.products.name }).from(s.products).where(eq(s.products.id, productId));
      if (!product) throw new ActionError('Product not found.');
      const apply = (current: number) => Math.max(0, mode === 'set' ? n : mode === 'add' ? current + n : current - n);
      let before: number;
      let after: number;
      let label: string | undefined;
      if (variant) {
        const [value] = await tx
          .select({ id: s.productOptionValues.id, stock: s.productOptionValues.stock, name: s.productOptions.name })
          .from(s.productOptionValues)
          .innerJoin(s.productOptions, eq(s.productOptions.id, s.productOptionValues.optionId))
          .where(
            and(
              eq(s.productOptions.productId, productId),
              eq(s.productOptions.key, String(variant.groupKey)),
              eq(s.productOptionValues.label, String(variant.label)),
            ),
          )
          .for('update', { of: s.productOptionValues });
        if (!value) throw new ActionError('Option not found.');
        before = value.stock ?? 0;
        after = apply(before);
        await tx.update(s.productOptionValues).set({ stock: after }).where(eq(s.productOptionValues.id, value.id));
        label = `${value.name}: ${variant.label}`;
      } else {
        const [old] = await tx
          .select({ stock: s.inventory.stock })
          .from(s.inventory)
          .where(eq(s.inventory.productId, productId))
          .for('update');
        if (!old) throw new ActionError('This product has no stock record.');
        before = old.stock;
        after = apply(before);
        await tx
          .update(s.inventory)
          .set({ stock: after, updatedAt: new Date() })
          .where(eq(s.inventory.productId, productId));
      }
      await tx.insert(s.stockMovements).values({
        productId,
        variant: label,
        change: after - before,
        resultingStock: after,
        reason: why,
        adminId: admin.id,
      });
      await audit(
        tx,
        admin,
        'Inventory',
        'Changed stock',
        `${product.name}${label ? ` (${label})` : ''} · ${before} → ${after}`,
        `/admin/inventory?q=${encodeURIComponent(product.name)}`,
      );
    });
    return { ok: true };
  });
}

export async function setLowStockThreshold(productId: string, threshold: number): Promise<Result> {
  return asAdmin('inventory.manage', async (admin) => {
    if (!isUuid(productId)) throw new ActionError('Product not found.');
    const n = Math.max(0, Math.floor(Number(threshold) || 0));
    const [row] = await db
      .update(s.inventory)
      .set({ lowStockThreshold: n, updatedAt: new Date() })
      .where(eq(s.inventory.productId, productId))
      .returning({ productId: s.inventory.productId });
    if (!row) throw new ActionError('Product not found.');
    const [p] = await db.select({ name: s.products.name }).from(s.products).where(eq(s.products.id, productId));
    await audit(db, admin, 'Inventory', 'Changed low-stock threshold', `${p?.name ?? 'Product'} · ${n}`);
    return { ok: true };
  });
}
