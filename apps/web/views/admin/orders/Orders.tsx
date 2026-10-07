'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { DownloadIcon, ShoppingBagIcon } from 'lucide-react';
import type { Order, OrderStatus } from '@/types/order';
import { useOrders } from '@/contexts/OrdersContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAdminOps } from '@/hooks/useAdminOps';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { FilterTabs } from '@/components/admin/ui/FilterTabs';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { TablePager, paginate } from '@/components/admin/ui/TablePager';
import { adminInputClass } from '@/components/admin/ui/AdminField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { paymentMethodLabel } from '@/components/orders/OrderDetailsView';
import { formatNaira } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/dates';
import { downloadCsv } from '@/lib/utils/text';
import { cn } from '@/lib/utils/cn';

type Tab = 'all' | 'awaiting' | OrderStatus;
const PAGE = 15;

const isAwaiting = (o: Order) => o.paymentStatus === 'Pending Verification' && o.status === 'Pending';
const divisionOf = (o: Order) => {
  const set = new Set(o.items.map((i) => i.division));
  return set.size > 1 ? 'Both' : set.has('hairs') ? 'Hairs' : 'Tools';
};

export function Orders() {
  const { orders } = useOrders();
  const { can } = useAdminAuth();
  const ops = useAdminOps();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = params.get('status') as Tab || 'all';
  const [q, setQ] = useState(params.get('q') ?? '');
  const [division, setDivision] = useState<'all' | 'Hairs' | 'Tools' | 'Both'>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState<OrderStatus | null>(null);

  useEffect(() => setPage(1), [tab, q, division]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length, awaiting: orders.filter(isAwaiting).length };
    orders.forEach((o) => {c[o.status] = (c[o.status] ?? 0) + 1;});
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return orders.
    filter((o) => tab === 'all' ? true : tab === 'awaiting' ? isAwaiting(o) : o.status === tab).
    filter((o) => division === 'all' || divisionOf(o) === division).
    filter((o) => !t || [o.orderNumber, o.reference, o.customer.fullName, o.customer.email, o.customer.phone].some((f) => f.toLowerCase().includes(t))).
    sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, tab, q, division]);

  const rows = paginate(filtered, page, PAGE);
  const allOnPage = rows.length > 0 && rows.every((o) => selected.includes(o.orderNumber));

  const exportCsv = () => {
    downloadCsv(`luxichic-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Order', 'Reference', 'Date', 'Customer', 'Email', 'Phone', 'State', 'Items', 'Total', 'Payment method', 'Payment status', 'Order status'],
    ...filtered.map((o) => [o.orderNumber, o.reference, o.createdAt, o.customer.fullName, o.customer.email, o.customer.phone, o.address.state, o.items.reduce((s, i) => s + i.quantity, 0), o.total, paymentMethodLabel(o.paymentMethod), o.paymentStatus, o.status])]
    );
    toast.success(`Exported ${filtered.length} orders`);
  };

  const applyBulk = () => {
    if (!bulk) return;
    selected.forEach((n) => ops.setOrderStatus(n, bulk));
    toast.success(`${selected.length} order${selected.length > 1 ? 's' : ''} marked ${bulk.toLowerCase()}`);
    setSelected([]);
    setBulk(null);
  };

  const setTab = (v: Tab) => {
    const next = new URLSearchParams(params);
    if (v === 'all') next.delete('status');else next.set('status', v);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every order from both shops. Verify transfers before confirming."
        actions={<AdminButton icon={<DownloadIcon className="h-4 w-4" />} onClick={exportCsv}>Export CSV</AdminButton>} />
      

      <div className="rounded-xl border border-line bg-white">
        <div className="space-y-3 border-b border-line p-3 sm:p-4">
          <FilterTabs
            label="Order status"
            value={tab}
            onChange={setTab}
            options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'awaiting', label: 'Payment verification', count: counts.awaiting },
            ...(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map((s) => ({ value: s, label: s, count: counts[s] ?? 0 }))]
            } />
          
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput value={q} onChange={setQ} placeholder="Order number, reference, name, email or phone" className="sm:max-w-md sm:flex-1" />
            <select aria-label="Division" value={division} onChange={(e) => setDivision(e.target.value as typeof division)} className={cn(adminInputClass, 'sm:w-44')}>
              <option value="all">All divisions</option>
              <option value="Hairs">LUXICHIC Hairs</option>
              <option value="Tools">Hair Tools</option>
              <option value="Both">Both divisions</option>
            </select>
          </div>
        </div>

        {selected.length > 0 && can('orders.edit') &&
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-canvas/60 px-4 py-2 text-[13px]">
            <span className="font-semibold text-ink">{selected.length} selected</span>
            <span className="text-subtle">Mark as</span>
            {(['Processing', 'Shipped', 'Delivered'] as OrderStatus[]).map((s) =>
          <AdminButton key={s} size="xs" onClick={() => setBulk(s)}>{s}</AdminButton>
          )}
            <AdminButton size="xs" variant="dangerGhost" onClick={() => setBulk('Cancelled')}>Cancel orders</AdminButton>
            <button onClick={() => setSelected([])} className="ml-auto text-xs font-semibold text-subtle hover:text-ink">Clear</button>
          </div>
        }

        {filtered.length === 0 ?
        <AdminEmpty icon={<ShoppingBagIcon className="h-5 w-5" />} title="No orders match" text="Try another status, division or search term." /> :

        <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-line text-xs text-subtle">
                  <tr>
                    <th className="w-10 px-4 py-2.5">
                      <input type="checkbox" aria-label="Select all on page" checked={allOnPage} onChange={(e) => setSelected(e.target.checked ? Array.from(new Set([...selected, ...rows.map((o) => o.orderNumber)])) : selected.filter((n) => !rows.some((o) => o.orderNumber === n)))} className="h-4 w-4 accent-ink" />
                    </th>
                    <th className="px-2 py-2.5 font-semibold">Order</th>
                    <th className="px-2 py-2.5 font-semibold">Customer</th>
                    <th className="px-2 py-2.5 font-semibold">Date</th>
                    <th className="px-2 py-2.5 font-semibold">Division</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Total</th>
                    <th className="px-2 py-2.5 font-semibold">Payment</th>
                    <th className="px-2 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((o) =>
                <tr key={o.orderNumber} className={cn('transition-colors duration-150 hover:bg-canvas/50', isAwaiting(o) && 'bg-pink/[0.03]')}>
                      <td className="px-4 py-2.5">
                        <input type="checkbox" aria-label={`Select ${o.orderNumber}`} checked={selected.includes(o.orderNumber)} onChange={(e) => setSelected(e.target.checked ? [...selected, o.orderNumber] : selected.filter((n) => n !== o.orderNumber))} className="h-4 w-4 accent-ink" />
                      </td>
                      <td className="px-2 py-2.5">
                        <Link href={`/admin/orders/${o.orderNumber}`} className="font-semibold text-ink hover:underline">{o.orderNumber}</Link>
                        <p className="font-mono text-[11px] text-subtle">Ref {o.reference}</p>
                      </td>
                      <td className="max-w-[220px] px-2 py-2.5">
                        <p className="truncate font-medium text-ink">{o.customer.fullName}</p>
                        <p className="truncate text-xs text-subtle">{o.customer.email} · {o.customer.phone}</p>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-charcoal">{formatDate(o.createdAt)}</td>
                      <td className="px-2 py-2.5 text-charcoal">{divisionOf(o)}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums text-ink">{formatNaira(o.total)}</td>
                      <td className="px-2 py-2.5">
                        <p className="text-xs text-subtle">{paymentMethodLabel(o.paymentMethod)}</p>
                        <StatusBadge status={o.paymentStatus} />
                      </td>
                      <td className="px-2 py-2.5"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-2.5 text-right">
                        <AdminButton size="xs" variant={isAwaiting(o) ? 'primary' : 'outline'} to={`/admin/orders/${o.orderNumber}`}>{isAwaiting(o) ? 'Verify' : 'View'}</AdminButton>
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-line lg:hidden">
              {rows.map((o) =>
            <li key={o.orderNumber}>
                  <Link href={`/admin/orders/${o.orderNumber}`} className="block px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-ink">{o.orderNumber}</p>
                        <p className="truncate text-xs text-subtle">{o.customer.fullName} · {formatDate(o.createdAt)}</p>
                      </div>
                      <p className="text-[13px] font-semibold tabular-nums text-ink">{formatNaira(o.total)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <StatusBadge status={o.status} />
                      <StatusBadge status={o.paymentStatus} />
                    </div>
                  </Link>
                </li>
            )}
            </ul>
            <TablePager page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
          </>
        }
      </div>

      <ConfirmDialog
        open={!!bulk}
        onClose={() => setBulk(null)}
        onConfirm={applyBulk}
        title={`Mark ${selected.length} order${selected.length > 1 ? 's' : ''} as ${bulk?.toLowerCase()}?`}
        message={bulk === 'Cancelled' ? 'Cancelled orders stop processing. Customers would be emailed by the backend.' : 'Each order’s timeline will be updated and customers would be notified by the backend.'}
        tone={bulk === 'Cancelled' ? 'danger' : 'default'}
        confirmLabel="Apply" />
      
    </div>);

}