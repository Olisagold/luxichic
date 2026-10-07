import React from 'react';
import { formatNaira } from '@/lib/utils/currency';

interface OrderTotalsProps {
  subtotal: number;
  deliveryFee: number | null;
  discount: number;
  promoCode?: string | null;
}

export function OrderTotals({ subtotal, deliveryFee, discount, promoCode }: OrderTotalsProps) {
  const total = subtotal + (deliveryFee ?? 0) - discount;
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="text-subtle">Subtotal</dt>
        <dd className="tabular-nums text-ink">{formatNaira(subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-subtle">Delivery fee</dt>
        <dd className="tabular-nums text-ink">
          {deliveryFee === null ? 'Calculated at checkout' : formatNaira(deliveryFee)}
        </dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-emerald-700">
          <dt>Discount{promoCode ? ` (${promoCode})` : ''}</dt>
          <dd className="tabular-nums">−{formatNaira(discount)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between border-t border-line pt-4">
        <dt className="font-semibold text-ink">Total payable</dt>
        <dd className="text-xl font-semibold tabular-nums text-ink">{formatNaira(total)}</dd>
      </div>
    </dl>
  );
}
