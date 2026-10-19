import 'server-only';
import { format, parseISO } from 'date-fns';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { bookingScope, getAdmin, hasPermission } from '@/lib/auth/session';
import { notificationsFor, unreadCountFor } from '@/lib/notifications/for-admin';
import { addDays } from '@/lib/salon/availability';
import { lagosNow } from '@/lib/salon/schedule';
import { formatNaira } from '@/lib/utils/currency';
import { pctChange, rangeOptions, type RangeKey } from '@/lib/utils/adminAnalytics';
import type { AdminUser } from '@/types/admin';
import type { AdminBadges } from '@/components/admin/AdminBadgesProvider';
import type {
  AnalyticsData,
  DashboardData,
  DivisionSlice,
  Period,
  ProductSales,
  SeriesPoint,
} from '@/lib/analytics/types';

/**
 * Dashboard and analytics figures, aggregated in Postgres. Days are Lagos calendar days; revenue counts every
 * order that isn't cancelled (as the orders pages do). The range comes from the page URL (?range=30d, or
 * ?range=custom&from=…&to=…), so the server computes only the chosen period.
 */

const DAYS: Record<Exclude<RangeKey, 'custom'>, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const LAGOS_DAY = (column: SQL) => sql`(${column} at time zone 'Africa/Lagos')::date`;
const title = (v: string) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
const n = (v: unknown) => Number(v ?? 0);
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

/** Reads the range from the URL; anything unknown or invalid falls back to the last 30 days. */
export function resolvePeriod(params: { range?: string; from?: string; to?: string }): Period {
  const { today } = lagosNow();
  const key = rangeOptions.some((o) => o.value === params.range) ? (params.range as RangeKey) : '30d';
  if (key === 'custom') {
    const { from, to } = params;
    if (from && to && ISO.test(from) && ISO.test(to) && from <= to && to <= today && daysBetween(from, to) <= 1100) {
      return { key, from, to };
    }
    return { key: '30d', from: addDays(today, -29), to: today };
  }
  return { key, from: addDays(today, -(DAYS[key] - 1)), to: today };
}

/** The same number of days just before the period. */
function previous(p: Period): Period {
  const days = daysBetween(p.from, p.to);
  return { key: p.key, from: addDays(p.from, -days), to: addDays(p.from, -1) };
}

const inPeriod = (column: SQL, p: Period) => sql`${LAGOS_DAY(column)} between ${p.from}::date and ${p.to}::date`;
const ordersIn = (p: Period) => inPeriod(sql`o.created_at`, p);

async function orderTotals(p: Period) {
  const [row] = await db.execute<{ revenue: number; paid: number; all: number }>(sql`
    select coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)::float8 as revenue,
           count(*) filter (where o.status <> 'cancelled')::int as paid,
           count(*)::int as all
    from orders o where ${ordersIn(p)}`);
  return { revenue: n(row?.revenue), paid: n(row?.paid), all: n(row?.all) };
}

/** Daily totals bucketed by day (up to a month), week (up to six months) or 30 days. */
async function series(p: Period): Promise<SeriesPoint[]> {
  const rows = await db.execute<{ day: string; revenue: number; orders: number }>(sql`
    select ${LAGOS_DAY(sql`o.created_at`)}::text as day, sum(o.total)::float8 as revenue, count(*)::int as orders
    from orders o where o.status <> 'cancelled' and ${ordersIn(p)}
    group by 1`);
  const days = daysBetween(p.from, p.to);
  const bucket = days <= 31 ? 1 : days <= 180 ? 7 : 30;
  const points: SeriesPoint[] = [];
  for (let i = 0; i < days; i += bucket) {
    const label = format(parseISO(addDays(p.from, i)), bucket === 30 ? 'MMM' : 'd MMM');
    points.push({ label, revenue: 0, orders: 0 });
  }
  for (const r of rows) {
    const point = points[Math.min(points.length - 1, Math.floor((daysBetween(p.from, r.day) - 1) / bucket))];
    if (point) {
      point.revenue += n(r.revenue);
      point.orders += n(r.orders);
    }
  }
  return points;
}

async function salesByDivision(p: Period): Promise<DivisionSlice[]> {
  const rows = await db.execute<{ division: 'hairs' | 'tools'; value: number }>(sql`
    select i.division, sum(i.unit_price * i.quantity)::float8 as value
    from order_items i join orders o on o.id = i.order_id
    where o.status <> 'cancelled' and ${ordersIn(p)}
    group by i.division`);
  const value = (d: string) => n(rows.find((r) => r.division === d)?.value);
  return [
    { name: 'LUXICHIC Hairs', value: value('hairs'), color: '#0A0A0A' },
    { name: 'Hair Tools & Essentials', value: value('tools'), color: '#F0288C' },
  ];
}

