'use client';

import React, { createContext, useContext } from 'react';
import type { Address, Customer, Order, OrderItem, PaymentMethod, TimelineEntry } from '@/types/order';
import type { Appointment } from '@/types/salon';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { seedAppointments, seedOrders } from '@/data/seed';
import { generatedAppointments, generatedOrders } from '@/data/adminSeed';
import { businessConfig } from '@/data/config';
import {
  generateAppointmentReference,
  generateOrderNumber,
  generateToken,
  generateTransactionReference,
} from '@/lib/utils/references';
import { formatNaira } from '@/lib/utils/currency';
import { wait } from '@/lib/utils/validation';
import { pushNotification, updateDb } from '@/lib/mock-db/db';

export interface PlaceOrderInput {
  customer: Customer;
  address: Address;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  paymentMethod: PaymentMethod;
  accountEmail?: string;
  /** Pre-issued transaction reference shown to the customer before placing. */
  reference?: string;
}

interface OrdersContextValue {
  /** False until stored orders and appointments have loaded on the client. */
  ready: boolean;
  orders: Order[];
  appointments: Appointment[];
  placeOrder: (input: PlaceOrderInput) => Promise<Order>;
  getOrder: (orderNumber: string) => Order | undefined;
  lookupOrder: (orderNumber: string, email: string) => Order | undefined;
  ordersForAccount: (email: string) => Order[];
  simulateConfirmation: (orderNumber: string) => Order | undefined;
  findOrderByToken: (token: string) => Order | undefined;
  linkGuestRecords: (email: string) => void;
  bookAppointment: (input: Omit<Appointment, 'reference' | 'status' | 'createdAt'>) => Promise<Appointment>;
  getAppointment: (reference: string) => Appointment | undefined;
  appointmentsForAccount: (email: string) => Appointment[];
  /* admin operations (prototype; authorise server-side in production) */
  updateOrder: (orderNumber: string, fn: (o: Order) => Order) => void;
  deleteOrder: (orderNumber: string) => void;
  updateAppointment: (reference: string, fn: (a: Appointment) => Appointment) => void;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

const same = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export function issueAccountToken() {
  return {
    token: generateToken(),
    expiresAt: new Date(Date.now() + businessConfig.accountLinkExpiryHours * 3600 * 1000).toISOString(),
  };
}

/** Marks an order paid/confirmed — shared by the customer simulation and the admin. */
export function confirmOrder(o: Order, by?: string): Order {
  const now = new Date().toISOString();
  return {
    ...o,
    status: 'Confirmed',
    paymentStatus: o.paymentMethod === 'bank_transfer' ? 'Payment Confirmed' : o.paymentStatus,
    timeline: o.timeline.map((t) => (t.step === 'Payment Confirmed' && !t.at ? { ...t, at: now } : t)),
    accountToken: o.accountEmail ? undefined : (o.accountToken ?? issueAccountToken()),
    confirmedBy: by ?? o.confirmedBy,
  };
}

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders, ordersLoaded] = useLocalStorage<Order[]>('lx_orders_v2', () => [
    ...seedOrders,
    ...generatedOrders,
  ]);
  const [appointments, setAppointments, appointmentsLoaded] = useLocalStorage<Appointment[]>(
    'lx_appointments_v2',
    () => [...seedAppointments, ...generatedAppointments],
  );

  const placeOrder = async (input: PlaceOrderInput) => {
    await wait(1200);
    const now = new Date().toISOString();
    const isTransfer = input.paymentMethod === 'bank_transfer';
    const timeline: TimelineEntry[] = isTransfer
      ? [
          { step: 'Order Placed', at: now },
          { step: 'Awaiting Payment', at: now },
          { step: 'Payment Confirmed', at: null },
          { step: 'Processing', at: null },
          { step: 'Shipped', at: null },
          { step: 'Delivered', at: null },
        ]
      : [
          { step: 'Order Placed', at: now },
          { step: 'Processing', at: null },
          { step: 'Shipped', at: null },
          { step: 'Delivered', at: null },
        ];

    const order: Order = {
      orderNumber: generateOrderNumber(orders.map((o) => o.orderNumber)),
      reference:
        input.reference && !orders.some((o) => o.reference === input.reference)
          ? input.reference
          : generateTransactionReference(orders.map((o) => o.reference)),
      createdAt: now,
      customer: input.customer,
      address: input.address,
      items: input.items,
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee,
      discount: input.discount,
      total: input.subtotal + input.deliveryFee - input.discount,
      paymentMethod: input.paymentMethod,
      paymentStatus: isTransfer ? 'Pending Verification' : 'Pay on Delivery',
      status: 'Pending',
      timeline,
      accountEmail: input.accountEmail,
    };
    setOrders((prev) => [order, ...prev]);

    // Shared data layer: reserve stock and alert the admin (the backend will do this in production).
    updateDb((d) => {
      input.items.forEach((item) => {
        const p = d.products.find((x) => x.id === item.productId);
        if (!p) return;
        p.stock = Math.max(0, p.stock - item.quantity);
        p.salesCount += item.quantity;
        p.variants.forEach((g) => {
          const v = g.values.find((x) => x.label === item.variants[g.name]);
          if (v && v.stock !== undefined) v.stock = Math.max(0, v.stock - item.quantity);
        });
        if (p.trackInventory && p.stock <= p.lowStockThreshold) {
          pushNotification(d, {
            kind: 'stock',
            title: 'Low stock',
            body: `${p.name} has ${p.stock} unit${p.stock === 1 ? '' : 's'} left.`,
            link: `/admin/inventory?q=${encodeURIComponent(p.name)}`,
          });
        }
      });
      pushNotification(d, {
        kind: isTransfer ? 'payment' : 'order',
        title: isTransfer ? 'Payment awaiting verification' : 'New order',
        body: `${order.orderNumber} · ${formatNaira(order.total)} · ${order.customer.fullName}`,
        link: `/admin/orders/${order.orderNumber}`,
      });
    });
    return order;
  };

  const getOrder = (orderNumber: string) => orders.find((o) => o.orderNumber === orderNumber);

  const lookupOrder = (orderNumber: string, email: string) =>
    orders.find(
      (o) => o.orderNumber.toUpperCase() === orderNumber.trim().toUpperCase() && same(o.customer.email, email),
    );

  const ordersForAccount = (email: string) => orders.filter((o) => same(o.accountEmail, email));

  /** PROTOTYPE ONLY — mirrors the admin "Confirm Payment" action for customer-side demos. */
  const simulateConfirmation = (orderNumber: string) => {
    const o = orders.find((x) => x.orderNumber === orderNumber);
    if (!o) return undefined;
    const updated = confirmOrder(o);
    setOrders((prev) => prev.map((x) => (x.orderNumber === orderNumber ? updated : x)));
    return updated;
  };

  const findOrderByToken = (token: string) => orders.find((o) => o.accountToken?.token === token);

  /** Attaches every guest order and appointment made with this email to the new account. */
  const linkGuestRecords = (email: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        same(o.customer.email, email) && !o.accountEmail ? { ...o, accountEmail: email, accountToken: undefined } : o,
      ),
    );
    setAppointments((prev) =>
      prev.map((a) => (same(a.customer.email, email) && !a.accountEmail ? { ...a, accountEmail: email } : a)),
    );
  };

  const bookAppointment: OrdersContextValue['bookAppointment'] = async (input) => {
    await wait(1100);
    const now = new Date().toISOString();
    const appt: Appointment = {
      ...input,
      reference: generateAppointmentReference(appointments.map((a) => a.reference)),
      status: 'Pending',
      createdAt: now,
      history: [{ at: now, label: 'Appointment requested' }],
    };
    setAppointments((prev) => [appt, ...prev]);
    updateDb((d) =>
      pushNotification(d, {
        kind: 'appointment',
        title: 'New appointment request',
        body: `${appt.serviceName} · ${appt.date} ${appt.time} · ${appt.customer.fullName}`,
        link: `/admin/appointments?ref=${appt.reference}`,
      }),
    );
    return appt;
  };

  return (
    <OrdersContext.Provider
      value={{
        ready: ordersLoaded && appointmentsLoaded,
        orders,
        appointments,
        placeOrder,
        getOrder,
        lookupOrder,
        ordersForAccount,
        simulateConfirmation,
        findOrderByToken,
        linkGuestRecords,
        bookAppointment,
        getAppointment: (ref) => appointments.find((a) => a.reference === ref),
        appointmentsForAccount: (email) => appointments.filter((a) => same(a.accountEmail, email)),
        updateOrder: (num, fn) => setOrders((prev) => prev.map((o) => (o.orderNumber === num ? fn(o) : o))),
        deleteOrder: (num) => setOrders((prev) => prev.filter((o) => o.orderNumber !== num)),
        updateAppointment: (ref, fn) => setAppointments((prev) => prev.map((a) => (a.reference === ref ? fn(a) : a))),
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used within OrdersProvider');
  return ctx;
}
