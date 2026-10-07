'use client';

import React, { useState } from 'react';
import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import type { VariantGroup } from '@/types/product';
import type { ProductEditorState } from '@/hooks/useProductEditor';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { Toggle } from '@/components/admin/ui/Toggle';
import { adminInputClass } from '@/components/admin/ui/AdminField';
import { slugify } from '@/lib/utils/text';
import { cn } from '@/lib/utils/cn';

const presets: {name: string;values: string[];}[] = [
{ name: 'Length', values: ['10"', '12"', '14"', '16"', '18"', '20"', '22"', '24"', '26"', '28"', '30"'] },
{ name: 'Texture', values: ['Bone Straight', 'Silky Straight', 'Kinky', 'Yaki', 'Deep Wave', 'Body Wave', 'Curly'] },
{ name: 'Lace Type', values: ['4x4 Closure', '5x5 Closure', '6x6 Closure', '13x4 Frontal', '13x6 Frontal', '360 Lace', 'Full Lace'] },
{ name: 'Density', values: ['150%', '180%', '200%', '250%'] },
{ name: 'Colour', values: ['Natural Black', 'Brown', 'Burgundy', 'Blonde'] },
{ name: 'Cap Size', values: ['Small', 'Medium', 'Large'] }];


const num = (v: string) => v.trim() === '' ? undefined : Math.max(0, Number(v.replace(/[^\d-]/g, '')) || 0);

/**
 * Options are independent groups (e.g. Length, Density). Each option value can carry
 * its own price adjustment, SKU and stock; disabled or 0-stock values can’t be selected on the store.
 */
