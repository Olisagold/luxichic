import { describe, expect, it } from 'vitest';
import { clampQuantity, priceLine, selectionFromKey, toCartItem, toCartLine } from '@/lib/cart/items';
import { priceForSelection } from '@/lib/utils/products';
import type { Product } from '@/types/product';

const wig = {
  id: 'p1',
  slug: 'body-wave-wig',
  division: 'hairs',
  name: 'Body Wave Wig',
  price: 200_000,
  originalPrice: 240_000,
  images: ['/w.jpg'],
  stock: 10,
  variants: [
    {
      key: 'length',
      name: 'Length',
      values: [{ label: '14"' }, { label: '22"', priceDelta: 60_000, stock: 2 }],
    },
    { key: 'lace', name: 'Lace', values: [{ label: 'HD' }, { label: 'Transparent', priceDelta: -10_000 }] },
  ],
} as unknown as Product;

describe('option prices and stock', () => {
  it('adds each option’s price change to the price and the original price', () => {
    expect(priceForSelection(wig, { length: '22"', lace: 'Transparent' })).toEqual({
      price: 250_000,
      original: 290_000,
      stock: 2,
    });
  });

  it('is limited by the scarcest option chosen', () => {
    expect(priceForSelection(wig, { length: '14"', lace: 'HD' }).stock).toBe(10);
    expect(priceForSelection(wig, { length: '22"', lace: 'HD' }).stock).toBe(2);
  });
});

describe('cart lines', () => {
  it('keeps the chosen options in the item key and reads them back', () => {
    const item = toCartItem(wig, { length: '22"', lace: 'HD' }, 1);
    expect(item.key).toBe('p1|length:22"|lace:HD');
    expect(selectionFromKey(item.key)).toEqual({ length: '22"', lace: 'HD' });
    expect(item.variants).toEqual({ Length: '22"', Lace: 'HD' });
    expect(toCartLine(item)).toEqual({
      productId: 'p1',
      selection: { length: '22"', lace: 'HD' },
      quantity: 1,
      savedForLater: false,
    });
  });

  it('prices a line at today’s price', () => {
    expect(priceLine(wig, { productId: 'p1', selection: { length: '22"', lace: 'HD' }, quantity: 2 })?.unitPrice).toBe(
      260_000,
    );
  });

  it('refuses a line whose product or option no longer exists, or misses an option', () => {
    expect(priceLine(undefined, { productId: 'p1', selection: {}, quantity: 1 })).toBeNull();
    expect(priceLine(wig, { productId: 'p1', selection: { length: '30"', lace: 'HD' }, quantity: 1 })).toBeNull();
    expect(priceLine(wig, { productId: 'p1', selection: { length: '22"' }, quantity: 1 })).toBeNull();
  });

  it('keeps quantities between 1 and 99', () => {
    expect([clampQuantity(0), clampQuantity(-3), clampQuantity(2.6), clampQuantity(500), clampQuantity(NaN)]).toEqual([
      1, 1, 3, 99, 1,
    ]);
  });
});