async function topProducts(p: Period, limit: number): Promise<ProductSales[]> {
  const rows = await db.execute<{
    id: string | null;
    name: string;
    image: string | null;
    qty: number;
    revenue: number;
  }>(sql`
    select i.product_id::text as id, max(i.product_name) as name, max(i.image_url) as image,
           sum(i.quantity)::int as qty, sum(i.unit_price * i.quantity)::float8 as revenue
    from order_items i join orders o on o.id = i.order_id
    where o.status <> 'cancelled' and ${ordersIn(p)}
    group by i.product_id, case when i.product_id is null then i.product_name end
    order by revenue desc limit ${limit}`);
  return rows.map((r) => ({
    productId: r.id,
    name: r.name,
    image: r.image ?? '',
    qty: n(r.qty),
    revenue: n(r.revenue),
  }));
}

/** Who may see what: the dashboard needs `dashboard.view`, the analytics page `analytics.view`. */
async function allowed(permission: 'dashboard.view' | 'analytics.view') {
  const admin = await getAdmin();
  return !!admin && hasPermission(admin, permission);
}

export async function dashboardFor(period: Period): Promise<DashboardData | null> {
  if (!(await allowed('dashboard.view'))) return null;
  const { today } = lagosNow();
  const prev = previous(period);
  const cur = await orderTotals(period);
  const before = await orderTotals(prev);

  const [o] = await db.execute<Record<string, number>>(sql`
    select count(*) filter (where o.status = 'pending')::int as pending,
           count(*) filter (where o.status = 'pending' and p.status = 'pending_verification')::int as awaiting,
           coalesce(sum(o.total) filter (where o.status = 'pending' and p.status = 'pending_verification'), 0)::float8 as awaiting_total,
           count(*) filter (where o.status in ('confirmed', 'processing', 'shipped', 'delivered'))::int as confirmed,
           coalesce(sum(o.total) filter (where o.status in ('confirmed', 'processing', 'shipped', 'delivered')), 0)::float8 as confirmed_revenue
    from orders o left join payments p on p.order_id = o.id`);

  const lowRows = await db.execute<{
    id: string;
    name: string;
    image: string | null;
    stock: number;
    total: number;
  }>(sql`
    select pr.id, pr.name, inv.stock,
           (select url from product_images pi where pi.product_id = pr.id order by pi.sort_order limit 1) as image,
           count(*) over ()::int as total
    from products pr join inventory inv on inv.product_id = pr.id
    where pr.status <> 'archived' and inv.track_inventory and inv.stock <= inv.low_stock_threshold
    order by inv.stock, pr.name limit 6`);

  const [pr] = await db.execute<Record<string, number>>(sql`
    select count(*) filter (where pr.status = 'published')::int as published,
           count(*) filter (where pr.status = 'archived')::int as archived,
           count(*) filter (where pr.status <> 'archived' and inv.track_inventory and inv.stock <= 0)::int as sold_out
    from products pr left join inventory inv on inv.product_id = pr.id`);

  const [cu] = await db.execute<Record<string, number>>(sql`
    select count(*)::int as total, count(*) filter (where status = 'blocked')::int as blocked,
           count(*) filter (where ${inPeriod(sql`created_at`, period)})::int as new
    from profiles`);

  const todays = await db.execute<{
    reference: string;
    time: string;
    service_name: string;
    customer_name: string;
    specialist_name: string | null;
    status: string;
  }>(sql`
    select reference, to_char(time, 'HH24:MI') as time, service_name, customer_name, specialist_name, status::text
    from appointments where date = ${today}::date and status not in ('rejected', 'cancelled')
    order by time`);

  const byStatus = await db.execute<{ status: string; count: number }>(sql`
    select status::text, count(*)::int as count from appointments group by status`);
  const [ap] = await db.execute<Record<string, number>>(sql`
    select count(*) filter (where date > ${today}::date and status in ('pending', 'confirmed', 'rescheduled'))::int as upcoming
    from appointments`);
  const services = await db.execute<{ name: string; count: number }>(sql`
    select service_name as name, count(*)::int as count from appointments
    group by service_name order by count desc, service_name limit 5`);
  const count = (st: string) => n(byStatus.find((r) => r.status === st)?.count);

  return {
    period,
    revenue: cur.revenue,
    revenueChange: pctChange(cur.revenue, before.revenue),
    orderCount: cur.paid,
    ordersChange: pctChange(cur.paid, before.paid),
    series: await series(period),
    division: await salesByDivision(period),
    top: await topProducts(period, 5),
    awaiting: { count: n(o?.awaiting), total: n(o?.awaiting_total) },
    confirmed: { count: n(o?.confirmed), revenue: n(o?.confirmed_revenue) },
    pendingOrders: n(o?.pending),
    lowStock: {
      count: n(lowRows[0]?.total),
      items: lowRows.map((r) => ({ id: r.id, name: r.name, image: r.image ?? '', stock: n(r.stock) })),
    },
    todayAppointments: todays.map((a) => ({
      reference: a.reference,
      time: a.time,
      serviceName: a.service_name,
      customerName: a.customer_name,
      specialistName: a.specialist_name,
      status: title(a.status),
    })),
    pendingAppointments: count('pending'),
    upcomingAppointments: n(ap?.upcoming),
    completedAppointments: count('completed'),
    appointmentsByStatus: ['pending', 'confirmed', 'rescheduled', 'completed', 'rejected', 'cancelled'].map((st) => ({
      status: title(st),
      count: count(st),
    })),
    topServices: services.map((r) => [r.name, n(r.count)]),
    customers: { total: n(cu?.total), blocked: n(cu?.blocked), new: n(cu?.new) },
    products: { published: n(pr?.published), archived: n(pr?.archived), soldOut: n(pr?.sold_out) },
  };
}

