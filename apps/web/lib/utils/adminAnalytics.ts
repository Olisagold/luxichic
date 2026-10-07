import { addDays, format, startOfDay, subDays } from 'date-fns';
import type { Order } from '@/types/order';

export type RangeKey = 'today' | '7d' | '30d' | '3m' | '6m' | '1y' | 'custom';

export const rangeOptions: { value: RangeKey; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '3m', label: '3 months' },
  { value: '6m', label: '6 months' },
  { value: '1y', label: '1 year' },
  { value: 'custom', label: 'Custom' },
];

const rangeDays: Record<Exclude<RangeKey, 'custom'>, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};

export interface Range {
  from: Date;
  to: Date;
}

export function resolveRange(key: RangeKey, custom?: { from: string; to: string }): Range {
  const to = addDays(startOfDay(new Date()), 1);
  if (key === 'custom' && custom?.from && custom?.to)
    return { from: startOfDay(new Date(custom.from)), to: addDays(startOfDay(new Date(custom.to)), 1) };
  const days = rangeDays[key === 'custom' ? '30d' : key];
  return { from: subDays(to, days), to };
}

export function previousRange(r: Range): Range {
  const span = r.to.getTime() - r.from.getTime();
  return { from: new Date(r.from.getTime() - span), to: r.from };
}

export const inRange = (iso: string, r: Range) => {
  const t = new Date(iso).getTime();
  return t >= r.from.getTime() && t < r.to.getTime();
};

/** Revenue counts orders that aren't cancelled. */
export const countsAsRevenue = (o: Order) => o.status !== 'Cancelled';

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Buckets orders into daily, weekly or monthly points depending on range length. */
export function revenueSeries(orders: Order[], r: Range) {
  const days = Math.round((r.to.getTime() - r.from.getTime()) / 86400000);
  const bucket = days <= 31 ? 1 : days <= 180 ? 7 : 30;
  const points: { label: string; revenue: number; orders: number; start: number }[] = [];
  for (let t = r.from.getTime(); t < r.to.getTime(); t += bucket * 86400000) {
    const d = new Date(t);
    points.push({ label: format(d, bucket === 30 ? 'MMM' : 'd MMM'), revenue: 0, orders: 0, start: t });
  }
  orders
    .filter((o) => countsAsRevenue(o) && inRange(o.createdAt, r))
    .forEach((o) => {
      const idx = Math.min(
        points.length - 1,
        Math.floor((new Date(o.createdAt).getTime() - r.from.getTime()) / (bucket * 86400000)),
      );
      if (points[idx]) {
        points[idx].revenue += o.total;
        points[idx].orders += 1;
      }
    });
  return points;
}

export function salesByDivision(orders: Order[]) {
  const totals = { hairs: 0, tools: 0 };
  orders.filter(countsAsRevenue).forEach((o) =>
    o.items.forEach((i) => {
      totals[i.division] += i.unitPrice * i.quantity;
    }),
  );
  return [
    { name: 'LUXICHIC Hairs', value: totals.hairs, color: '#0A0A0A' },
    { name: 'Hair Tools & Essentials', value: totals.tools, color: '#F0288C' },
  ];
}

export function topProducts(orders: Order[], limit = 5) {
  const map = new Map<string, { name: string; image: string; qty: number; revenue: number; productId: string }>();
  orders.filter(countsAsRevenue).forEach((o) =>
    o.items.forEach((i) => {
      const e = map.get(i.productId) ?? { name: i.name, image: i.image, qty: 0, revenue: 0, productId: i.productId };
      e.qty += i.quantity;
      e.revenue += i.unitPrice * i.quantity;
      map.set(i.productId, e);
    }),
  );
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export const compactNaira = (n: number) =>
  n >= 1_000_000
    ? `₦${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}m`
    : n >= 1000
      ? `₦${Math.round(n / 1000)}k`
      : `₦${n}`;
