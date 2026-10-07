import React from 'react';
import type { Order } from '@/types/order';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { OrderItemsList } from '@/components/checkout/OrderItemsList';
import { OrderTotals } from '@/components/checkout/OrderTotals';
import { BankTransferInstructions } from '@/components/checkout/BankTransferInstructions';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { businessConfig } from '@/data/config';
import { formatDateTime } from '@/lib/utils/dates';
import { orderEnquiryMessage, receiptMessage } from '@/lib/utils/whatsapp';

export const paymentMethodLabel = (m: Order['paymentMethod']) =>
  m === 'bank_transfer' ? 'Bank Transfer' : 'Pay on Delivery';

export function formatAddress(a: Order['address']): string[] {
  return [
    [a.houseNumber, a.street].filter(Boolean).join(', '),
    a.landmark ? `Landmark: ${a.landmark}` : '',
    `${a.city}, ${a.state}, ${a.country}`,
  ].filter(Boolean);
}

export function OrderDetailsView({ order, showPaymentActions = true }: { order: Order; showPaymentActions?: boolean }) {
  const awaitingTransfer =
    order.paymentMethod === 'bank_transfer' &&
    order.paymentStatus === 'Pending Verification' &&
    order.status !== 'Cancelled';

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <section className="rounded-[24px] bg-white p-6" aria-labelledby={`items-${order.orderNumber}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id={`items-${order.orderNumber}`} className="font-display text-3xl text-ink">
                Order {order.orderNumber}
              </h2>
              <p className="mt-1 text-sm text-subtle">Placed {formatDateTime(order.createdAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={order.status} />
              <StatusBadge status={order.paymentStatus} />
            </div>
          </div>
          <div className="mt-4">
            <OrderItemsList items={order.items} />
          </div>
          <div className="mt-2 border-t border-line pt-5">
            <OrderTotals subtotal={order.subtotal} deliveryFee={order.deliveryFee} discount={order.discount} />
          </div>
        </section>

        {showPaymentActions && awaitingTransfer && (
          <section className="rounded-[24px] bg-white p-6" aria-label="Payment instructions">
            <h3 className="font-display text-2xl text-ink">Complete your payment</h3>
            <div className="mt-4">
              <BankTransferInstructions amount={order.total} reference={order.reference} />
            </div>
            <WhatsAppButton
              number={businessConfig.whatsapp.orders}
              message={receiptMessage(order)}
              label="Send Payment Receipt on WhatsApp"
              fullWidth
              className="mt-4"
            />
            <p className="mt-3 text-xs text-subtle">
              Sending your receipt does not confirm your order automatically. We confirm it once your payment has been
              verified.
            </p>
          </section>
        )}

        <section className="rounded-[24px] bg-white p-6" aria-label="Order progress">
          <h3 className="mb-6 font-display text-2xl text-ink">Order progress</h3>
          <OrderTimeline order={order} />
        </section>
      </div>

      <aside className="space-y-6">
        <div className="rounded-[24px] bg-white p-6">
          <p className="text-xs font-semibold text-subtle">Transaction reference</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.18em] text-ink">{order.reference}</p>
          <dl className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-subtle">Payment method</dt>
              <dd className="font-medium text-ink">{paymentMethodLabel(order.paymentMethod)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-subtle">Payment status</dt>
              <dd className="font-medium text-ink">{order.paymentStatus}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-subtle">Order status</dt>
              <dd className="font-medium text-ink">{order.status}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-[24px] bg-white p-6">
          <p className="text-xs font-semibold text-subtle">Delivery address</p>
          <p className="mt-2 text-sm font-semibold text-ink">{order.customer.fullName}</p>
          {formatAddress(order.address).map((l) => (
            <p key={l} className="text-sm text-charcoal">
              {l}
            </p>
          ))}
          <p className="mt-2 text-sm text-subtle">
            {order.customer.phone} · {order.customer.email}
          </p>
          {order.address.instructions && (
            <p className="mt-3 rounded-xl bg-ivory p-3 text-xs text-charcoal">“{order.address.instructions}”</p>
          )}
        </div>
        <WhatsAppButton
          number={businessConfig.whatsapp.orders}
          message={orderEnquiryMessage(order)}
          label="Ask about this order"
          fullWidth
          size="md"
        />
      </aside>
    </div>
  );
}
