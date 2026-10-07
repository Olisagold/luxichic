'use client';

import React from 'react';
import type { ProductEditorState } from '@/hooks/useProductEditor';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminInput, AdminSelect, AdminTextarea } from '@/components/admin/ui/AdminField';
import { Toggle } from '@/components/admin/ui/Toggle';

const num = (v: string) => Math.max(0, Number(v.replace(/[^\d]/g, '')) || 0);

export function InventorySection({ editor }: {editor: ProductEditorState;}) {
  const { draft, update } = editor;
  const perOption = draft.variants.length > 0 && draft.variants.every((g) => g.values.every((v) => v.stock !== undefined));
  return (
    <Panel title="Inventory">
      <Toggle label="Track inventory" description="Stops customers ordering more than you have." checked={draft.trackInventory} onChange={(v) => update({ trackInventory: v })} />
      {draft.trackInventory &&
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminInput
          id="p-stock"
          label="Stock quantity"
          inputMode="numeric"
          value={draft.stock}
          disabled={perOption}
          hint={perOption ? 'Calculated from option stock.' : `Available: ${draft.stock} unit${draft.stock === 1 ? '' : 's'}`}
          onChange={(e) => update({ stock: num(e.target.value) })} />
        
          <AdminInput id="p-low" label="Low-stock alert at" inputMode="numeric" value={draft.lowStockThreshold} onChange={(e) => update({ lowStockThreshold: num(e.target.value) })} />
          <AdminSelect
          id="p-oos"
          label="When out of stock"
          wrapperClassName="sm:col-span-2"
          value={draft.outOfStockBehaviour}
          onChange={(e) => update({ outOfStockBehaviour: e.target.value as typeof draft.outOfStockBehaviour })}
          options={[{ value: 'show-sold-out', label: 'Show as “Out of stock” (can’t be added to cart)' }, { value: 'hide', label: 'Hide from the storefront' }]} />
        
        </div>
      }
    </Panel>);

}

export function ShippingSection({ editor }: {editor: ProductEditorState;}) {
  const { draft, update } = editor;
  const s = draft.shipping;
  const set = (patch: Partial<typeof s>) => update({ shipping: { ...s, ...patch } });
  return (
    <Panel title="Shipping & delivery">
      <div className="space-y-4">
        <AdminInput id="p-eta" label="Estimated delivery" value={s.estimate} onChange={(e) => set({ estimate: e.target.value })} />
        <AdminInput id="p-method" label="Shipping method" value={s.method} onChange={(e) => set({ method: e.target.value })} />
        <Toggle label="Pickup available" checked={s.pickup} onChange={(v) => set({ pickup: v })} />
        <AdminTextarea id="p-notes" label="Delivery notes" optional value={s.notes} onChange={(e) => set({ notes: e.target.value })} className="min-h-[60px]" />
        <AdminTextarea id="p-handling" label="Special handling" optional value={s.handling} onChange={(e) => set({ handling: e.target.value })} className="min-h-[60px]" />
      </div>
    </Panel>);

}