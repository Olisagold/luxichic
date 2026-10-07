import type { Order } from '@/types/order';
import type { Appointment } from '@/types/salon';
import type { User } from '@/types/user';

export interface CustomerRow {
  /** User id for registered customers, `guest-<email>` for guests. */
  id: string;
  fullName: string;
  email: string;
  phone: string;
  registered: boolean;
  status: 'active' | 'blocked' | 'guest';
  joinedAt: string;
  orders: number;
  spent: number;
  appointments: number;
  lastActivity: string | null;
  user?: User;
}

const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** Combines registered accounts with guest buyers/bookers (grouped by email). */
export function buildCustomerRows(users: User[], orders: Order[], appointments: Appointment[]): CustomerRow[] {
  const rows: CustomerRow[] = users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    registered: true,
    status: u.status === 'blocked' ? 'blocked' : 'active',
    joinedAt: u.createdAt,
    orders: 0,
    spent: 0,
    appointments: 0,
    lastActivity: u.lastActiveAt ?? null,
    user: u,
  }));
  const byEmail = new Map(rows.map((r) => [r.email.toLowerCase(), r]));

  const touch = (email: string, name: string, phone: string, at: string) => {
    const key = email.toLowerCase();
    let row = byEmail.get(key);
    if (!row) {
      row = {
        id: `guest-${key}`,
        fullName: name,
        email,
        phone,
        registered: false,
        status: 'guest',
        joinedAt: at,
        orders: 0,
        spent: 0,
        appointments: 0,
        lastActivity: null,
      };
      byEmail.set(key, row);
      rows.push(row);
    }
    if (!row.registered && at < row.joinedAt) row.joinedAt = at;
    if (!row.lastActivity || at > row.lastActivity) row.lastActivity = at;
    return row;
  };

  orders.forEach((o) => {
    const r = touch(o.customer.email, o.customer.fullName, o.customer.phone, o.createdAt);
    r.orders += 1;
    if (o.status !== 'Cancelled') r.spent += o.total;
  });
  appointments.forEach((a) => {
    const r = touch(a.customer.email, a.customer.fullName, a.customer.phone, a.createdAt);
    r.appointments += 1;
  });
  return rows;
}

export function customerOrders(email: string, orders: Order[]) {
  return orders
    .filter((o) => same(o.customer.email, email) || same(o.accountEmail, email))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function customerAppointments(email: string, appointments: Appointment[]) {
  return appointments
    .filter((a) => same(a.customer.email, email) || same(a.accountEmail, email))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
