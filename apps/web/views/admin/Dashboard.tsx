'use client';

import React, { useMemo, useState } from 'react';
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
import { useOrders } from '@/contexts/OrdersContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useDb } from '@/lib/mock-db/db';
import { stockState } from '@/lib/mock-db/catalog';
import { quickActions } from '@/data/adminNav';
import { Panel } from '@/components/admin/ui/Panel';
import { CountUp } from '@/components/admin/ui/CountUp';
import { RangePicker } from '@/components/admin/ui/RangePicker';
import { RevenueChart } from '@/components/admin/charts/RevenueChart';
import { DonutChart } from '@/components/admin/charts/DonutChart';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatNaira } from '@/lib/utils/currency';
import { formatSlot, toISODate } from '@/lib/utils/dates';
import {
  compactNaira,
  countsAsRevenue,
  inRange,
  pctChange,
  previousRange,
  resolveRange,
  revenueSeries,
  salesByDivision,
  topProducts,
  type RangeKey,
} from '@/lib/utils/adminAnalytics';
import { cn } from '@/lib/utils/cn';

export function Dashboard() {
  const { admin, can } = useAdminAuth();
  const { orders, appointments } = useOrders();
  const { users } = useAuth();
  const products = useDb((s) => s.products);
  const [range, setRange] = useState<RangeKey>('30d');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');

  const today = toISODate(new Date());
  const data = useMemo(() => {
    const r = resolveRange(range, custom);
    const prev = previousRange(r);
    const cur = orders.filter((o) => countsAsRevenue(o) && inRange(o.createdAt, r));
    const before = orders.filter((o) => countsAsRevenue(o) && inRange(o.createdAt, prev));
    const revenue = cur.reduce((s, o) => s + o.total, 0);
    const prevRevenue = before.reduce((s, o) => s + o.total, 0);
    const awaiting = orders.filter((o) => o.paymentStatus === 'Pending Verification' && o.status === 'Pending');
    const confirmed = orders.filter((o) => ['Confirmed', 'Processing', 'Shipped', 'Delivered'].includes(o.status));
    const low = products
      .filter((p) => p.status !== 'archived' && p.trackInventory && stockState(p) !== 'In Stock')
      .sort((a, b) => a.stock - b.stock);
    const todayAppts = appointments
      .filter((a) => a.date === today && !['Rejected', 'Cancelled'].includes(a.status))
      .sort((a, b) => a.time.localeCompare(b.time));
    const pendingAppts = appointments.filter((a) => a.status === 'Pending');
    const apptCounts = (['Pending', 'Confirmed', 'Rescheduled', 'Completed', 'Rejected', 'Cancelled'] as const).map(
      (s) => ({ status: s, count: appointments.filter((a) => a.status === s).length }),
    );
    const serviceCounts = Object.entries(
      appointments.reduce<Record<string, number>>(
        (m, a) => ({ ...m, [a.serviceName]: (m[a.serviceName] ?? 0) + 1 }),
        {},
      ),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const newUsers = users.filter((u) => inRange(u.createdAt, r)).length;
    return {
      r,
      revenue,
      revenueChange: pctChange(revenue, prevRevenue),
      orderCount: cur.length,
      ordersChange: pctChange(cur.length, before.length),
      awaiting,
      awaitingTotal: awaiting.reduce((s, o) => s + o.total, 0),
      confirmed,
      confirmedRevenue: confirmed.reduce((s, o) => s + o.total, 0),
      low,
      todayAppts,
      pendingAppts,
      apptCounts,
      serviceCounts,
      newUsers,
      series: revenueSeries(orders, r),
      division: salesByDivision(cur),
      top: topProducts(cur),
      pendingOrders: orders.filter((o) => o.status === 'Pending').length,
      upcoming: appointments.filter((a) => a.date > today && ['Pending', 'Confirmed', 'Rescheduled'].includes(a.status))
        .length,
    };
  }, [orders, appointments, users, products, range, custom, today]);

  const actions = quickActions.filter((a) => !a.permission || can(a.permission));
  const apptMax = Math.max(1, ...data.apptCounts.map((a) => a.count));
  const hour = new Date().getHours();

  return (
    <div className="space-y-5">
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
        <div className="grid divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
          <AttentionItem
            icon={<LandmarkIcon className="h-4 w-4" />}
            to="/admin/orders?status=awaiting"
            label="Transfers awaiting verification"
            value={<CountUp value={data.awaiting.length} />}
            sub={`${formatNaira(data.awaitingTotal)} to check against the bank`}
            urgent={data.awaiting.length > 0}
          />

          <AttentionItem
            icon={<CalendarClockIcon className="h-4 w-4" />}
            to="/admin/appointments?status=Pending"
            label="Appointment requests to confirm"
            value={<CountUp value={data.pendingAppts.length} />}
            sub={`${data.todayAppts.length} appointment${data.todayAppts.length === 1 ? '' : 's'} on today’s schedule`}
            urgent={data.pendingAppts.length > 0}
          />

          <AttentionItem
            icon={<BoxesIcon className="h-4 w-4" />}
            to="/admin/inventory?filter=low"
            label="Products low or out of stock"
            value={<CountUp value={data.low.length} />}
            sub={data.low[0] ? `${data.low[0].name}: ${data.low[0].stock} left` : 'Stock levels are healthy'}
            urgent={data.low.length > 0}
          />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
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
          {data.todayAppts.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-subtle">No appointments today.</p>
          ) : (
            <ul className="max-h-[300px] divide-y divide-line overflow-y-auto">
              {data.todayAppts.map((a) => (
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
                        {a.customer.fullName}
                        {a.personnelName ? ` · ${a.personnelName}` : ''}
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
          value={data.confirmed.length}
          sub={compactNaira(data.confirmedRevenue)}
          to="/admin/orders?status=Confirmed"
        />
        <Metric
          label="Customers"
          value={users.length}
          sub={`${data.newUsers} new · ${users.filter((u) => u.status === 'blocked').length} blocked`}
          to="/admin/customers"
        />
        <Metric
          label="Active products"
          value={products.filter((p) => p.status === 'published').length}
          sub={`${products.filter((p) => p.status === 'archived').length} archived · ${products.filter((p) => p.stock <= 0).length} sold out`}
          to="/admin/products"
        />
        <Metric
          label="Upcoming appointments"
          value={data.upcoming}
          sub={`${data.todayAppts.length} today`}
          to="/admin/appointments"
        />
        <Metric
          label="Completed services"
          value={appointments.filter((a) => a.status === 'Completed').length}
          sub="All time"
          to="/admin/appointments?status=Completed"
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
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
            {data.apptCounts.map((a) => (
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
        <Panel title="Most-booked services">
          <ol className="space-y-2.5">
            {data.serviceCounts.map(([name, count], i) => (
              <li key={name} className="flex items-center gap-3 text-[13px]">
                <span className="w-4 text-xs font-semibold text-muted">{i + 1}</span>
                <span className="flex-1 truncate text-charcoal">{name}</span>
                <span className="font-semibold tabular-nums text-ink">{count}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Best-selling products" description="By revenue in range" bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {data.top.map((p) => (
              <li key={p.productId}>
                <Link
                  href={`/admin/products/${p.productId}`}
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
            {data.low.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/inventory?q=${encodeURIComponent(p.name)}`}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-canvas/60"
                >
                  <img src={p.images[0]} alt="" className="h-9 w-9 rounded-md object-cover" />
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
            {data.low.length === 0 && (
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
