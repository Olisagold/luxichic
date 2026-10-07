import React from 'react';
import type { OrderItem } from '@/types/order';
import { formatNaira } from '@/lib/utils/currency';
import { divisionLabel } from '@/lib/utils/products';

export function OrderItemsList({ items, compact }: {items: OrderItem[];compact?: boolean;}) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) =>
      <li key={item.key} className="flex gap-4 py-4">
          <div className="relative shrink-0">
            <img src={item.image} alt="" className={compact ? 'h-16 w-14 rounded-lg object-cover' : 'h-20 w-16 rounded-xl object-cover'} />
            {compact &&
          <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white">{item.quantity}</span>
          }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">{divisionLabel(item.division)}</p>
            <p className="truncate text-sm font-medium text-ink">{item.name}</p>
            {Object.keys(item.variants).length > 0 &&
          <p className="mt-0.5 text-xs text-subtle">
                {Object.entries(item.variants).
            map(([k, v]) => `${k}: ${v}`).
            join(' · ')}
              </p>
          }
            {!compact &&
          <p className="mt-1 text-xs text-subtle">
                {formatNaira(item.unitPrice)} × {item.quantity}
              </p>
          }
          </div>
          <p className="text-sm font-semibold tabular-nums text-ink">{formatNaira(item.unitPrice * item.quantity)}</p>
        </li>
      )}
    </ul>);

}