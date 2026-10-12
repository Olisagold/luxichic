import { eq } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import * as s from '@/db/schema';
import type { AdminProduct } from '@/types/admin';

/**
 * How a product (the admin's `AdminProduct`) is stored: one `products` row plus its inventory, images, category
 * links, options and option values. Shared by the admin product editor and the catalog loader script, so both
 * save products the same way. lib/storefront/source.ts reads them back.
 */

/** The database or a transaction on it. */
export type CatalogDb = PgDatabase<PostgresJsQueryResultHKT, typeof s>;

/** The `products` columns the admin edits (not ratings, sales or dates, which the shop keeps itself). */
export function productValues(p: AdminProduct) {
  return {
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
    usage: p.usage ?? null,
    benefits: p.benefits ?? null,
    care: p.care ?? null,
    shipping: p.shipping,
    isFeatured: p.isFeatured,
    featuredRank: p.featuredRank,
    isBestseller: p.isBestseller ?? false,
    isNew: p.isNew ?? false,
  };
}

/**
 * Writes everything that hangs off a product row, replacing what was there: stock settings, images (in order),
 * category links (`categoryId` maps a slug of the product's division to its id) and options with their values.
 */
export async function writeProductDetails(
  db: CatalogDb,
  productId: string,
  p: AdminProduct,
  categoryId: (slug: string) => string | undefined,
): Promise<void> {
  const stockSettings = {
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    trackInventory: p.trackInventory,
    outOfStockBehaviour: p.outOfStockBehaviour === 'hide' ? ('hide' as const) : ('show_sold_out' as const),
  };
  await db
    .insert(s.inventory)
    .values({ productId, ...stockSettings })
    .onConflictDoUpdate({ target: s.inventory.productId, set: { ...stockSettings, updatedAt: new Date() } });

  await db.delete(s.productImages).where(eq(s.productImages.productId, productId));
  if (p.images.length) {
    await db.insert(s.productImages).values(p.images.map((url, i) => ({ productId, url, sortOrder: i })));
  }

  await db.delete(s.productCategories).where(eq(s.productCategories.productId, productId));
  const cats = [...new Set(p.categories.map(categoryId).filter((x): x is string => !!x))];
  if (cats.length) await db.insert(s.productCategories).values(cats.map((id) => ({ productId, categoryId: id })));

  // Option values cascade with their option.
  await db.delete(s.productOptions).where(eq(s.productOptions.productId, productId));
  for (const [gi, g] of p.variants.entries()) {
    const [opt] = await db
      .insert(s.productOptions)
      .values({ productId, key: g.key, name: g.name, sortOrder: gi })
      .returning({ id: s.productOptions.id });
    if (!g.values.length) continue;
    await db.insert(s.productOptionValues).values(
      g.values.map((v, vi) => {
        const meta = p.variantMeta[`${g.key}::${v.label}`];
        return {
          optionId: opt.id,
          productId,
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
