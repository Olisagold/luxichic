import { describe, expect, it } from 'vitest';
import { eligibleSubtotal, promoDiscount, type PromoRule } from '@/lib/checkout/pricing';

const wig = { division: 'hairs' as const, unitPrice: 200_000, quantity: 1 };
const comb = { division: 'tools' as const, unitPrice: 5_000, quantity: 2 };
const rule = (r: Partial<PromoRule>): PromoRule => ({
  code: 'TEST',
  type: 'percent',
  value: 10,
  minSpend: 0,
  scope: 'all',
  ...r,
});

describe('promo codes', () => {
  it('takes a percentage of the whole order, rounded to the naira', () => {
    expect(promoDiscount(rule({ value: 10 }), [wig, comb])).toBe(21_000);
    expect(promoDiscount(rule({ value: 15 }), [{ division: 'tools', unitPrice: 3_333, quantity: 1 }])).toBe(500);
  });

  it('applies only to the store the code is for', () => {
    expect(eligibleSubtotal(rule({ scope: 'tools' }), [wig, comb])).toBe(10_000);
    expect(promoDiscount(rule({ scope: 'tools', value: 10 }), [wig, comb])).toBe(1_000);
    expect(promoDiscount(rule({ scope: 'hairs', value: 10 }), [comb])).toBe(0);
  });

  it('needs the minimum spend on the items it applies to', () => {
    expect(promoDiscount(rule({ minSpend: 250_000 }), [wig, comb])).toBe(0);
    expect(promoDiscount(rule({ minSpend: 210_000 }), [wig, comb])).toBe(21_000);
    // A minimum met by the other store's items doesn't count.
    expect(promoDiscount(rule({ scope: 'tools', minSpend: 20_000 }), [wig, comb])).toBe(0);
  });

  it('never takes off more than the items are worth', () => {
    expect(promoDiscount(rule({ type: 'fixed', value: 3_000 }), [comb])).toBe(3_000);
    expect(promoDiscount(rule({ type: 'fixed', value: 50_000 }), [comb])).toBe(10_000);
  });

  it('is zero with no code or an empty cart', () => {
    expect(promoDiscount(null, [wig])).toBe(0);
    expect(promoDiscount(rule({}), [])).toBe(0);
  });
});
