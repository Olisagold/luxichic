import type { AdminProduct } from '@/types/admin';

/** How the admin labels a product's stock. Untracked products are always in stock. */
export function stockState(p: AdminProduct): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  if (!p.trackInventory) return 'In Stock';
  if (p.stock <= 0) return 'Out of Stock';
  if (p.stock <= p.lowStockThreshold) return 'Low Stock';
  return 'In Stock';
}

/** How many option values (e.g. lengths) are at or below the low-stock threshold. */
export function lowVariantCount(p: AdminProduct): number {
  return p.variants.reduce(
    (n, g) => n + g.values.filter((v) => v.stock !== undefined && v.stock <= p.lowStockThreshold).length,
    0,
  );
}
