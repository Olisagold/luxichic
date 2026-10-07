'use client';

import React from 'react';
import type { Product } from '@/types/product';
import { formatNaira } from '@/lib/utils/currency';
import { cn } from '@/lib/utils/cn';

interface VariantSelectorProps {
  product: Product;
  selection: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function VariantSelector({ product, selection, onChange }: VariantSelectorProps) {
  if (!product.variants.length) return null;
  return (
    <div className="space-y-6">
      {product.variants.map((g) =>
      <fieldset key={g.key}>
          <legend className="mb-3 text-xs font-semibold text-charcoal">
            {g.name}: <span className="font-normal text-subtle">{selection[g.key]}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {g.values.map((v) => {
            const active = selection[g.key] === v.label;
            const out = (v.stock ?? product.stock) <= 0;
            return (
              <button
                key={v.label}
                type="button"
                aria-pressed={active}
                disabled={out}
                onClick={() => onChange(g.key, v.label)}
                title={v.priceDelta ? `+${formatNaira(v.priceDelta)}` : undefined}
                className={cn(
                  'h-10 whitespace-nowrap rounded-full border px-4 text-xs font-medium transition-colors duration-150',
                  active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-charcoal hover:border-ink',
                  out && 'cursor-not-allowed text-muted line-through hover:border-line'
                )}>
                
                  {v.label}
                </button>);

          })}
          </div>
        </fieldset>
      )}
    </div>);

}