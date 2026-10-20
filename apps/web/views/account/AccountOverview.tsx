'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PackageIcon, SparklesIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OrderHistoryTable } from '@/components/account/OrderHistoryTable';
import { AppointmentList } from '@/components/account/AppointmentList';
import { PushCard } from '@/components/account/PushCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { toISODate } from '@/lib/utils/dates';
import type { Order } from '@/types/order';
import type { Appointment } from '@/types/salon';

export function AccountOverview({ orders, appointments }: { orders: Order[]; appointments: Appointment[] }) {
  const { user } = useAuth();
  const params = useSearchParams();
  if (!user) return null;

  const today = toISODate(new Date());
  const upcoming = appointments
    .filter((a) => a.date >= today && a.status !== 'Cancelled')
    .sort((a, b) => a.date.localeCompare(b.date));
  const stats = [
    { label: 'Total orders', value: orders.length },
    { label: 'Pending', value: orders.filter((o) => o.status === 'Pending').length },
    {
      label: 'Confirmed',
      value: orders.filter((o) => ['Confirmed', 'Processing', 'Shipped'].includes(o.status)).length,
    },
    { label: 'Completed', value: orders.filter((o) => o.status === 'Delivered').length },
  ];

  return (
    <div className="space-y-10">
      {params.get('welcome') && (
        <div className="flex items-start gap-4 rounded-[24px] bg-ink p-6 text-white" role="status">
          <SparklesIcon className="h-6 w-6 shrink-0 text-pink" aria-hidden />
          <div>
            <p className="font-display text-2xl">Welcome to LUXICHIC, {user.fullName.split(' ')[0]}!</p>
            <p className="mt-1 text-sm text-white/75">
              Your account is ready. Any orders you placed with this email are now saved below.
            </p>
          </div>
        </div>
      )}
      <header>
        <h1 className="font-display text-5xl text-ink">Hello, {user.fullName.split(' ')[0]}</h1>
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-y border-line py-5">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-xs text-subtle">{s.label}</dt>
              <dd className="font-display text-3xl tabular-nums text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <PushCard />

      <section aria-labelledby="recent-orders">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="recent-orders" className="font-display text-3xl text-ink">
            Recent orders
          </h2>
          {orders.length > 0 && (
            <Link
              href="/account/orders"
              className="text-xs font-bold uppercase tracking-[0.14em] text-ink underline-offset-4 hover:underline"
            >
              View all
            </Link>
          )}
        </div>
        {orders.length ? (
          <OrderHistoryTable orders={orders.slice(0, 3)} />
        ) : (
          <EmptyState
            icon={<PackageIcon className="h-7 w-7" />}
            title="No orders yet"
            text="When you place an order it will appear here."
            actions={<Button to="/hairs">Start shopping</Button>}
          />
        )}
      </section>

      <section aria-labelledby="upcoming">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="upcoming" className="font-display text-3xl text-ink">
            Upcoming appointments
          </h2>
          <Link
            href="/account/appointments"
            className="text-xs font-bold uppercase tracking-[0.14em] text-ink underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </div>
        <AppointmentList appointments={upcoming.slice(0, 3)} compact />
      </section>
    </div>
  );
}
