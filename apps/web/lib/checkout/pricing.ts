import type { Division } from '@/types/product';

/** Pure checkout maths, shared by the cart (to show it) and `placeOrder` (which decides). */

export interface PromoRule {
  code: string;
  type: 'percent' | 'fixed';
  /** Percent (1–100) or naira. */
  value: number;
  minSpend: number;
  /** Which store's products the code applies to. */
  scope: 'all' | Division;
}

interface Line {
  division: Division;
  unitPrice: number;
  quantity: number;
}

/** The part of the subtotal a code applies to. */
export function eligibleSubtotal(rule: PromoRule, items: Line[]): number {
  return items
    .filter((i) => rule.scope === 'all' || i.division === rule.scope)
    .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

/** Naira off for `items`; 0 when the minimum spend isn't met. Never more than what the code applies to. */
export function promoDiscount(rule: PromoRule | null, items: Line[]): number {
  if (!rule) return 0;
  const eligible = eligibleSubtotal(rule, items);
  if (eligible <= 0 || eligible < rule.minSpend) return 0;
  return rule.type === 'fixed' ? Math.min(eligible, rule.value) : Math.round((eligible * rule.value) / 100);
}

export const scopeLabel = (scope: PromoRule['scope']) =>
  scope === 'hairs' ? 'LUXICHIC Hairs' : scope === 'tools' ? 'Hair Tools & Essentials' : 'your order';
