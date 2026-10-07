'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClockIcon, PackageIcon, SearchIcon, ShoppingBagIcon, SparklesIcon, StarIcon, UserIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useOrders } from '@/contexts/OrdersContext';
import { useAuth } from '@/contexts/AuthContext';
import { useReviews } from '@/contexts/ReviewsContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useDb } from '@/lib/mock-db/db';
import { formatNaira } from '@/lib/utils/currency';
import { cn } from '@/lib/utils/cn';

interface Result {
  group: string;
  icon: React.ElementType;
  title: string;
  meta: string;
  to: string;
}

/** ⌘K search across orders, customers, products, reviews, appointments and specialists. */
export function AdminCommandSearch({ open, onClose }: {open: boolean;onClose: () => void;}) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const router = useRouter();
  const { orders, appointments } = useOrders();
  const { users } = useAuth();
  const { all: reviews } = useReviews();
  const { can } = useAdminAuth();
  const products = useDb((s) => s.products);
  const specialists = useDb((s) => s.specialists);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const has = (...fields: (string | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(t));
    const out: Result[] = [];
    if (can('orders.view')) {
      orders.filter((o) => has(o.orderNumber, o.reference, o.customer.fullName, o.customer.email, o.customer.phone)).slice(0, 5).
      forEach((o) => out.push({ group: 'Orders', icon: ShoppingBagIcon, title: `${o.orderNumber} · ${o.customer.fullName}`, meta: `Ref ${o.reference} · ${formatNaira(o.total)} · ${o.status}`, to: `/admin/orders/${o.orderNumber}` }));
    }
    if (can('customers.view')) {
      users.filter((u) => has(u.fullName, u.email, u.phone)).slice(0, 5).
      forEach((u) => out.push({ group: 'Customers', icon: UserIcon, title: u.fullName, meta: `${u.email} · ${u.phone}`, to: `/admin/customers/${u.id}` }));
    }
    if (can('products.view')) {
      products.filter((p) => has(p.name, p.sku, p.slug)).slice(0, 5).
      forEach((p) => out.push({ group: 'Products', icon: PackageIcon, title: p.name, meta: `${p.sku} · ${formatNaira(p.price)} · ${p.stock} in stock`, to: `/admin/products/${p.id}` }));
    }
    if (can('appointments.view')) {
      appointments.filter((a) => has(a.reference, a.customer.fullName, a.customer.email, a.serviceName)).slice(0, 5).
      forEach((a) => out.push({ group: 'Appointments', icon: CalendarClockIcon, title: `${a.reference} · ${a.serviceName}`, meta: `${a.customer.fullName} · ${a.date} ${a.time} · ${a.status}`, to: `/admin/appointments?ref=${a.reference}` }));
    }
    if (can('reviews.view')) {
      reviews.filter((r) => has(r.title, r.body, r.authorName)).slice(0, 3).
      forEach((r) => out.push({ group: 'Reviews', icon: StarIcon, title: r.title, meta: `${r.authorName} · ${r.rating}★`, to: `/admin/reviews?q=${encodeURIComponent(r.title)}` }));
    }
    if (can('salon.specialists')) {
      specialists.filter((s) => has(s.name, s.title, ...s.specialties)).slice(0, 3).
      forEach((s) => out.push({ group: 'Specialists', icon: SparklesIcon, title: s.name, meta: s.title, to: '/admin/salon/specialists' }));
    }
    return out;
  }, [q, orders, users, products, appointments, reviews, specialists, can]);

  const go = (r: Result) => {
    onClose();
    router.push(r.to);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[active]) {
      go(results[active]);
    }
  };

  let lastGroup = '';

  return (
    <Modal open={open} onClose={onClose} title="Search" hideTitle className="mt-[12vh] max-w-xl self-start rounded-2xl">
      <div className="flex items-center gap-2 border-b border-line px-4">
        <SearchIcon className="h-4 w-4 text-subtle" aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => {setQ(e.target.value);setActive(0);}}
          onKeyDown={onKey}
          placeholder="Search orders, references, customers, products…"
          aria-label="Search the admin"
          className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />
        
        <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-subtle">ESC</kbd>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-2" role="listbox" aria-label="Results">
        {q.trim().length < 2 ?
        <p className="px-3 py-6 text-center text-[13px] text-subtle">Try an order number (LXC-…), an 8-digit reference, a customer email or a product name.</p> :
        results.length === 0 ?
        <p className="px-3 py-6 text-center text-[13px] text-subtle">No results for “{q}”.</p> :

        results.map((r, i) => {
          const header = r.group !== lastGroup ? r.group : null;
          lastGroup = r.group;
          return (
            <React.Fragment key={`${r.group}-${r.to}-${i}`}>
                {header && <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{header}</p>}
                <button
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left', i === active ? 'bg-canvas' : '')}>
                
                  <r.icon className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink">{r.title}</span>
                    <span className="block truncate text-xs text-subtle">{r.meta}</span>
                  </span>
                </button>
              </React.Fragment>);

        })
        }
      </div>
    </Modal>);

}