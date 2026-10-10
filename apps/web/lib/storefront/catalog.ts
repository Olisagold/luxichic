import type { Category, Division, Product } from '@/types/product';
import type { SalonService } from '@/types/salon';
import type { StorefrontData } from '@/lib/storefront/derive';

/** Lookups over the storefront data. Pure, so pages (server) and components (client) share them. */

export function productsFor(data: StorefrontData, division: Division): Product[] {
  return data.products.filter((p) => p.division === division);
}

export function categoriesFor(data: StorefrontData, division: Division): Category[] {
  return data.categories[division];
}

export function findCategory(data: StorefrontData, division: Division, slug = 'all'): Category | undefined {
  return categoriesFor(data, division).find((c) => c.slug === slug);
}

export function findProduct(data: StorefrontData, slug: string): Product | undefined {
  return data.products.find((p) => p.slug === slug);
}

export function findProductById(data: StorefrontData, id: string): Product | undefined {
  return data.products.find((p) => p.id === id);
}

export function relatedProducts(data: StorefrontData, p: Product, limit = 8): Product[] {
  return productsFor(data, p.division)
    .filter((x) => x.id !== p.id)
    .map((x) => ({ x, score: x.categories.filter((c) => p.categories.includes(c)).length }))
    .sort((a, b) => b.score - a.score || a.x.featuredRank - b.x.featuredRank)
    .slice(0, limit)
    .map(({ x }) => x);
}

export function findService(data: StorefrontData, slug?: string | null): SalonService | undefined {
  return data.services.find((s) => s.slug === slug);
}
