'use server';

import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { formatNaira } from '@/lib/utils/currency';

export interface AdminSearchHit {
  group: 'Orders' | 'Customers' | 'Products' | 'Appointments' | 'Reviews' | 'Specialists';
  title: string;
  meta: string;
  to: string;
}

const title = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

/**
 * The admin ⌘K search: orders, customers, products, appointments, reviews and specialists, each only when the
 * admin may see that section. Matches anywhere in the name, email, phone, reference or SKU (case-insensitive).
 */
export async function adminSearch(query: string): Promise<AdminSearchHit[]> {
  const admin = await getAdmin();
  const q = String(query ?? '')
    .trim()
    .slice(0, 80);
  if (!admin || q.length < 2) return [];
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(admin, p);
  const hits: AdminSearchHit[] = [];

  if (can('orders.view')) {
    const rows = await db.execute<{
      order_number: string;
      reference: string;
      name: string;
      total: number;
      status: string;
    }>(sql`
      select order_number, transaction_reference as reference, customer_name as name, total, status::text
      from orders
      where order_number ilike ${like} or transaction_reference ilike ${like} or customer_name ilike ${like}
         or customer_email ilike ${like} or customer_phone ilike ${like}
      order by created_at desc limit 5`);
    for (const o of rows) {
      hits.push({
        group: 'Orders',
        title: `${o.order_number} · ${o.name}`,
        meta: `Ref ${o.reference} · ${formatNaira(Number(o.total))} · ${title(o.status)}`,
        to: `/admin/orders/${o.order_number}`,
      });
    }
  }
  if (can('customers.view')) {
    const rows = await db.execute<{ id: string; name: string; email: string; phone: string | null }>(sql`
      select id, full_name as name, email, phone from profiles
      where full_name ilike ${like} or email ilike ${like} or phone ilike ${like}
      order by created_at desc limit 5`);
    for (const u of rows) {
      hits.push({
        group: 'Customers',
        title: u.name || u.email,
        meta: [u.email, u.phone].filter(Boolean).join(' · '),
        to: `/admin/customers/${u.id}`,
      });
    }
  }
  if (can('products.view')) {
    const rows = await db.execute<{
      id: string;
      name: string;
      sku: string | null;
      price: number;
      stock: number | null;
    }>(
      sql`
      select p.id, p.name, p.sku, p.price, i.stock from products p left join inventory i on i.product_id = p.id
      where p.name ilike ${like} or p.sku ilike ${like} or p.slug ilike ${like}
      order by p.name limit 5`,
    );
    for (const p of rows) {
      hits.push({
        group: 'Products',
        title: p.name,
        meta: [p.sku, formatNaira(Number(p.price)), p.stock === null ? null : `${p.stock} in stock`]
          .filter(Boolean)
          .join(' · '),
        to: `/admin/products/${p.id}`,
      });
    }
  }
  if (can('appointments.view')) {
    const rows = await db.execute<{
      reference: string;
      service: string;
      name: string;
      date: string;
      time: string;
      status: string;
    }>(sql`
      select reference, service_name as service, customer_name as name, date::text, to_char(time, 'HH24:MI') as time,
             status::text
      from appointments
      where reference ilike ${like} or customer_name ilike ${like} or customer_email ilike ${like}
         or customer_phone ilike ${like} or service_name ilike ${like}
      order by date desc, time desc limit 5`);
    for (const a of rows) {
      hits.push({
        group: 'Appointments',
        title: `${a.reference} · ${a.service}`,
        meta: `${a.name} · ${a.date} ${a.time} · ${title(a.status)}`,
        to: `/admin/appointments?ref=${a.reference}`,
      });
    }
  }
  if (can('reviews.view')) {
    const rows = await db.execute<{ title: string; author: string; rating: number }>(sql`
      select title, author_name as author, rating from reviews
      where title ilike ${like} or body ilike ${like} or author_name ilike ${like}
      order by created_at desc limit 3`);
    for (const r of rows) {
      hits.push({
        group: 'Reviews',
        title: r.title,
        meta: `${r.author} · ${r.rating}★`,
        to: `/admin/reviews?q=${encodeURIComponent(r.title)}`,
      });
    }
  }
  if (can('salon.specialists')) {
    const rows = await db.execute<{ name: string; title: string }>(sql`
      select name, title from specialists
      where name ilike ${like} or title ilike ${like} or array_to_string(specialties, ' ') ilike ${like}
      order by name limit 3`);
    for (const s of rows)
      hits.push({ group: 'Specialists', title: s.name, meta: s.title, to: '/admin/salon/specialists' });
  }
  return hits;
}
