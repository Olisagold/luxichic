'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BoxesIcon,
  CalendarClockIcon,
  LandmarkIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { usePeriodParam } from '@/hooks/usePeriodParam';
import { quickActions } from '@/data/adminNav';
import { Panel } from '@/components/admin/ui/Panel';
import { CountUp } from '@/components/admin/ui/CountUp';
import { RangePicker } from '@/components/admin/ui/RangePicker';
import { RevenueChart } from '@/components/admin/charts/RevenueChart';
import { DonutChart } from '@/components/admin/charts/DonutChart';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatNaira } from '@/lib/utils/currency';
import { formatSlot } from '@/lib/utils/dates';
import { compactNaira } from '@/lib/utils/adminAnalytics';
import type { DashboardData } from '@/lib/analytics/types';
import { cn } from '@/lib/utils/cn';

/** Figures are aggregated on the server for the range in the URL (lib/analytics/admin-queries.ts). */
export function Dashboard({ data }: { data: DashboardData }) {
  const { admin, can } = useAdminAuth();
  const { range, setRange, custom, setCustom, pending } = usePeriodParam(data.period);
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');

  const actions = quickActions.filter((a) => !a.permission || can(a.permission));
  const apptMax = Math.max(1, ...data.appointmentsByStatus.map((a) => a.count));
  const hour = new Date().getHours();

  return (
    <div className={cn('space-y-5 transition-opacity', pending && 'opacity-60')} aria-busy={pending}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] text-subtle">
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="font-display text-3xl text-ink md:text-[2.1rem]">
            Good {hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, {admin?.fullName.split(' ')[0]}
          </h1>
        </div>
        <RangePicker value={range} onChange={setRange} custom={custom} onCustom={setCustom} />
      </header>

      {/* Primary: what needs a decision today */}
      <section aria-labelledby="attention" className="overflow-hidden rounded-xl bg-ink text-white">
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 id="attention" className="text-sm font-semibold">
            Needs attention
          </h2>
          <span className="text-xs text-white/50">Updated live</span>
        </div>
        <div className="grid grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
          <AttentionItem
            icon={<LandmarkIcon className="h-4 w-4" />}
            to="/admin/orders?status=awaiting"
            label="Transfers awaiting verification"
            value={<CountUp value={data.awaiting.count} />}
            sub={`${formatNaira(data.awaiting.total)} to check against the bank`}
            urgent={data.awaiting.count > 0}
          />

          <AttentionItem
            icon={<CalendarClockIcon className="h-4 w-4" />}
            to="/admin/appointments?status=Pending"
            label="Appointment requests to confirm"
            value={<CountUp value={data.pendingAppointments} />}
            sub={`${data.todayAppointments.length} appointment${data.todayAppointments.length === 1 ? '' : 's'} on today’s schedule`}
            urgent={data.pendingAppointments > 0}
          />

          <AttentionItem
            icon={<BoxesIcon className="h-4 w-4" />}
            to="/admin/inventory?filter=low"
            label="Products low or out of stock"
            value={<CountUp value={data.lowStock.count} />}
            sub={
              data.lowStock.items[0]
                ? `${data.lowStock.items[0].name}: ${data.lowStock.items[0].stock} left`
                : 'Stock levels are healthy'
            }
            urgent={data.lowStock.count > 0}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title={
            <span className="flex items-baseline gap-3">
              <span className="text-2xl font-bold tracking-tight text-ink">
                {metric === 'revenue' ? (
                  <CountUp value={data.revenue} format={(n) => formatNaira(Math.round(n))} />
                ) : (
                  <CountUp value={data.orderCount} />
                )}
              </span>
              <Change value={metric === 'revenue' ? data.revenueChange : data.ordersChange} />
            </span>
          }
          description={`${metric === 'revenue' ? 'Revenue' : 'Orders'} vs previous period · excludes cancelled orders`}
          actions={
            <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Chart metric">
              {(['revenue', 'orders'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  aria-pressed={metric === m}
                  className={cn(
                    'h-7 rounded-md px-2.5 text-xs font-semibold capitalize',
                    metric === m ? 'bg-ink text-white' : 'text-charcoal hover:bg-canvas',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          }
        >
          <RevenueChart data={data.series} metric={metric} />
        </Panel>

        <Panel
          title="Today’s appointments"
          actions={
            <Link href="/admin/calendar" className="text-xs font-semibold text-ink hover:underline">
              Calendar
            </Link>
          }
          bodyClassName="p-0"
        >
          {data.todayAppointments.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-subtle">No appointments today.</p>
          ) : (
            <ul className="max-h-[300px] divide-y divide-line overflow-y-auto">
              {data.todayAppointments.map((a) => (
                <li key={a.reference}>
                  <Link
                    href={`/admin/appointments?ref=${a.reference}`}
                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-canvas/60"
                  >
                    <span className="w-16 shrink-0 text-xs font-semibold tabular-nums text-ink">
                      {formatSlot(a.time)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">{a.serviceName}</span>
                      <span className="block truncate text-xs text-subtle">
                        {a.customerName}
                        {a.specialistName ? ` · ${a.specialistName}` : ''}
                      </span>
                    </span>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Secondary metrics — compact, one line each */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3 xl:grid-cols-6"
      >
        <Metric label="Orders" value={data.orderCount} sub={`${data.pendingOrders} pending`} to="/admin/orders" />
        <Metric
          label="Confirmed orders"
          value={data.confirmed.count}
          sub={compactNaira(data.confirmed.revenue)}
          to="/admin/orders?status=Confirmed"
        />
        <Metric
          label="Customers"
          value={data.customers.total}
          sub={`${data.customers.new} new · ${data.customers.blocked} blocked`}
          to="/admin/customers"
        />
        <Metric
          label="Active products"
          value={data.products.published}
          sub={`${data.products.archived} archived · ${data.products.soldOut} sold out`}
          to="/admin/products"
        />
        <Metric
          label="Upcoming appointments"
          value={data.upcomingAppointments}
          sub={`${data.todayAppointments.length} today`}
          to="/admin/appointments"
        />
        <Metric
          label="Completed services"
          value={data.completedAppointments}
          sub="All time"
          to="/admin/appointments?status=Completed"
        />
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Sales by division" description="Product revenue in range">
          <DonutChart data={data.division} format={compactNaira} centerLabel="Total" />
        </Panel>
        <Panel
          title="Appointments by status"
          actions={
            <Link href="/admin/appointments" className="text-xs font-semibold text-ink hover:underline">
              View all
            </Link>
          }
        >
          <ul className="space-y-2.5">
            {data.appointmentsByStatus.map((a) => (
              <li key={a.status} className="flex items-center gap-3 text-[13px]">
                <span className="w-24 shrink-0 text-charcoal">{a.status}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                  <span
                    className={cn('block h-full rounded-full', a.status === 'Pending' ? 'bg-pink' : 'bg-ink')}
                    style={{ width: `${(a.count / apptMax) * 100}%` }}
                  />
                </span>
                <span className="w-7 text-right font-semibold tabular-nums text-ink">{a.count}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Most-booked services" description="All time">
          {data.topServices.length === 0 && <p className="text-[13px] text-subtle">No bookings yet.</p>}
          <ol className="space-y-2.5">
            {data.topServices.map(([name, count], i) => (
              <li key={name} className="flex items-center gap-3 text-[13px]">
                <span className="w-4 text-xs font-semibold text-muted">{i + 1}</span>
                <span className="flex-1 truncate text-charcoal">{name}</span>
                <span className="font-semibold tabular-nums text-ink">{count}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Best-selling products" description="By revenue in range" bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {data.top.map((p) => (
              <li key={p.productId ?? p.name}>
                <Link
                  href={p.productId ? `/admin/products/${p.productId}` : '/admin/products'}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-canvas/60"
                >
                  <img src={p.image} alt="" className="h-9 w-9 rounded-md object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{p.name}</span>
                    <span className="block text-xs text-subtle">{p.qty} sold</span>
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums text-ink">{formatNaira(p.revenue)}</span>
                </Link>
              </li>
            ))}
            {data.top.length === 0 && (
              <li className="px-5 py-8 text-center text-[13px] text-subtle">No sales in this range.</li>
            )}
          </ul>
        </Panel>
        <Panel
          title="Low stock"
          actions={
            <Link href="/admin/inventory?filter=low" className="text-xs font-semibold text-ink hover:underline">
              Restock
            </Link>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-line">
            {data.lowStock.items.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/inventory?q=${encodeURIComponent(p.name)}`}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-canvas/60"
                >
                  <img src={p.image} alt="" className="h-9 w-9 rounded-md object-cover" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{p.name}</span>
                  <span
                    className={cn(
                      'text-[13px] font-semibold tabular-nums',
                      p.stock <= 0 ? 'text-red-700' : 'text-amber-700',
                    )}
                  >
                    {p.stock <= 0 ? 'Sold out' : `${p.stock} left`}
                  </span>
                </Link>
              </li>
            ))}
            {data.lowStock.count === 0 && (
              <li className="px-5 py-8 text-center text-[13px] text-subtle">Nothing needs restocking.</li>
            )}
          </ul>
        </Panel>
      </div>

      <Panel title="Quick actions">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {actions.map((a) => (
            <Link
              key={a.to}
              href={a.to}
              className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 text-[13px] font-semibold text-ink transition-colors duration-150 hover:border-ink/30 hover:bg-canvas"
            >
              <a.icon className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
              <span className="truncate">{a.label}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function AttentionItem({
  icon,
  label,
  value,
  sub,
  to,
  urgent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub: string;
  to: string;
  urgent: boolean;
}) {
  return (
    <Link
      href={to}
      className="group flex items-end justify-between gap-3 px-5 py-4 transition-colors duration-150 hover:bg-white/[0.04]"
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xs text-white/60">
          <span className={urgent ? 'text-pink' : 'text-white/40'}>{icon}</span>
          {label}
        </p>
        <p className="mt-1.5 text-3xl font-bold tracking-tight">{value}</p>
        <p className="mt-0.5 truncate text-xs text-white/55">{sub}</p>
      </div>
      <ArrowUpRightIcon
        className="h-4 w-4 shrink-0 text-white/30 transition-colors duration-150 group-hover:text-pink"
        aria-hidden
      />
    </Link>
  );
}

function Metric({ label, value, sub, to }: { label: string; value: number; sub: string; to: string }) {
  return (
    <Link href={to} className="group bg-white px-4 py-3 transition-colors duration-150 hover:bg-canvas/50">
      <p className="truncate text-xs text-subtle">{label}</p>
      <p className="mt-0.5 flex items-center justify-between text-xl font-bold text-ink">
        <CountUp value={value} />
        <ArrowRightIcon
          className="h-3.5 w-3.5 text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          aria-hidden
        />
      </p>
      <p className="truncate text-[11px] text-muted">{sub}</p>
    </Link>
  );
}

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs font-semibold text-subtle">New</span>;
  const up = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold',
        up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
      )}
    >
      {up ? <TrendingUpIcon className="h-3 w-3" aria-hidden /> : <TrendingDownIcon className="h-3 w-3" aria-hidden />}
      {up ? '+' : ''}
      {value}%
    </span>
  );
}
