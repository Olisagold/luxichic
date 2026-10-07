'use client';

import React, { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangleIcon, BoxesIcon, ChevronDownIcon, HistoryIcon, MinusIcon, PlusIcon } from 'lucide-react';
import type { AdminProduct } from '@/types/admin';
import { useActor } from '@/hooks/useActor';
import { useDb } from '@/lib/mock-db/db';
import { adjustStock, setThreshold, stockState, type StockMode } from '@/lib/mock-db/catalog';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { FilterTabs } from '@/components/admin/ui/FilterTabs';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { AdminInput, AdminSelect } from '@/components/admin/ui/AdminField';
import { TablePager, paginate } from '@/components/admin/ui/TablePager';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatDateTime } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';

type Filter = 'all' | 'low' | 'out' | 'hairs' | 'tools';
interface Target {
  product: AdminProduct;
  variant?: {groupKey: string;label: string;current: number;};
}
const PAGE = 20;

export function Inventory() {
  const actor = useActor();
  const products = useDb((s) => s.products.filter((p) => p.status !== 'archived'));
  const moves = useDb((s) => s.stockMoves);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filter = params.get('filter') as Filter || 'all';
  const [q, setQ] = useState(params.get('q') ?? '');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string[]>(params.get('q') ? products.filter((p) => p.name === params.get('q')).map((p) => p.id) : []);
  const [target, setTarget] = useState<Target | null>(null);
  const [historyFor, setHistoryFor] = useState<AdminProduct | 'all' | null>(null);

  const low = products.filter((p) => p.trackInventory && stockState(p) === 'Low Stock');
  const out = products.filter((p) => p.trackInventory && stockState(p) === 'Out of Stock');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.
    filter((p) => filter === 'low' ? stockState(p) !== 'In Stock' : filter === 'out' ? stockState(p) === 'Out of Stock' : filter === 'hairs' || filter === 'tools' ? p.division === filter : true).
    filter((p) => !t || p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)).
    sort((a, b) => a.stock - b.stock);
  }, [products, filter, q]);

  const setFilter = (f: Filter) => {
    const next = new URLSearchParams(params);
    if (f === 'all') next.delete('filter');else next.set('filter', f);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Adjust stock for products and individual options. Every change is recorded."
        actions={<AdminButton icon={<HistoryIcon className="h-4 w-4" />} onClick={() => setHistoryFor('all')}>Stock history</AdminButton>} />
      

      {low.length + out.length > 0 && filter !== 'low' &&
      <button onClick={() => setFilter('low')} className="mb-4 flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-[13px] text-amber-900 hover:bg-amber-100/60">
          <AlertTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1"><strong>{low.length} product{low.length === 1 ? ' is' : 's are'} running low</strong>{out.length > 0 && ` and ${out.length} ${out.length === 1 ? 'is' : 'are'} out of stock`}.</span>
          <span className="font-semibold">Show them</span>
        </button>
      }

      <div className="rounded-xl border border-line bg-white">
        <div className="space-y-3 border-b border-line p-3 sm:p-4">
          <FilterTabs
            label="Inventory filter"
            value={filter}
            onChange={setFilter}
            options={[
            { value: 'all', label: 'All', count: products.length },
            { value: 'low', label: 'Needs restock', count: low.length + out.length },
            { value: 'out', label: 'Out of stock', count: out.length },
            { value: 'hairs', label: 'Hairs' },
            { value: 'tools', label: 'Tools' }]
            } />
          
          <SearchInput value={q} onChange={(v) => {setQ(v);setPage(1);}} placeholder="Search by product or SKU" className="sm:max-w-sm" />
        </div>

        {filtered.length === 0 ?
        <AdminEmpty icon={<BoxesIcon className="h-5 w-5" />} title="Nothing here" text={filter === 'low' ? 'Every product is above its low-stock threshold.' : 'No products match your search.'} /> :

        <>
            <ul className="divide-y divide-line">
              {paginate(filtered, page, PAGE).map((p) => {
              const st = stockState(p);
              const expanded = open.includes(p.id);
              const optionGroups = p.variants.filter((g) => g.values.some((v) => v.stock !== undefined));
              return (
                <li key={p.id}>
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                      <img src={p.images[0]} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/products/${p.id}`} className="block truncate text-[13px] font-semibold text-ink hover:underline">{p.name}</Link>
                        <p className="text-xs text-subtle"><span className="font-mono">{p.sku}</span> · {p.division === 'hairs' ? 'Hairs' : 'Tools'} · updated {formatDate(p.updatedAt)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={cn('text-lg font-bold tabular-nums', st === 'Out of Stock' ? 'text-red-700' : st === 'Low Stock' ? 'text-amber-700' : 'text-ink')}>{p.trackInventory ? p.stock : '∞'}</p>
                          <StatusBadge status={st} />
                        </div>
                        <label className="text-xs text-subtle">
                          <span className="block">Alert at</span>
                          <input
                          type="number"
                          min={0}
                          defaultValue={p.lowStockThreshold}
                          onBlur={(e) => {const v = Number(e.target.value);if (v !== p.lowStockThreshold) {setThreshold(actor, p.id, v);toast.success('Threshold updated');}}}
                          className="mt-0.5 h-7 w-14 rounded-md border border-line px-2 text-[13px] text-ink"
                          aria-label={`Low-stock threshold for ${p.name}`} />
                        
                        </label>
                        <AdminButton size="sm" variant="primary" onClick={() => setTarget({ product: p })}>Adjust</AdminButton>
                        <button onClick={() => setHistoryFor(p)} className="rounded-md p-1.5 text-subtle hover:bg-canvas hover:text-ink" aria-label={`Stock history for ${p.name}`}><HistoryIcon className="h-4 w-4" /></button>
                        {optionGroups.length > 0 &&
                      <button onClick={() => setOpen(expanded ? open.filter((x) => x !== p.id) : [...open, p.id])} className="rounded-md p-1.5 text-subtle hover:bg-canvas hover:text-ink" aria-expanded={expanded} aria-label="Show option stock">
                            <ChevronDownIcon className={cn('h-4 w-4 transition-transform duration-150', expanded && 'rotate-180')} />
                          </button>
                      }
                      </div>
                    </div>
                    {expanded &&
                  <div className="border-t border-line bg-canvas/40 px-4 py-3 sm:pl-[4.25rem]">
                        {optionGroups.map((g) =>
                    <div key={g.key} className="mb-2 last:mb-0">
                            <p className="mb-1.5 text-xs font-semibold text-subtle">{g.name}</p>
                            <div className="flex flex-wrap gap-2">
                              {g.values.map((v) => {
                          const s = v.stock ?? p.stock;
                          return (
                            <button
                              key={v.label}
                              onClick={() => setTarget({ product: p, variant: { groupKey: g.key, label: v.label, current: s } })}
                              className={cn('flex items-center gap-2 rounded-md border bg-white px-2.5 py-1 text-xs hover:border-ink/40', s <= 0 ? 'border-red-200' : s <= p.lowStockThreshold ? 'border-amber-200' : 'border-line')}>
                              
                                    <span className="font-medium text-ink">{v.label}</span>
                                    <span className={cn('font-bold tabular-nums', s <= 0 ? 'text-red-700' : s <= p.lowStockThreshold ? 'text-amber-700' : 'text-charcoal')}>{v.stock === undefined ? 'shared' : s}</span>
                                  </button>);

                        })}
                            </div>
                          </div>
                    )}
                      </div>
                  }
                  </li>);

            })}
            </ul>
            <TablePager page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
          </>
        }
      </div>

      <AdjustDialog target={target} onClose={() => setTarget(null)} onApply={(mode, amount, reason) => {
        if (!target) return;
        adjustStock(actor, target.product.id, mode, amount, reason, target.variant ? { groupKey: target.variant.groupKey, label: target.variant.label } : undefined);
        toast.success('Stock updated');
        setTarget(null);
      }} />

      <Modal open={!!historyFor} onClose={() => setHistoryFor(null)} title={historyFor === 'all' ? 'Stock history' : `History · ${historyFor?.name ?? ''}`} side="right">
        <ul className="flex-1 divide-y divide-line overflow-y-auto">
          {moves.filter((m) => historyFor === 'all' || historyFor && m.productId === historyFor.id).map((m) =>
          <li key={m.id} className="px-6 py-3 text-[13px]">
              <div className="flex justify-between gap-3">
                <p className="min-w-0 font-semibold text-ink">{historyFor === 'all' ? m.productName : m.variant ?? 'Product stock'}</p>
                <span className={cn('font-bold tabular-nums', m.change >= 0 ? 'text-emerald-700' : 'text-red-700')}>{m.change >= 0 ? '+' : ''}{m.change}</span>
              </div>
              {historyFor === 'all' && m.variant && <p className="text-xs text-charcoal">{m.variant}</p>}
              <p className="text-xs text-subtle">{m.reason} · now {m.resultingStock}</p>
              <p className="text-[11px] text-muted">{m.by} · {formatDateTime(m.at)}</p>
            </li>
          )}
          {!moves.some((m) => historyFor === 'all' || historyFor && m.productId === historyFor.id) && <li className="px-6 py-10 text-center text-[13px] text-subtle">No stock changes recorded yet.</li>}
        </ul>
      </Modal>
    </div>);

}

function AdjustDialog({ target, onClose, onApply }: {target: Target | null;onClose: () => void;onApply: (mode: StockMode, amount: number, reason: string) => void;}) {
  const [mode, setMode] = useState<StockMode>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Restock');
  const current = target?.variant ? target.variant.current : target?.product.stock ?? 0;
  const n = Math.max(0, Number(amount) || 0);
  const result = mode === 'set' ? n : mode === 'add' ? current + n : Math.max(0, current - n);

  React.useEffect(() => {
    if (target) {setMode('add');setAmount('');setReason('Restock');}
  }, [target]);

  return (
    <Modal open={!!target} onClose={onClose} title="Adjust stock" className="max-w-md rounded-2xl">
      {target &&
      <form onSubmit={(e) => {e.preventDefault();if (mode !== 'set' && n === 0) return;onApply(mode, n, reason);}} className="space-y-4 p-5">
          <p className="text-[13px] text-charcoal">
            <span className="font-semibold text-ink">{target.product.name}</span>
            {target.variant && <> · {target.variant.label}</>}
            <span className="block text-xs text-subtle">Currently {current} in stock</span>
          </p>
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-line p-0.5" role="radiogroup" aria-label="Adjustment type">
            {([['add', 'Increase', PlusIcon], ['remove', 'Reduce', MinusIcon], ['set', 'Set to', null]] as const).map(([v, l, Icon]) =>
          <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)} className={cn('flex h-8 items-center justify-center gap-1 rounded-md text-xs font-semibold', mode === v ? 'bg-ink text-white' : 'text-charcoal hover:bg-canvas')}>
                {Icon && <Icon className="h-3 w-3" aria-hidden />}{l}
              </button>
          )}
          </div>
          <AdminInput id="adj-amount" label={mode === 'set' ? 'New quantity' : 'Quantity'} type="number" min={0} autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
          <AdminSelect id="adj-reason" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} options={['Restock', 'Stock count correction', 'Damaged / returned', 'Offline sale', 'Other'].map((r) => ({ value: r, label: r }))} />
          <p className="rounded-lg bg-canvas px-3 py-2 text-[13px] text-charcoal" aria-live="polite">New stock: <strong className="tabular-nums text-ink">{result}</strong></p>
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
            <AdminButton type="submit" variant="primary" disabled={mode !== 'set' && n === 0}>Update stock</AdminButton>
          </div>
        </form>
      }
    </Modal>);

}