import { describe, expect, it } from 'vitest';
import { toStorefrontProduct } from '@/lib/storefront/derive';
import type { AdminProduct } from '@/types/admin';

const product = (over: Partial<AdminProduct> = {}) =>
  ({
    id: 'p1',
    slug: 'wig',
    division: 'hairs',
    name: 'Wig',
    price: 180_000,
    originalPrice: 200_000,
    images: [],
    stock: 4,
    trackInventory: true,
    variants: [{ key: 'length', name: 'Length', values: [{ label: '14"' }, { label: '30"' }] }],
    variantMeta: {},
    discountMode: 'fixed',
    ...over,
  }) as unknown as AdminProduct;

describe('sale prices', () => {
  it('shows the sale price with the regular price struck through while the sale runs', () => {
    const p = toStorefrontProduct(product({ discountStart: '2026-10-01', discountEnd: '2026-10-31' }), '2026-10-19');
    expect([p.price, p.originalPrice]).toEqual([180_000, 200_000]);
  });

  it('shows the regular price before and after the sale dates, or with no sale', () => {
    const dated = product({ discountStart: '2026-10-01', discountEnd: '2026-10-31' });
    expect(toStorefrontProduct(dated, '2026-09-30').price).toBe(200_000);
    expect(toStorefrontProduct(dated, '2026-11-01').price).toBe(200_000);
    const none = toStorefrontProduct(product({ discountMode: 'none' }), '2026-10-19');
    expect([none.price, none.originalPrice]).toEqual([200_000, undefined]);
  });
});

describe('stock and options', () => {
  it('treats untracked products as always in stock', () => {
    expect(toStorefrontProduct(product({ trackInventory: false })).stock).toBe(999);
    expect(toStorefrontProduct(product()).stock).toBe(4);
  });

  it('hides option values the admin switched off', () => {
    const p = toStorefrontProduct(
      product({ variantMeta: { 'length::30"': { enabled: false } } as AdminProduct['variantMeta'] }),
    );
    expect(p.variants[0].values.map((v) => v.label)).toEqual(['14"']);
  });
});
