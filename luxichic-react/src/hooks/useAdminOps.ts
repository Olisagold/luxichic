import type { Order, OrderStatus, TimelineStep } from '../types/order';
import type { Appointment } from '../types/salon';
import type { User } from '../types/user';
import type { ActivitySection } from '../types/admin';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { confirmOrder, issueAccountToken, useOrders } from '../contexts/OrdersContext';
import { useAuth } from '../contexts/AuthContext';
import { useReviews } from '../contexts/ReviewsContext';
import { logActivity, updateDb } from '../services/db';
import { formatNaira } from '../utils/currency';

/**
 * Admin operations over orders, appointments, customers and reviews.
 * Each call updates the shared data and writes an audit entry.
 * In production each becomes an authenticated API request; the server
 * re-checks permissions, sends the email/WhatsApp notification and records the audit log.
 */
export function useAdminOps() {
  const { admin, can } = useAdminAuth();
  const orders = useOrders();
  const auth = useAuth();
  const reviews = useReviews();

  const log = (section: ActivitySection, action: string, target?: string, link?: string) => {
    if (!admin) return;
    updateDb((d) => logActivity(d, admin, section, action, target, link));
  };

  const stamp = (o: Order, step: TimelineStep): Order => {
    const now = new Date().toISOString();
    const has = o.timeline.some((t) => t.step === step);
    return {
      ...o,
      timeline: has ? o.timeline.map((t) => t.step === step && !t.at ? { ...t, at: now } : t) : [...o.timeline, { step, at: now }]
    };
  };

  /* ------------------------------ Orders ------------------------------ */

  const confirmPayment = (orderNumber: string) => {
    if (!admin || !can('orders.confirmPayment')) return false;
    const o = orders.getOrder(orderNumber);
    if (!o) return false;
    orders.updateOrder(orderNumber, (x) => confirmOrder(x, admin.fullName));
    log('Orders', 'Confirmed payment', `${orderNumber} · ${formatNaira(o.total)}`, `/admin/orders/${orderNumber}`);
    return true;
  };

  const setOrderStatus = (orderNumber: string, status: OrderStatus, reason?: string) => {
    if (!admin || !can('orders.edit')) return false;
    orders.updateOrder(orderNumber, (o) => {
      let next: Order = { ...o, status };
      if (status === 'Confirmed') {
        next = { ...next, accountToken: o.accountEmail ? undefined : o.accountToken ?? issueAccountToken() };
      }
      if (status === 'Processing') next = stamp(next, 'Processing');
      if (status === 'Shipped') next = stamp(stamp(next, 'Processing'), 'Shipped');
      if (status === 'Delivered') {
        next = stamp(stamp(stamp(next, 'Processing'), 'Shipped'), 'Delivered');
        if (o.paymentMethod === 'pay_on_delivery') next.paymentStatus = 'Paid';
      }
      if (status === 'Cancelled') next = { ...stamp(next, 'Cancelled'), cancelReason: reason };
      return next;
    });
    log('Orders', `Marked as ${status.toLowerCase()}`, `${orderNumber}${reason ? ` · ${reason}` : ''}`, `/admin/orders/${orderNumber}`);
    return true;
  };

  const deleteOrder = (orderNumber: string) => {
    if (!admin || !can('orders.delete')) return false;
    orders.deleteOrder(orderNumber);
    log('Orders', 'Deleted order', orderNumber);
    return true;
  };

  /* --------------------------- Appointments --------------------------- */

  const event = (a: Appointment, label: string, note?: string): Appointment => ({
    ...a,
    history: [...(a.history ?? []), { at: new Date().toISOString(), label, by: admin?.fullName, note }]
  });

  const confirmAppointment = (ref: string) => {
    if (!admin || !can('appointments.confirm')) return false;
    orders.updateAppointment(ref, (a) => event({ ...a, status: 'Confirmed' }, 'Confirmed'));
    log('Appointments', 'Confirmed appointment', ref, `/admin/appointments?ref=${ref}`);
    return true;
  };

  const completeAppointment = (ref: string) => {
    if (!admin || !can('appointments.confirm')) return false;
    orders.updateAppointment(ref, (a) => event({ ...a, status: 'Completed' }, 'Marked completed'));
    log('Appointments', 'Completed appointment', ref);
    return true;
  };

  const rejectAppointment = (ref: string, reason: string) => {
    if (!admin || !can('appointments.reject')) return false;
    orders.updateAppointment(ref, (a) => event({ ...a, status: 'Rejected', reason }, 'Rejected', reason));
    log('Appointments', 'Rejected appointment', `${ref} · ${reason}`);
    return true;
  };

  const rescheduleAppointment = (ref: string, next: {date: string;time: string;personnelId?: string;personnelName?: string;reason: string;}) => {
    if (!admin || !can('appointments.reschedule')) return false;
    orders.updateAppointment(ref, (a) =>
    event(
      {
        ...a,
        status: 'Rescheduled',
        original: a.original ?? { date: a.date, time: a.time, personnelName: a.personnelName },
        date: next.date,
        time: next.time,
        personnelId: next.personnelId ?? a.personnelId,
        personnelName: next.personnelName ?? a.personnelName,
        reason: next.reason
      },
      `Rescheduled to ${next.date} ${next.time}`,
      next.reason
    )
    );
    log('Appointments', 'Rescheduled appointment', `${ref} → ${next.date} ${next.time}`, `/admin/appointments?ref=${ref}`);
    return true;
  };

  const cancelAppointment = (ref: string, reason: string) => {
    if (!admin || !can('appointments.reject')) return false;
    orders.updateAppointment(ref, (a) => event({ ...a, status: 'Cancelled', reason }, 'Cancelled', reason));
    log('Appointments', 'Cancelled appointment', ref);
    return true;
  };

  /* ----------------------------- Customers ---------------------------- */

  const setCustomerBlocked = (u: User, blocked: boolean) => {
    if (!admin || !can('customers.block')) return false;
    auth.adminUpdateCustomer(u.id, { status: blocked ? 'blocked' : 'active' });
    log('Customers', blocked ? 'Blocked customer' : 'Unblocked customer', u.email, `/admin/customers/${u.id}`);
    return true;
  };

  const deleteCustomer = (u: User) => {
    if (!admin || !can('customers.delete')) return false;
    auth.adminDeleteCustomer(u.id);
    log('Customers', 'Deleted customer', u.email);
    return true;
  };

  const updateCustomer = (u: User, patch: Partial<Pick<User, 'fullName' | 'email' | 'phone' | 'status' | 'addresses'>>) => {
    if (!admin || !can('customers.edit')) return false;
    auth.adminUpdateCustomer(u.id, patch);
    log('Customers', 'Edited customer', u.email, `/admin/customers/${u.id}`);
    return true;
  };

  const createCustomer = (data: Parameters<typeof auth.adminCreateCustomer>[0]) => {
    if (!admin || !can('customers.edit')) return { ok: false, error: 'You do not have permission to add customers.' };
    const res = auth.adminCreateCustomer(data);
    if (res.ok) log('Customers', 'Created customer', data.email, '/admin/customers');
    return res;
  };

  /* ------------------------------ Reviews ----------------------------- */

  const setReviewStatus = (id: string, status: 'visible' | 'hidden' | 'archived') => {
    if (!admin || !can('reviews.moderate')) return false;
    reviews.setStatus(id, status);
    log('Reviews', status === 'visible' ? 'Restored review' : status === 'hidden' ? 'Hid review' : 'Archived review', id);
    return true;
  };

  const deleteReview = (id: string, title: string) => {
    if (!admin || !can('reviews.moderate')) return false;
    reviews.deleteReview(id);
    log('Reviews', 'Deleted review', title);
    return true;
  };

  return {
    confirmPayment, setOrderStatus, deleteOrder,
    confirmAppointment, completeAppointment, rejectAppointment, rescheduleAppointment, cancelAppointment,
    setCustomerBlocked, deleteCustomer, updateCustomer, createCustomer,
    setReviewStatus, deleteReview
  };
}