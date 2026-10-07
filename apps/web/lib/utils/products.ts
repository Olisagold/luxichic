import type { Category, Division, Product, ProductFilterState, SortOption } from '@/types/product';
import { hairProducts } from '@/data/hairProducts';
import { toolProducts } from '@/data/toolProducts';
import { hairCategories, toolCategories } from '@/data/categories';

export const allProducts: Product[] = [...hairProducts, ...toolProducts];

export function productsFor(division: Division): Product[] {
  return division === 'hairs' ? hairProducts : toolProducts;
}

export function categoriesFor(division: Division): Category[] {
  return division === 'hairs' ? hairCategories : toolCategories;
}

export function findCategory(division: Division, slug = 'all'): Category | undefined {
  return categoriesFor(division).find((c) => c.slug === slug);
}

export function findProduct(slug: string): Product | undefined {
  return allProducts.find((p) => p.slug === slug);
}

export function findProductById(id: string): Product | undefined {
  return allProducts.find((p) => p.id === id);
}

export function divisionLabel(d: Division): string {
  return d === 'hairs' ? 'LUXICHIC Hairs' : 'Hair Tools & Essentials';
}

export function isDiscounted(p: Product): boolean {
  return !!p.originalPrice && p.originalPrice > p.price;
}

export function productInCategory(p: Product, c: Category): boolean {
  switch (c.slug) {
    case 'all':
      return true;
    case 'new-arrivals':
      return !!p.isNew;
    case 'bestsellers':
      return !!p.isBestseller;
    case 'discounted':
      return isDiscounted(p);
    default:
      return p.categories.includes(c.slug);
  }
}

export function emptyFilters(): ProductFilterState {
  return {
    construction: [],
    texture: [],
    origin: [],
    laceType: [],
    lengths: [],
    category: [],
    brand: [],
    features: [],
    minPrice: null,
    maxPrice: null,
    minRating: 0,
    inStockOnly: false,
    discountedOnly: false,
  };
}

export function countActiveFilters(f: ProductFilterState): number {
  return (
    f.construction.length +
    f.texture.length +
    f.origin.length +
    f.laceType.length +
    f.lengths.length +
    f.category.length +
    f.brand.length +
    f.features.length +
    (f.minPrice !== null || f.maxPrice !== null ? 1 : 0) +
    (f.minRating > 0 ? 1 : 0) +
    (f.inStockOnly ? 1 : 0) +
    (f.discountedOnly ? 1 : 0)
  );
}

function matchAny(selected: string[], value?: string): boolean {
  return selected.length === 0 || (!!value && selected.includes(value));
}

export function filterProducts(list: Product[], f: ProductFilterState): Product[] {
  return list.filter((p) => {
    const a = p.attributes;
    if (!matchAny(f.construction, a.construction)) return false;
    if (!matchAny(f.texture, a.texture)) return false;
    if (!matchAny(f.origin, a.origin)) return false;
    if (!matchAny(f.laceType, a.laceType)) return false;
    if (!matchAny(f.brand, a.brand)) return false;
    if (f.lengths.length && !f.lengths.some((l) => a.lengths?.includes(l))) return false;
    if (f.category.length && !f.category.some((c) => p.categories.includes(c))) return false;
    if (f.features.length && !f.features.every((x) => a.features?.includes(x))) return false;
    if (f.minPrice !== null && p.price < f.minPrice) return false;
    if (f.maxPrice !== null && p.price > f.maxPrice) return false;
    if (p.rating < f.minRating) return false;
    if (f.inStockOnly && p.stock <= 0) return false;
    if (f.discountedOnly && !isDiscounted(p)) return false;
    return true;
  });
}

export function sortProducts(list: Product[], sort: SortOption): Product[] {
  const out = [...list];
  switch (sort) {
    case 'newest':
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'price-asc':
      return out.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return out.sort((a, b) => b.price - a.price);
    case 'rating':
      return out.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case 'bestselling':
      return out.sort((a, b) => b.salesCount - a.salesCount);
    default:
      return out.sort((a, b) => a.featuredRank - b.featuredRank);
  }
}

/** Searches name, categories, texture, lengths, description and specifications. */
export function searchProducts(list: Product[], query: string): Product[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return list;
  return list.filter((p) => {
    const cats = categoriesFor(p.division)
      .filter((c) => p.categories.includes(c.slug))
      .map((c) => c.name);
    const haystack = [
      p.name,
      p.shortDescription,
      p.description,
      ...cats,
      ...p.categories,
      p.attributes.texture,
      p.attributes.construction,
      p.attributes.origin,
      p.attributes.laceType,
      p.attributes.brand,
      ...(p.attributes.lengths ?? []).map((l) => `${l} inches ${l}" ${l}inch`),
      ...p.specs.map((s) => `${s.label} ${s.value}`),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return terms.every((t) => haystack.includes(t.replace(/s$/, '')));
  });
}

export function defaultSelection(p: Product): Record<string, string> {
  const sel: Record<string, string> = {};
  p.variants.forEach((g) => {
    const firstAvailable = g.values.find((v) => (v.stock ?? p.stock) > 0) ?? g.values[0];
    if (firstAvailable) sel[g.key] = firstAvailable.label;
  });
  return sel;
}

export interface PricedSelection {
  price: number;
  original?: number;
  stock: number;
}

export function priceForSelection(p: Product, selection: Record<string, string>): PricedSelection {
  let delta = 0;
  let stock = p.stock;
  p.variants.forEach((g) => {
    const v = g.values.find((x) => x.label === selection[g.key]);
    if (!v) return;
    delta += v.priceDelta ?? 0;
    if (v.stock !== undefined) stock = Math.min(stock, v.stock);
  });
  return { price: p.price + delta, original: p.originalPrice ? p.originalPrice + delta : undefined, stock };
}

export function relatedProducts(p: Product, limit = 8): Product[] {
  return productsFor(p.division)
    .filter((x) => x.id !== p.id)
    .map((x) => ({ x, score: x.categories.filter((c) => p.categories.includes(c)).length }))
    .sort((a, b) => b.score - a.score || a.x.featuredRank - b.x.featuredRank)
    .slice(0, limit)
    .map(({ x }) => x);
}

export function uniqueValues(
  list: Product[],
  pick: (p: Product) => string | string[] | undefined,
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  list.forEach((p) => {
    const v = pick(p);
    const arr = Array.isArray(v) ? v : v ? [v] : [];
    arr.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
  });
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}