export async function analyticsFor(period: Period): Promise<AnalyticsData | null> {
  if (!(await allowed('analytics.view'))) return null;
  const prev = previous(period);
  const cur = await orderTotals(period);
  const before = await orderTotals(prev);
  const aov = cur.paid ? Math.round(cur.revenue / cur.paid) : 0;
  const aovPrev = before.paid ? Math.round(before.revenue / before.paid) : 0;

  const [x] = await db.execute<Record<string, number>>(sql`
    select (select count(*) from appointments where ${inPeriod(sql`created_at`, period)})::int as appts,
           (select count(*) from appointments where ${inPeriod(sql`created_at`, prev)})::int as appts_prev,
           (select count(*) from profiles where ${inPeriod(sql`created_at`, period)})::int as signups,
           (select count(*) from profiles where ${inPeriod(sql`created_at`, prev)})::int as signups_prev`);

  const statusRows = await db.execute<{ status: string; count: number; bank: number; pod: number }>(sql`
    select o.status::text as status, count(*)::int as count,
           count(*) filter (where o.payment_method = 'bank_transfer')::int as bank,
           count(*) filter (where o.payment_method = 'pay_on_delivery')::int as pod
    from orders o where ${ordersIn(period)} group by o.status`);
  const states = await db.execute<{ state: string; total: number }>(sql`
    select o.ship_state as state, sum(o.total)::float8 as total
    from orders o where o.status <> 'cancelled' and ${ordersIn(period)}
    group by o.ship_state order by total desc limit 6`);
  const services = await db.execute<{ name: string; count: number }>(sql`
    select service_name as name, count(*)::int as count from appointments
    where ${inPeriod(sql`created_at`, period)}
    group by service_name order by count desc, service_name`);

  const sum = (k: 'bank' | 'pod') => statusRows.reduce((t, r) => t + n(r[k]), 0);
  return {
    period,
    kpis: [
      { label: 'Revenue', value: formatNaira(cur.revenue), change: pctChange(cur.revenue, before.revenue) },
      { label: 'Orders', value: String(cur.all), change: pctChange(cur.all, before.all) },
      { label: 'Average order', value: aov ? formatNaira(aov) : '—', change: pctChange(aov, aovPrev) },
      { label: 'Appointments', value: String(n(x?.appts)), change: pctChange(n(x?.appts), n(x?.appts_prev)) },
      { label: 'New accounts', value: String(n(x?.signups)), change: pctChange(n(x?.signups), n(x?.signups_prev)) },
    ],
    series: await series(period),
    division: await salesByDivision(period),
    top: await topProducts(period, 8),
    methods: [
      { name: 'Bank transfer', value: sum('bank'), color: '#0A0A0A' },
      { name: 'Pay on Delivery', value: sum('pod'), color: '#F0288C' },
    ],
    byService: services.map((r) => [r.name, n(r.count)]),
    states: states.map((r) => [r.state, n(r.total)]),
    statuses: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => ({
      s: title(st),
      n: n(statusRows.find((r) => r.status === st)?.count),
    })),
  };
}

/** Sidebar badge counts and the topbar's latest notifications for this admin, read by the admin layout. */
export async function loadBadges(admin: AdminUser): Promise<AdminBadges> {
  const scope = bookingScope(admin);
  const [c] = await db.execute<Record<string, number>>(sql`
    select (select count(*) from orders where status = 'pending')::int as pending_orders,
           (select count(*) from appointments where status = 'pending'
              and (${scope}::uuid is null or specialist_id = ${scope}::uuid))::int as pending_appointments,
           (select count(*) from products pr join inventory inv on inv.product_id = pr.id
             where pr.status <> 'archived' and inv.track_inventory and inv.stock <= inv.low_stock_threshold)::int as low_stock,
           (select count(*) from reviews where status = 'hidden')::int as hidden_reviews`);
  return {
    counts: {
      pendingOrders: n(c?.pending_orders),
      pendingAppointments: n(c?.pending_appointments),
      lowStock: n(c?.low_stock),
      unread: await unreadCountFor(admin),
      hiddenReviews: n(c?.hidden_reviews),
    },
    notifications: await notificationsFor(admin, 8),
  };
}
