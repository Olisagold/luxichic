import React from 'react';
import type { ProductEditorState } from '../../../hooks/useProductEditor';
import { Panel } from '../ui/Panel';
import { AdminInput } from '../ui/AdminField';
import { formatNaira } from '../../../utils/currency';
import { cn } from '../../../utils/cn';

const num = (v: string) => Math.max(0, Number(v.replace(/[^\d.]/g, '')) || 0);

export function PricingSection({ editor }: {editor: ProductEditorState;}) {
  const { draft, update, regular, setRegular, salePrice, errors } = editor;
  const saving = regular - salePrice;

  return (
    <Panel title="Pricing" description="Prices in Nigerian naira. Discounts can be scheduled.">
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminInput id="p-price" label="Regular price" prefix="₦" inputMode="numeric" value={regular || ''} error={errors.price} onChange={(e) => setRegular(num(e.target.value))} />
      </div>

      <fieldset className="mt-5">
        <legend className="text-xs font-semibold text-charcoal">Discount</legend>
        <div className="mt-2 inline-flex rounded-lg border border-line p-0.5" role="radiogroup">
          {([['none', 'No discount'], ['percent', 'Percentage'], ['fixed', 'Fixed sale price']] as const).map(([v, l]) =>
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={draft.discountMode === v}
            onClick={() => update({ discountMode: v, ...(v === 'fixed' && draft.price >= regular ? { price: Math.round(regular * 0.9) } : {}) })}
            className={cn('h-8 rounded-md px-3 text-xs font-semibold', draft.discountMode === v ? 'bg-ink text-white' : 'text-charcoal hover:bg-canvas')}>
            
              {l}
            </button>
          )}
        </div>

        {draft.discountMode !== 'none' &&
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {draft.discountMode === 'percent' ?
          <AdminInput id="p-pct" label="Discount %" inputMode="numeric" value={draft.discountPercent ?? ''} onChange={(e) => update({ discountPercent: Math.min(99, num(e.target.value)) })} /> :

          <AdminInput id="p-sale" label="Sale price" prefix="₦" inputMode="numeric" value={draft.price || ''} onChange={(e) => update({ price: num(e.target.value) })} />
          }
            <AdminInput id="p-start" type="date" label="Starts" optional value={draft.discountStart ?? ''} onChange={(e) => update({ discountStart: e.target.value || undefined })} />
            <AdminInput id="p-end" type="date" label="Ends" optional value={draft.discountEnd ?? ''} onChange={(e) => update({ discountEnd: e.target.value || undefined })} />
            <div className="rounded-lg bg-canvas px-3 py-2" aria-live="polite">
              <p className="text-[11px] text-subtle">Customers pay</p>
              <p className="text-lg font-bold tabular-nums text-ink">{formatNaira(salePrice)}</p>
              {saving > 0 && <p className="text-[11px] text-emerald-700">Saves {formatNaira(saving)} ({Math.round(saving / Math.max(1, regular) * 100)}%)</p>}
            </div>
          </div>
        }
        {errors.discount && <p className="mt-2 text-xs text-red-700">{errors.discount}</p>}
      </fieldset>
    </Panel>);

}