import { useMemo } from 'react';
import type { NavBadge } from '@/data/adminNav';
import { useOrders } from '@/contexts/OrdersContext';
import { useDb } from '@/lib/mock-db/db';
import { stockState } from '@/lib/mock-db/catalog';

/** Live counts for sidebar badges and the dashboard's "Needs attention" panel. */
export function useAdminBadges(): Record<NavBadge, number> & {awaitingAmount: number;} {
  const { orders, appointments } = useOrders();
  const products = useDb((s) => s.products);
  const notifications = useDb((s) => s.notifications);

  return useMemo(() => {
    const awaiting = orders.filter((o) => o.paymentStatus === 'Pending Verification' && o.status === 'Pending');
    return {
      pendingOrders: orders.filter((o) => o.status === 'Pending').length,
      pendingAppointments: appointments.filter((a) => a.status === 'Pending').length,
      lowStock: products.filter((p) => p.status !== 'archived' && stockState(p) !== 'In Stock').length,
      unread: notifications.filter((n) => !n.read).length,
      hiddenReviews: 0,
      awaitingAmount: awaiting.reduce((s, o) => s + o.total, 0)
    };
  }, [orders, appointments, products, notifications]);
}