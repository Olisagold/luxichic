import 'server-only';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { getAdmin, hasPermission, toAddress } from '@/lib/auth/session';
import { loadOrders } from '@/lib/orders/queries';
import { reviewsForAdmin } from '@/lib/reviews/queries';
import { loadAppointments } from '@/lib/salon/queries';
import type { AdminCustomers } from '@/components/admin/AdminCustomersProvider';
import type { User } from '@/types/user';

const EMPTY: AdminCustomers = { users: [], orders: [], appointments: [], reviews: [] };

/** Every registered customer with their saved addresses, newest first. */
async function listCustomers(): Promise<User[]> {
  const profiles = await db.select().from(s.profiles).orderBy(desc(s.profiles.createdAt));
  const addresses = await db
    .select()
    .from(s.addresses)
    .orderBy(desc(s.addresses.isDefault), asc(s.addresses.createdAt));
  return profiles.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    email: p.email,
    phone: p.phone ?? '',
    addresses: addresses.filter((a) => a.userId === p.id).map(toAddress),
    createdAt: p.createdAt.toISOString(),
    status: p.status,
    lastActiveAt: p.lastActiveAt?.toISOString(),
    pendingSetup: p.pendingSetup,
  }));
}

/**
 * Data for the admin customer pages, or nothing when the admin lacks `customers.view` (the page explains).
 * `notesFor` adds the internal notes about one registered customer.
 */
export async function customersFor(options: { reviews?: boolean; notesFor?: string } = {}): Promise<AdminCustomers> {
  const admin = await getAdmin();
  if (!admin || !hasPermission(admin, 'customers.view')) return EMPTY;
  const data: AdminCustomers = {
    users: await listCustomers(),
    orders: await loadOrders(undefined),
    appointments: await loadAppointments(undefined),
    reviews: options.reviews ? await reviewsForAdmin() : [],
  };
  if (options.notesFor && /^[0-9a-f-]{36}$/.test(options.notesFor)) {
    const notes = await db
      .select({ id: s.adminNotes.id, body: s.adminNotes.body, at: s.adminNotes.createdAt, by: s.admins.fullName })
      .from(s.adminNotes)
      .leftJoin(s.admins, eq(s.admins.id, s.adminNotes.adminId))
      .where(sql`${s.adminNotes.subject} = 'customer' and ${s.adminNotes.subjectId} = ${options.notesFor}`)
      .orderBy(desc(s.adminNotes.createdAt));
    data.notes = notes.map((n) => ({ id: n.id, text: n.body, by: n.by ?? 'Former admin', at: n.at.toISOString() }));
  }
  return data;
}