export function VariantsSection({ editor }: {editor: ProductEditorState;}) {
  const { draft, update } = editor;
  const [custom, setCustom] = useState('');
  const [newValue, setNewValue] = useState<Record<string, string>>({});
  const used = draft.variants.map((g) => g.name.toLowerCase());

  const setGroups = (variants: VariantGroup[]) => update({ variants });
  const patchGroup = (key: string, fn: (g: VariantGroup) => VariantGroup) => setGroups(draft.variants.map((g) => g.key === key ? fn(g) : g));

  const addGroup = (name: string, values: string[] = []) => {
    const key = slugify(name) || `opt-${draft.variants.length + 1}`;
    if (draft.variants.some((g) => g.key === key)) return;
    setGroups([...draft.variants, { key, name, values: values.map((label) => ({ label })) }]);
  };

  const metaKey = (g: VariantGroup, label: string) => `${g.key}::${label}`;
  const setMeta = (g: VariantGroup, label: string, patch: {sku?: string;enabled?: boolean;}) => {
    const k = metaKey(g, label);
    const current = draft.variantMeta[k] ?? { enabled: true };
    update({ variantMeta: { ...draft.variantMeta, [k]: { ...current, ...patch } } });
  };

  return (
    <Panel title="Options & variations" description="Only add the options this product really has. Leave stock blank to share the product’s stock.">
      <div className="flex flex-wrap gap-1.5">
        {presets.filter((p) => !used.includes(p.name.toLowerCase())).map((p) =>
        <AdminButton key={p.name} size="xs" icon={<PlusIcon className="h-3 w-3" />} onClick={() => addGroup(p.name, p.values.slice(0, 4))}>{p.name}</AdminButton>
        )}
        <form onSubmit={(e) => {e.preventDefault();if (custom.trim()) {addGroup(custom.trim());setCustom('');}}} className="flex gap-1.5">
          <label htmlFor="custom-opt" className="sr-only">Custom option name</label>
          <input id="custom-opt" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Custom option…" className={cn(adminInputClass, 'h-7 w-36 text-xs')} />
          <AdminButton size="xs" type="submit" variant="primary">Add</AdminButton>
        </form>
      </div>

      {draft.variants.length === 0 && <p className="mt-4 rounded-lg bg-canvas px-4 py-3 text-[13px] text-subtle">No options. Customers buy this product as a single item.</p>}

      <div className="mt-4 space-y-4">
        {draft.variants.map((g) => {
          const preset = presets.find((p) => p.name === g.name);
          const suggestions = preset?.values.filter((v) => !g.values.some((x) => x.label === v)) ?? [];
          return (
            <div key={g.key} className="overflow-hidden rounded-lg border border-line">
              <div className="flex items-center gap-2 border-b border-line bg-canvas/60 px-3 py-2">
                <label htmlFor={`gname-${g.key}`} className="sr-only">Option name</label>
                <input id={`gname-${g.key}`} value={g.name} onChange={(e) => patchGroup(g.key, (x) => ({ ...x, name: e.target.value }))} className="h-7 flex-1 bg-transparent text-[13px] font-semibold text-ink outline-none" />
                <button type="button" onClick={() => setGroups(draft.variants.filter((x) => x.key !== g.key))} className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-700" aria-label={`Remove ${g.name}`}>
                  <Trash2Icon className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-[13px]">
                  <thead className="text-[11px] text-subtle">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">Value</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Price +/− ₦</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Stock</th>
                      <th className="px-2 py-1.5 text-left font-semibold">SKU</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Available</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {g.values.map((v, i) => {
                      const meta = draft.variantMeta[metaKey(g, v.label)] ?? { enabled: true };
                      const patchValue = (patch: Partial<typeof v>) => patchGroup(g.key, (x) => ({ ...x, values: x.values.map((y, j) => j === i ? { ...y, ...patch } : y) }));
                      return (
                        <tr key={`${v.label}-${i}`} className={cn(!meta.enabled && 'opacity-50')}>
                          <td className="px-3 py-1.5 font-medium text-ink">{v.label}</td>
                          <td className="px-2 py-1.5">
                            <input aria-label={`${v.label} price adjustment`} inputMode="numeric" value={v.priceDelta ?? ''} onChange={(e) => patchValue({ priceDelta: num(e.target.value) })} placeholder="0" className={cn(adminInputClass, 'h-8 w-28')} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input aria-label={`${v.label} stock`} inputMode="numeric" value={v.stock ?? ''} onChange={(e) => patchValue({ stock: num(e.target.value) })} placeholder="Shared" className={cn(adminInputClass, 'h-8 w-24', v.stock === 0 && 'border-red-300 text-red-700')} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input aria-label={`${v.label} SKU`} value={meta.sku ?? ''} onChange={(e) => setMeta(g, v.label, { sku: e.target.value.toUpperCase() })} placeholder={`${draft.sku || 'SKU'}-${slugify(v.label).toUpperCase()}`} className={cn(adminInputClass, 'h-8 w-36 font-mono text-xs')} />
                          </td>
                          <td className="px-2 py-1.5">
                            <Toggle srOnlyLabel label={`${v.label} available`} checked={meta.enabled !== false} onChange={(on) => setMeta(g, v.label, { enabled: on })} />
                          </td>
                          <td className="pr-2">
                            <button type="button" onClick={() => patchGroup(g.key, (x) => ({ ...x, values: x.values.filter((_, j) => j !== i) }))} className="rounded-md p-1 text-subtle hover:text-red-700" aria-label={`Remove ${v.label}`}>
                              <XIcon className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>);

                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const label = (newValue[g.key] ?? '').trim();
                    if (!label || g.values.some((x) => x.label === label)) return;
                    patchGroup(g.key, (x) => ({ ...x, values: [...x.values, { label }] }));
                    setNewValue({ ...newValue, [g.key]: '' });
                  }}
                  className="flex gap-1.5">
                  
                  <label htmlFor={`nv-${g.key}`} className="sr-only">New value for {g.name}</label>
                  <input id={`nv-${g.key}`} value={newValue[g.key] ?? ''} onChange={(e) => setNewValue({ ...newValue, [g.key]: e.target.value })} placeholder="Add value…" className={cn(adminInputClass, 'h-7 w-32 text-xs')} />
                  <AdminButton size="xs" type="submit">Add</AdminButton>
                </form>
                {suggestions.slice(0, 7).map((s) =>
                <button key={s} type="button" onClick={() => patchGroup(g.key, (x) => ({ ...x, values: [...x.values, { label: s }] }))} className="h-7 rounded-md border border-dashed border-line px-2 text-xs text-subtle hover:border-ink/40 hover:text-ink">
                    + {s}
                  </button>
                )}
              </div>
            </div>);

        })}
      </div>
    </Panel>);

}