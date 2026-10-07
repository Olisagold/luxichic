import React, { useState } from 'react';
import { PackageIcon, SearchIcon } from 'lucide-react';
import type { OrderStatus } from '../../types/order';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { OrderHistoryTable } from '../../components/account/OrderHistoryTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';

const statuses: ('All' | OrderStatus)[] = ['All', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export function AccountOrders() {
  const { user } = useAuth();
  const { ordersForAccount } = useOrders();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<(typeof statuses)[number]>('All');
  if (!user) return null;

  const all = ordersForAccount(user.email);
  const term = q.trim().toLowerCase();
  const list = all.filter(
    (o) =>
    (status === 'All' || o.status === status) && (
    !term || o.orderNumber.toLowerCase().includes(term) || o.reference.includes(term) || o.items.some((i) => i.name.toLowerCase().includes(term)))
  );

  return (
    <div>
      <h1 className="font-display text-5xl text-ink">Order history</h1>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="order-search" className="sr-only">Search orders</label>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input id="order-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order number, reference or product" className="h-11 w-full rounded-full border border-line bg-white pl-11 pr-4 text-sm focus:border-ink focus:outline-none" />
        </div>
        <label htmlFor="order-status" className="sr-only">Filter by status</label>
        <select id="order-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-11 rounded-full border border-line bg-white px-5 text-sm sm:w-52">
          {statuses.map((s) => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}
        </select>
      </div>
      <div className="mt-6">
        {list.length ?
        <OrderHistoryTable orders={list} /> :

        <EmptyState
          icon={<PackageIcon className="h-7 w-7" />}
          title={all.length ? 'No matching orders' : 'No orders yet'}
          text={all.length ? 'Try a different search or status.' : 'Your orders will appear here once you place one.'}
          actions={all.length ? <Button variant="outline" onClick={() => {setQ('');setStatus('All');}}>Clear filters</Button> : <Button to="/hairs">Start shopping</Button>} />

        }
      </div>
    </div>);

}